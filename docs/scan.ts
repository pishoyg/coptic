/** Package scan defines the logic for a dictionary scan. */

// NOTE: This package is used in the browser, and also during validation. So we
// allow it to assert correctness, instead of trying to always fail gracefully.
import * as log from './logger.js';
import * as copt from './coptic.js';
import * as orth from './orth.js';
import * as dev from './dev.js';
import * as str from './str.js';

// WANT_COLUMNS is the list of the first columns we expect to find in the TSV.
const WANT_COLUMNS = ['page', 'start', 'end'];

// ZOOM_FACTOR controls how fast zooming happens in response to scroll events.
const ZOOM_FACTOR = 0.05;

const MIN_SCALE = 0.2;

/**
 * IsActive answers whether a scan view is currently the active one on the
 * host page. It is supplied by callers so that this package does not need
 * to know about its host's mode-switching mechanism.
 *
 * Only the `Scroller` consults this, and only for handlers that
 * unavoidably share DOM with sibling scrollers — the next / prev buttons
 * and the document-level N / P keydown. `ZoomerDragger`'s handlers either
 * fire on per-scan elements (image wheel + mousedown) or are intentionally
 * cross-mode (reset button click, R key), so it needs no predicate.
 *
 * Omit on pages that host a single scan: an absent predicate is treated
 * as always active.
 */
