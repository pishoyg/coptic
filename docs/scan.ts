// NOTE: This package is used in the browser, and also during validation. So we
// allow it to assert correctness, instead of trying to fail recursively.
import * as logger from './logger.js';
import * as coptic from './coptic.js';
import * as browser from './browser.js';

// WANT_COLUMNS is the list of the first columns we expect to find in the TSV.
const WANT_COLUMNS = ['page', 'start', 'end'];

// ZOOM_FACTOR controls how fast zooming happens in response to scroll events.
const ZOOM_FACTOR = 0.05;

/**
 * TODO: (#411) Implement Greek and Arabic word classes, as well as Coptic.
 */
export interface Word {
  /**
   *
   * @param other
   */
  leq(other: Word): boolean;
  get word(): string;
}

// Entry represents a dictionary page, where each page has a defined range,
// specified by the so-called *guide words*.
export interface Page {
  start: Word;
  end: Word;
  page: number;
}

/**
 *
 * @param page
 * @returns
 */
export function chopColumn(page: string): string {
  if (['a', 'b'].some((c) => page.endsWith(c))) {
    page = page.slice(0, page.length - 1);
  }
  return page;
}

/**
 *
 */
export class Index {
  pages: Page[];
  /**
   *
   * @param index
   * @param WordType
   */
  constructor(
    index: string,
    private readonly WordType: new (str: string) => Word
  ) {
    const lines = index.trim().split('\n');
    const header: string[] = Index.toColumns(lines[0]!);
    logger.assass(
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
          page: Index.parseInt(page!),
          start: new WordType(start!),
          end: new WordType(end!),
        };
      });
  }

  /**
   *
   * @param str
   * @returns
   */
  static toColumns(str: string): string[] {
    return str
      .split('\t')
      .slice(0, WANT_COLUMNS.length)
      .map((l) => l.trim());
  }
  /**
   *
   * @param str
   * @returns
   */
  static parseInt(str: string): number {
    const num = parseInt(str);
    logger.assass(!isNaN(num), 'unable to parse page number', num);
    return num;
  }

  /**
   *
   * @param query
   * @returns
   */
  getPage(query: string): number | undefined {
    if (!query) {
      return undefined;
    }

    const num = parseInt(query);
    if (!isNaN(num)) {
      // This is a page number.
      return num;
    }

    // Check if this is a Coptic word.
    if (!coptic.isCoptic(query)) {
      return undefined;
    }

    const target = new this.WordType(query);
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
   *
   * @param strict
   */
  validate(strict = true): void {
    const error = strict ? logger.fatal : logger.error;
    for (let i = 0; i < this.pages.length; i++) {
      const p = this.pages[i]!;

      if (!p.start.leq(p.end)) {
        error(
          'page',
          p.page,
          'has messed up columns',
          p.start.word,
          'and',
          p.end.word
        );
      }

      if (i === 0) continue;

      const prev = this.pages[i - 1]!;

      if (p.page !== prev.page + 1) {
        // While we can tolerate some errors in the word order, we can't allow
        // page numbers to get mixed up, so we always use `fatal` regardless of
        // strictness.
        logger.fatal(
          `Non-consecutive page numbers: ${prev.page.toString()}, ${p.page.toString()}`
        );
      }

      if (!prev.end.leq(p.start)) {
        error(
          p.start.word,
          'on page',
          p.page,
          'is smaller than',
          prev.end.word,
          'on page',
          prev.page
        );
      }
    }
  }
}

/**
 *
 */
export class Form {
  /**
   *
   * @param image
   * @param nextButton
   * @param prevButton
   * @param resetButton
   * @param searchBox
   */
  constructor(
    readonly image: HTMLImageElement,
    readonly nextButton: HTMLElement,
    readonly prevButton: HTMLElement,
    readonly resetButton: HTMLElement,
    readonly searchBox: HTMLInputElement
  ) {}

  /**
   *
   * @returns
   */
  static default(): Form {
    return new Form(
      document.getElementById('scan') as HTMLImageElement,
      document.getElementById('next')!,
      document.getElementById('prev')!,
      document.getElementById('reset')!,
      document.getElementById('searchBox') as HTMLInputElement
    );
  }
}

/**
 *
 */
export class Scroller {
  private readonly start: number;
  private readonly end: number;
  // TODO: (#0) The parameters are unnecessarily complicated. Consider getting
  // rid of offsets and variable extensions altogether. They are complicating
  // things.
  /**
   *
   * @param start - Integer basename of the first image.
   * @param end - Integer basename of the first image.
   * @param offset - Offset of the first interesting page in the book (skipping
   * the intro and such).
   * The offset mainly concerns itself with the behavior of the page
   * parameter. It allows you to export a parameter value to your end users
   * that doesn't necessarily match the file names on the server.
   * For example: If the pages are numbered 1.jpg to 100.jpg, with 1-20
   * representing the introduction, 21.jpg being the page 1, then the offset is
   * 20. Thus, `?page=1` will open file 21.jpg.
   * @param ext - File extensions. If it's page-dependent, pass a function that
   * returns the extension given the page number (the parameter passed being the
   * basename, rather than the page parameter (which accounts for the offset)).
   * @param form - Input and output elements.
   * @param form.image
   * @param form.nextButton
   * @param form.prevButton
   * @param form.resetButton
   * @param landingPage - Default value for the page parameter.
   */
  constructor(
    start: number,
    end: number,
    private readonly offset = 0,
    private readonly ext: string | ((page: number) => string),
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

    this.initEventListeners();
    this.update(this.getPageParam());
  }

