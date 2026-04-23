/** Package scan defines the logic for a dictionary scan. */

// NOTE: This package is used in the browser, and also during validation. So we
// allow it to assert correctness, instead of trying to always fail gracefully.
import * as log from './logger.js';
import * as copt from './coptic.js';
import * as browser from './browser.js';
import * as orth from './orth.js';
import * as dev from './dev.js';

// WANT_COLUMNS is the list of the first columns we expect to find in the TSV.
const WANT_COLUMNS = ['page', 'start', 'end'];

// ZOOM_FACTOR controls how fast zooming happens in response to scroll events.
const ZOOM_FACTOR = 0.05;

const MIN_SCALE = 0.2;

// TODO: (#413) Prevent duplicate listeners, e.g. in query memorization and URL
// parameters.
const QUERY = 'query'; // Name of the query parameter.

/**
 * Word represents a word that can be used in the book scan context.
 * TODO: (640) Implement Greek and Arabic word classes, as well as Coptic.
 */
export interface Word {
  /**
   * Lexicographically compare two words.
   * @param other - The word we're comparing to.
   * @returns The truth value of `this <= other`.
   */
  leq(other: Word): boolean;
  /**
   * @returns The string representation of the word.
   */
  get word(): string;
}

/** Entry represents a dictionary page, where each page has a defined range,
 * specified by the so-called *guide words*.
 */
export interface Page {
  start: Word;
  end: Word;
  page: number;
}

/**
 * We often use the notation "${NUM}${COL}" to refer to a given column in a
 * page. For example, "1a" refers to the left column of page 1.
 * chopColumn removes the column from the page, if present, returning the page
 * number.
 *
 * @param page - A page number, potentially containing a column.
 * @returns - The page number without the column.
 */
export function chopColumn(page: string): [string, string] {
  if (['a', 'b'].some((c) => page.endsWith(c))) {
    return [page.slice(0, -1), page.slice(-1)];
  }
  return [page, ''];
}

/**
 *
 * @param page
 * @returns
 */
export function prettyPage(page: string): (Node | string)[] {
  const [num, col]: [string, string] = chopColumn(page);
  const i = document.createElement('i');
  i.textContent = col;
  return [`${num} `, i];
}

const SWAP_TOLERANCE = 10;
/**
 * A dictionary index.
 */
export class Index {
  private pages: Page[];

  /**
   * @param index - The content of the index, in plain TSV format,with the first
   * three column being:
   * 1. Page number
   * 2. Page start word
   * 3. Page end word
   *
   * @param wordType - The type of words in this dictionary. This should be a
   * constructor type that takes as input the string representation of the word,
   * which is retrieved from the index columns.
   */
  public constructor(
    index: string,
    private readonly wordType: new (str: string) => Word
  ) {
    const lines = index.trim().split('\n');
    const header: string[] = Index.toColumns(lines[0]!);
    // Verify that the header has the expected column names.
    log.ensure(
      WANT_COLUMNS.every((col: string, idx: number) => header[idx] === col),
      header.slice(0, WANT_COLUMNS.length),
      'do not match the list of wanted columns',
      WANT_COLUMNS
    );

    this.pages = lines
      .slice(1) // Skip the header.
      .map((row) => {
        const [page, start, end] = Index.toColumns(row);
        return {
          page: parseInt(page!),
          start: new wordType(start!),
          end: new wordType(end!),
        };
      });

    dev.play(this.validate.bind(this));
  }

  /**
   * @param str - String representation of a TSV row.
   * @returns The content of the columns of interest in the given row.
   */
  private static toColumns(str: string): string[] {
    return str
      .split('\t')
      .slice(0, WANT_COLUMNS.length)
      .map((l: string): string => l.trim());
  }