export type IsActive = () => boolean;

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
   *
   * @param overrides - Map from a (column-less) query string to its page
   * number. Looked up before the Coptic / numeric fallbacks, so callers can
   * route non-canonical query forms (e.g. Roman-numeral addenda pages like
   * `xv`) to a specific page. Defaults to no overrides.
   */
  public constructor(
    index: string,
    private readonly wordType: new (s: string) => Word,
    private readonly overrides: Record<string, number> = {}
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
   * @param s - String representation of a TSV row.
   * @returns The content of the columns of interest in the given row.
   */
  private static toColumns(s: string): string[] {
    return s
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

    if (query in this.overrides) {
      return this.overrides[query];
    }

    // Check the overrides table first. The column suffix is chopped so that
    // queries like `xva` resolve to the override registered for `xv`.
    const base: string = chopColumn(query)[0];
    if (base in this.overrides) {
      return this.overrides[base];
    }

    // If any Coptic characters are present, extract them all and search
    // the concatenation as a single word. Otherwise fall back to digit
    // extraction to interpret the query as a page number.
    // TODO: (640) Extend to other word classes (Greek, Arabic).
    const coptic: string = Array.from(query).filter(copt.isCoptic).join('');
    if (coptic) {
      return this.binarySearch(new this.wordType(coptic));
    }

    const number: RegExpMatchArray | null = query.match(/-?\d+/g);
    if (number) {
      return parseInt(number[0]);
    }

    return undefined;
  }

  /**
   * Binary search for the first page whose end-word is >= the target.
   *
   * @param target - The word being searched for.
   * @returns The number of the matching page.
   */
  private binarySearch(target: Word): number {
    let left = 0;
    let right = this.pages.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (target.leq(this.pages[mid]!.end)) {
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
 * Form holds the HTML elements used to drive a scan view.
 *
 * The search box and the wrapping <form> are NOT part of this — they're
 * owned by `docs/crum/query.ts`, which dispatches search queries to every
 * registered `Dictionary.search` on every keystroke.
 *
 * `Form` is a behaviorless data holder, so it is exposed as an interface
 * rather than a class — callers construct one with an object literal.
 */
export interface Form {
  /** <img> element holding the book page. */
  image: HTMLImageElement;
  /** Button that navigates to the next page when clicked. */
  nextButton: HTMLElement;
  /** Button that navigates to the previous page when clicked. */
  prevButton: HTMLElement;
  /** Button that resets the display. */
  resetButton: HTMLElement;
}

/**
 * Options used to construct a `Scroller`.
 */
export interface ScrollerOptions {
  /** Integer basename of the first image (inclusive). */
  start: number;
  /** Integer basename of the last image (inclusive). */
  end: number;
  /** File extension (e.g. `'png'`). */
  ext: string;
  /** Input and output elements driven by the scroller. */
  form: Form;
  /**
   * Offset of the first interesting page in the book (skipping the intro
   * and such). It lets logical page numbers (as used in the index and shown
   * to the user) differ from the image basenames.
   *
   * For example: if the pages are numbered 1.jpg to 100.jpg, with 1-20
   * representing the introduction and 21.jpg being the actual page number
   * 1, then the offset is 20. Logical page 1 will open file 21.jpg.
   *
   * Defaults to 0.
   */
  offset?: number;
  /**
   * Which page to open on initial load, before any query-driven navigation
   * takes over. Defaults to 1.
   */
  landingPage?: number;
  /**
   * Path to the directory containing the images. Joined with the page-stem
   * filename when setting `img.src`. Defaults to the empty string, which
   * resolves filenames relative to the current document.
   */
  directory?: string;
  /**
   * Predicate that answers whether this scroller is currently the active
   * scan on the host page. When the host serves multiple scans behind a
   * mode switcher, multiple scrollers may share the same `#prev` / `#next`
   * buttons and the document keyboard listeners — only the active scroller
   * should respond. Omit when the scroller is the only scan on its page.
   *
   * See `IsActive` for the rationale.
   */
  isActive?: IsActive;
}

/**
 * Scroller scrolls through the pages of a book.
 */
export class Scroller {
  private readonly start: number;
  private readonly end: number;
  private readonly offset: number;
  private readonly ext: string;
  private readonly form: Form;
  private readonly landingPage: number;
  private readonly directory: string;
  private readonly isActive: IsActive | undefined;
  private currentPage: number;

  /**
   * Construct a scroller.
   *
   * @param opts - See `ScrollerOptions` for the field-by-field contract.
   */
  public constructor(opts: ScrollerOptions) {
    this.offset = opts.offset ?? 0;
    this.ext = opts.ext;
    this.form = opts.form;
    this.landingPage = opts.landingPage ?? 1;
    this.directory = opts.directory ?? '';
    this.isActive = opts.isActive;

    this.start = opts.start - this.offset;
    this.end = opts.end - this.offset;
    this.currentPage = this.landingPage;

    this.addEventListeners();
    this.update(this.landingPage);
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
  }

  /**
   * Update the image to the given page number.
   *
   * @param page - Page number. The value is NOT verified.
   */
  private updateDisplay(page: number): void {
    const stem: number = page + this.offset;

    this.form.image.src = str.joinPaths(
      this.directory,
      `${stem.toString()}.${this.ext}`
    );
    this.form.image.alt = page.toString();
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
    if (!this.active()) {
      return;
    }
    if (event.code === 'KeyN') {
      this.incrementPage();
    } else if (event.code === 'KeyP') {
      this.decrementPage();
    }
  }

  /**
   * @returns Whether this scroller is currently the active scan on the host
   * page. A scroller with no `isActive` predicate is always active.
   */
  private active(): boolean {
    return this.isActive?.() ?? true;
  }

  /**
   * Register the scroller's event listeners.
   *
   * NOTE: When the host page mounts multiple scrollers (e.g. the combined
   * Crum + Dawoud lexicon), each scroller registers its own document-level
   * `keydown` listener and shares the same `#prev` / `#next` buttons. Every
   * handler below therefore must early-return when `!this.active()`,
   * otherwise inactive scrollers would react to keystrokes and clicks.
   * This is a brittle pattern — every new handler must remember the guard.
   *
   * TODO: (#203) Re-express NEXT / PREV / RESET as custom DOM events
   * dispatched by the host (or by the buttons themselves on the active
   * scan's image). Each scroller would listen on its own image and so be
   * inherently mode-scoped, eliminating the `active()` checks here. The
   * matching plan for search events lives in `docs/crum/query.ts`.
   *
   * TODO: (#0) A complementary cleaner design is for the host to
   * register / unregister the listener set wholesale on mode change.
   */
  private addEventListeners(): void {
    // The next button scrolls to the next page.
    this.form.nextButton.addEventListener('click', () => {
      if (this.active()) {
        this.incrementPage();
      }
    });

    // The prev button scrolls to the previous page.
    this.form.prevButton.addEventListener('click', () => {
      if (this.active()) {
        this.decrementPage();
      }
    });

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
   * @param form - Image + reset-button pair the dragger controls.
   * @param form.image - <img> the dragger zooms and pans.
   * @param form.resetButton - Button that resets the zoom / pan transform.
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
   *
   * Unlike `Scroller`, no mode gating is needed here: the image-scoped
   * listeners (wheel, mousedown) can't fire when the image lives in a
   * `display: none` ancestor; the document-level drag listeners are
   * latched off `this.isDragging`, which can only become true via a
   * mousedown on a visible image; and the cross-mode reset listeners
   * (reset-button click, R key) are deliberately shared — a reset is
   * meant to apply to every scan at once.
   */
  private addEventListeners(): void {
    // Mouse wheel over the image zooms it. The listener is scoped to the
    // image (not the document) so that scrolling outside the image scrolls
    // the page normally.
    this.form.image.addEventListener('wheel', this.handleZoom.bind(this), {
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
    if (!this.isDragging) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

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
 *
 * The Dictionary is a thin lookup-and-navigate object: it does NOT listen
 * to the search box itself. Ownership of the `#search-box` and the
 * `?query=` URL param lives in another module (currently `crum/query.ts`),
 * which dispatches search events to registered dictionaries.
 */
export class Dictionary {
  /**
   * @param index - The dictionary index. Given a (well-formed) search query,
   * the index should supply us with the number of the page containing the
   * definition of the word in the query.
   *
   * @param scroller - The scroller updates the scan image given a page
   * number.
   */
  public constructor(
    private readonly index: Index,
    private readonly scroller: Scroller
  ) {}

  /**
   * Execute a search for the given query, navigating the scroller to the
   * matching page (if any).
   *
   * @param query - The search query (Coptic word or page number).
   */
  public search(query: string): void {
    const page = this.index.getPage(query);
    if (page === undefined) {
      return;
    }
    this.scroller.update(page);
  }
}