  /**
   *
   * @returns
   */
  private getPageParam(): number {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    if (!page) {
      return this.landingPage;
    }
    const num = parseInt(chopColumn(page));
    return isNaN(num) ? this.landingPage : num;
  }

  /**
   *
   * @param page
   */
  public update(page: number): void {
    if (page < this.start) {
      page = this.start;
    }
    if (page > this.end) {
      page = this.end;
    }
    this.updatePageParam(page);
    this.updateDisplay(page);
    this.form.resetButton.click();
  }

  /**
   *
   * @param newPage
   */
  private updatePageParam(newPage: number): void {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.replaceState({}, '', url.toString());
  }

  /**
   *
   * @param page
   */
  private updateDisplay(page: number): void {
    const stem = page + this.offset;
    this.form.image.src = `${stem.toString()}.${typeof this.ext === 'function' ? this.ext(stem) : this.ext}`;
    this.form.image.alt = page.toString();
    if (page === this.start) {
      this.form.prevButton.classList.add('disabled');
    } else {
      this.form.prevButton.classList.remove('disabled');
    }
    if (page === this.end) {
      this.form.nextButton.classList.add('disabled');
    } else {
      this.form.nextButton.classList.remove('disabled');
    }
  }

  /**
   *
   */
  private incrementPage(): void {
    this.update(this.getPageParam() + 1);
  }

  /**
   *
   */
  private decrementPage(): void {
    this.update(this.getPageParam() - 1);
  }

  /**
   *
   * @param event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'KeyN') {
      this.incrementPage();
    } else if (event.code === 'KeyP') {
      this.decrementPage();
    }
  }
  /**
   *
   */
  private initEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.form.nextButton.addEventListener(
      'click',
      this.incrementPage.bind(this)
    );
    this.form.prevButton.addEventListener(
      'click',
      this.decrementPage.bind(this)
    );
  }
}

/**
 *
 */
export class ZoomerDragger {
  private scale = 1;
  private startX = 0;
  private startY = 0;
  private originX = 0;
  private originY = 0;
  private isDragging = false;

  /**
   *
   * @param form
   * @param form.image
   * @param form.resetButton
   */
  constructor(
    private readonly form: {
      image: HTMLImageElement;
      resetButton: HTMLElement;
    }
  ) {
    this.initEventListeners();
  }

  /**
   *
   */
  private initEventListeners(): void {
    document.addEventListener('wheel', this.handleZoom.bind(this), {
      passive: false,
    });

    this.form.image.addEventListener(
      'mousedown',
      this.startDragging.bind(this)
    );
    document.addEventListener('mousemove', this.dragImage.bind(this));
    document.addEventListener('mouseup', this.stopDragging.bind(this));
    this.form.resetButton.addEventListener('click', this.reset.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   *
   * @param e
   */
  private handleZoom(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY < 0) {
      this.scale += ZOOM_FACTOR;
    } else if (e.deltaY > 0 && this.scale > 0.2) {
      this.scale -= ZOOM_FACTOR;
    }

    this.updateTransform();
  }

  /**
   *
   * @param e
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
   *
   * @param e
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
   *
   * @param e
   */
  private stopDragging(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    this.form.image.style.cursor = 'grab';
  }

  /**
   *
   */
  private reset(): void {
    this.scale = 1;
    this.originX = 0;
    this.originY = 0;
    this.updateTransform();
  }

  /**
   *
   */
  private updateTransform(): void {
    this.form.image.style.transform = `scale(${this.scale.toString()}) translate(${this.originX.toString()}px, ${this.originY.toString()}px)`;
  }

  /**
   *
   * @param e
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyR') {
      this.reset();
    }
  }
}

/**
 *
 */
export class Dictionary {
  /**
   *
   * @param index
   * @param scroller
   * @param form
   * @param form.searchBox
   */
  constructor(
    // index stores our dictionary index, and will be used to look up pages.
    private readonly index: Index,
    // scroller will be used to update the scan image for each query.
    private readonly scroller: Scroller,
    private readonly form: { searchBox: HTMLInputElement }
  ) {
    this.form.searchBox.focus();
    this.addListeners();
  }

  /**
   *
   */
  private search() {
    const query = this.form.searchBox.value.trim().toLowerCase();
    const page = this.index.getPage(query);
    if (page === undefined) {
      return;
    }
    this.scroller.update(page);
  }

  /**
   *
   */
  private addListeners() {
    // Input in the search box triggers a search.
    this.form.searchBox.addEventListener('input', this.search.bind(this));

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