  /**
   * Given a search query, return the dictionary page number.
   * @param query - Search query.
   * @returns - Page number, or undefined if the number can't be inferred from
   * the query.
   */
  public getPage(query: string): number | undefined {
    query = orth.cleanDiacritics(query.toLowerCase().trim());
    if (!query) {
      return undefined;
    }

    const num = parseInt(query);
    if (!isNaN(num)) {
      // This is a page number.
      return num;
    }

    // Check if this is a Coptic word.
    if (!copt.isCoptic(query)) {
      // Neither a number nor a Coptic word! Nothing we can do!
      // TODO: (640) This should support other classes of words as well, not
      // just Coptic words.
      // We should perhaps introduce another class method:
      //   searchable(query: string): boolean
      // and allow different children of this class to override this method,
      // and use that method instead.
      return undefined;
    }

    // Binary search the word in the dictionary.
    const target = new this.wordType(query);
    let left = 0;
    let right = this.pages.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const cur = this.pages[mid]!;
      if (target.leq(cur.end)) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }

    return this.pages[right]!.page;
  }

  /**
   * Perform some validations on the index.
   * Some validations are strict, and would throw an exception if unmet.
   * Other types of errors are expected to be present, and would simply log a
   * warning.
   */
  private validate(): void {
    let swaps = 0;
    for (const [i, cur] of this.pages.entries()) {
      // Verify that the page number was parsed correctly.
      log.ensure(!isNaN(cur.page), 'Invalid page number at position', i);

      // Verify the word order on this page.
      if (!cur.start.leq(cur.end)) {
        swaps++;
        log.warn(
          'words on page',
          cur.page,
          'seem reversed:',
          cur.start.word,
          ',',
          cur.end.word
        );
      }

      const prev: Page | undefined = this.pages[i - 1];
      if (!prev) {
        continue;
      }

      // Verify page number sequence.
      if (cur.page !== prev.page + 1) {
        log.fatal('Non-consecutive page numbers:', `${prev.page}, ${cur.page}`);
      }

      // Verify the word order between this page and the next one.
      if (!prev.end.leq(cur.start)) {
        swaps++;
        log.warn(
          'going from page',
          prev.page,
          'to',
          cur.page,
          'words seem reversed:',
          prev.end.word,
          ',',
          cur.start.word
        );
      }
    }

    if (swaps) {
      log.warn('Swap count:', swaps);
    }
    log.ensure(
      swaps < this.pages.length / SWAP_TOLERANCE,
      'Dictionary of',
      this.pages.length,
      'pages has too many swaps:',
      swaps
    );
  }
}

/**
 * A holder of the HTML elements used to interact with the dictionary.
 */
export class Form {
  /**
   *
   * @param image - <img> element holding the book page.
   * @param nextButton - Button to navigate to the next page when clicked.
   * @param prevButton - Button to navigate to the previous page when clicked.
   * @param resetButton - Button to reset display.
   * @param searchBox - Search box, providing search queries.
   * @param form - Form element.
   */
  public constructor(
    public readonly image: HTMLImageElement,
    public readonly nextButton: HTMLElement,
    public readonly prevButton: HTMLElement,
    public readonly resetButton: HTMLElement,
    public readonly searchBox: HTMLInputElement,
    public readonly form: HTMLElement
  ) {}
}

/**
 * Scroller scrolls through the pages of a book.
 */
export class Scroller {
  private readonly start: number;
  private readonly end: number;
  private currentPage: number;

  /**
   * Construct a scroller.
   *
   * @param start - Integer basename of the first image.
   *
   * @param end - Integer basename of the first image.
   *
   * @param offset - Offset of the first interesting page in the book (skipping
   * the intro and such). It lets logical page numbers (as used in the index
   * and shown to the user) differ from the image basenames.
   * For example: If the pages are numbered 1.jpg to 100.jpg, with 1-20
   * representing the introduction, 21.jpg being the actual page number 1,
   * then the offset is 20. Logical page 1 will then open file 21.jpg.
   *
   * @param ext - File extension.
   *
   * @param form - Input and output elements.
   *
   * @param form.image - <img> element holding the scan. The scroller will
   * update the image source to open new pages.
   *
   * @param form.nextButton - Button to navigate to the next page. The scroller
   * will respond to clicks on this button, and will disable the button if it's
   * not possible to scroll to a next page (if we're already at the very last
   * page).
   *
   * @param form.prevButton - Button to navigate to the previous page. The
   * scroller will respond to clicks on this button, and will disable the button
   * if it's not possible to scroll to a previous page (if we're already at the
   * very first page).
   *
   * @param form.resetButton - Button to reset the display. The scroller will
   * trigger a reset whenever a scroll takes place.
   *
   * @param landingPage - Which page to open on initial load, before any
   * query-driven navigation takes over.
   */
  public constructor(
    start: number,
    end: number,
    private readonly offset = 0,
    private readonly ext: string,
    private readonly form: {
      image: HTMLImageElement;
      nextButton: HTMLElement;
      prevButton: HTMLElement;
      resetButton: HTMLElement;
    },
    private readonly landingPage = 1
  ) {
    this.start = start - this.offset;
    this.end = end - this.offset;
    this.currentPage = landingPage;

    this.addEventListeners();
    this.update(landingPage);
  }

  /**
   * Update the display to the given page number.
   *
   * @param page - Page number to open. This will be modified if it falls
   * outside our page range.
   */
  public update(page: number): void {
    if (isNaN(page)) {
      page = this.landingPage;
    }
    if (page < this.start) {
      page = this.start;
    }
    if (page > this.end) {
      page = this.end;
    }
    this.currentPage = page;
    this.updateDisplay(page);
    this.form.resetButton.click();
  }

  /**
   * Update the image to the given page number.
   *
   * @param page - Page number. The value is NOT verified.
   */
  private updateDisplay(page: number): void {
    const stem: number = page + this.offset;

    this.form.image.src = `${stem.toString()}.${this.ext}`;
    this.form.image.alt = page.toString();

    if (page === this.start) {
      this.form.prevButton.style.display = 'none';
    } else {
      this.form.prevButton.style.display = 'unset';
    }

    if (page === this.end) {
      this.form.nextButton.style.display = 'none';
    } else {
      this.form.nextButton.style.display = 'unset';
    }
  }

  /**
   * Navigate to the next page.
   *
   * NOTE: The next and prev buttons operate purely on in-memory state
   * (`currentPage`) and do not update any URL parameter. As a result, the
   * current page is not reflected in the URL, cannot be deep-linked, and is
   * lost on reload — reloading will restore only the memorized query (if any)
   * and jump back to the page that query resolves to.
   * TODO: (#0) Figure out a way to store the page state in the URL. Restore the
   * `page` parameter?
   */
  private incrementPage(): void {
    this.update(this.currentPage + 1);
  }

  /**
   * Navigate to the previous page.
   *
   * NOTE: See `incrementPage` for the URL-state limitation that also applies
   * here.
   */
  private decrementPage(): void {
    this.update(this.currentPage - 1);
  }

  /**
   * Handle 'keydown' event, if they're deemed relevant to the scroller.
   *
   * @param event - Keyboard event.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'KeyN') {
      this.incrementPage();
    } else if (event.code === 'KeyP') {
      this.decrementPage();
    }
  }

  /**
   * Register the scroller's event listeners.
   */
  private addEventListeners(): void {
    // The next button scrolls to the next page.
    this.form.nextButton.addEventListener(
      'click',
      this.incrementPage.bind(this)
    );

    // The prev button scrolls to the previous page.
    this.form.prevButton.addEventListener(
      'click',
      this.decrementPage.bind(this)
    );

    // Respond to some keyboard shortcuts.
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
}

/**
 * Control position and zoom of an image.
 *
 * NOTE: This class was mostly written by GenAI, and I don't fully understand
 * it!
 */
export class ZoomerDragger {
  private scale = 1;
  private startX = 0;
  private startY = 0;
  private originX = 0;
  private originY = 0;
  private isDragging = false;

  /**
   * @param form
   * @param form.image
   * @param form.resetButton
   */
  public constructor(
    private readonly form: {
      image: HTMLImageElement;
      resetButton: HTMLElement;
    }
  ) {
    this.addEventListeners();
  }

  /**
   * Register event listeners.
   */
  private addEventListeners(): void {
    // Mouse wheel updates the image zoom.
    document.addEventListener('wheel', this.handleZoom.bind(this), {
      passive: false,
    });

    // A mouse click starts dragging the image.
    this.form.image.addEventListener(
      'mousedown',
      this.startDragging.bind(this)
    );

    // Moving the mouse drags the image around.
    document.addEventListener('mousemove', this.dragImage.bind(this));

    // Lifting the mouse click stops dragging.
    document.addEventListener('mouseup', this.stopDragging.bind(this));

    // Clicking the reset button resets the image position.
    this.form.resetButton.addEventListener('click', this.reset.bind(this));

    // Some keyboard events trigger actions.
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Handle the mouse wheel event.
   *
   * @param e - Mouse wheel event.
   */
  private handleZoom(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY < 0) {
      this.scale += ZOOM_FACTOR;
    } else if (e.deltaY > 0 && this.scale > MIN_SCALE) {
      this.scale -= ZOOM_FACTOR;
    }

    this.updateTransform();
  }

  /**
   * Start dragging the image.
   *
   * @param e - Mouse event.
   */
  private startDragging(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.startX = e.clientX - this.originX;
    this.startY = e.clientY - this.originY;
    this.form.image.style.cursor = 'grabbing';
  }

  /**
   * Move the image.
   *
   * @param e - Mouse event.
   */
  private dragImage(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (!this.isDragging) {
      return;
    }

    this.originX = e.clientX - this.startX;
    this.originY = e.clientY - this.startY;

    this.updateTransform();
  }

  /**
   * Stop dragging the image.
   *
   * @param e - Mouse event.
   */
  private stopDragging(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    this.form.image.style.cursor = 'grab';
  }

  /**
   * Reset the image position.
   */
  private reset(): void {
    this.scale = 1;
    this.originX = 0;
    this.originY = 0;
    this.updateTransform();
  }

  /**
   * Update the style transform value.
   */
  private updateTransform(): void {
    this.form.image.style.transform = `scale(${this.scale.toString()}) translate(${this.originX.toString()}px, ${this.originY.toString()}px)`;
  }

  /**
   * Handle a 'keydown' event.
   *
   * @param e - Keyboard event.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyR') {
      this.reset();
    }
  }
}

/**
 * Dictionary represents a searchable dictionary scan.
 */
export class Dictionary {
  /**
   * Construct a Dictionary.
   *
   * @param index - The dictionary index. Given a (well-formed) search query,
   * the index should supply us with the number of the page containing the
   * definition of the word in the query.
   *
   * @param scroller - The scrollers can update the dictionary display given a
   * page number.
   *
   * @param form - The form holds HTML elements used to interact with the
   * dictionary.
   *
   * @param form.searchBox - The search box provides search queries.
   * @param form.form
   */
  public constructor(
    // index stores our dictionary index, and will be used to look up pages.
    private readonly index: Index,
    // scroller will be used to update the scan image for each query.
    private readonly scroller: Scroller,
    private readonly form: { searchBox: HTMLInputElement; form: HTMLElement }
  ) {
    this.addEventListeners();
    // Focus on the search box, to the user can start searching right away.
    this.form.searchBox.focus();
    // Restore a previously memorized query from the URL, if any.
    const query: string | null = browser.getParam(QUERY);
    if (!query) {
      return;
    }
    this.form.searchBox.value = query;
    this.search();
  }

  /**
   * Execute a search for a query.
   */
  private search(): void {
    const query: string = this.form.searchBox.value;
    browser.setParam(QUERY, query);
    const page = this.index.getPage(query);
    if (page === undefined) {
      return;
    }
    this.scroller.update(page);
  }

  /**
   * Register event listeners.
   */
  private addEventListeners(): void {
    // Input in the search box triggers a search.
    this.form.searchBox.addEventListener('input', this.search.bind(this));

    // Prevent form submission.
    this.form.form.addEventListener('submit', browser.preventDefault);

    // The slash key focuses on the search box.
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Slash') {
        this.form.searchBox.focus();
        event.preventDefault();
        event.stopPropagation();
      }
    });

    // Prevent other elements in the page from picking up keyboard events on the
    // search box.
    this.form.searchBox.addEventListener('keyup', browser.stopPropagation);
    this.form.searchBox.addEventListener('keydown', browser.stopPropagation);
    this.form.searchBox.addEventListener('keypress', browser.stopPropagation);
  }
}
