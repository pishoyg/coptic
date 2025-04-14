// NOTE: This package is used in the browser, and also during validation. So we
// allow it to assert correctness, instead of trying to fail recursively.
import * as logger from './logger.js';

// WANT_COLUMNS is the list of the first columns we expect to find in the TSV.
const WANT_COLUMNS = ['page', 'start', 'end'];

// Coptic exists in the Unicode in two blocks:
//   https://en.wikipedia.org/wiki/Coptic_(Unicode_block)
//   https://en.wikipedia.org/wiki/Greek_and_Coptic
// Thus, to list the letters, we need to iterate over the two ranges separately.
// There is also one letter, added later, that has its own range — the Akhmimic
// Khei.
const COPTIC_LETTERS: [string, string][] = [
  // Capital letters have a higher unicode value, and they immediately
  // precede their small counterpart.
  // Thus, to cover the full range of the alphabet, pair[0] should be a
  // capital letter, and pair[1] should be a small letter.
  ['Ⲁ', 'ⲱ'],
  ['Ⳉ', 'ⳉ'],
  ['Ϣ', 'ϯ'],
];

// ZOOM_FACTOR controls how fast zooming happens in response to scroll events.
const ZOOM_FACTOR = 0.015;

// Word represents a Coptic word that is lexicographically comparable to
// another.
// The two unicode blocks for the language are swapped (the lexicographically
// smaller range have higher Unicode values!) We hack around it using this
// wrapper, to allow you to conveniently compare words lexicographically.
// TODO: (#411) This currently only supports Coptic, but we will soon build
// Greek and Arabic indexes as well. Make the class more versatile!
export class Word {
  private static readonly mapping: Record<string, string> = Word.buildMapping();
  private readonly mapped: string;
  readonly word: string;
  constructor(word: string) {
    this.word = word.toLowerCase();
    logger.assass(!!this.word, 'constructing a word with the empty string!');
    logger.assass(
      [...this.word].every((c) => c in Word.mapping),
      word,
      'contains character that are not in the mapping!'
    );
    this.mapped = Word.map(this.word);
  }

  static isCopticWord(word: string) {
    return [...word].every((c) => c in Word.mapping);
  }

  leq(other: Word): boolean {
    return this.mapped <= other.mapped;
  }

  private static map(word: string): string {
    return Array.from(word)
      .map((a) => Word.mapping[a] ?? a)
      .join();
  }

  private static buildMapping(): Record<string, string> {
    return COPTIC_LETTERS.map((range) => Word.between(range[0], range[1]))
      .flat()
      .reduce<Record<string, string>>((acc, letter, index) => {
        acc[letter] = String.fromCharCode('a'.charCodeAt(0) + index);
        return acc;
      }, {});
  }

  private static between(a: string, b: string): string[] {
    const arr: string[] = [];
    for (
      let char = a;
      char <= b;
      char = String.fromCharCode(char.charCodeAt(0) + 1)
    ) {
      arr.push(char);
    }
    return arr;
  }
}

// Entry represents a dictionary page, where each page has a defined range,
// specified by the so-called *guide words*.
export interface Page {
  start: Word;
  end: Word;
  page: number;
}

export class Index {
  pages: Page[];
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

  static toColumns(str: string): string[] {
    return str
      .split('\t')
      .slice(0, WANT_COLUMNS.length)
      .map((l) => l.trim());
  }
  static parseInt(str: string): number {
    const num = parseInt(str);
    logger.assass(!isNaN(num), 'unable to parse page number', num);
    return num;
  }

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
    if (!Word.isCopticWord(query)) {
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

export class Form {
  constructor(
    readonly image: HTMLImageElement,
    readonly nextButton: HTMLElement,
    readonly prevButton: HTMLElement,
    readonly resetButton: HTMLElement,
    readonly searchBox: HTMLInputElement
  ) {}

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

export class Scroller {
  private readonly start: number;
  private readonly end: number;
  private readonly landingPage: number;
  // TODO: The parameters are unnecessarily complicated. Consider getting rid of
  // offsets and variable extensions altogether. They are complicating things.
  constructor(
    // Integer basename of the first image file.
    start: number,
    // Integer basename of the last image file.
    end: number,
    // The offset mainly concerns itself with the behavior of the page
    // parameter. It allows you to export a parameter value to your end users
    // that doesn't necessarily match the file names on the server.
    private readonly offset = 0,
    // File extensions. If it's page-dependent, pass a function that returns the
    // extension given the page number (the parameter passed being the basename,
    // rather than the page parameter (which accounts for the offset)).
    private readonly ext: string | ((page: number) => string),
    // Document bears our HTML objects.
    private readonly form: {
      image: HTMLImageElement;
      nextButton: HTMLElement;
      prevButton: HTMLElement;
      resetButton: HTMLElement;
    },
    // Default value for the page parameter (with the offset accounted for).
    landingPage = 1
  ) {
    this.start = start - this.offset;
    this.end = end - this.offset;
    this.landingPage = landingPage;

    this.initEventListeners();
    this.update(this.getPageParam());
  }

  private getPageParam(): number {
    const urlParams = new URLSearchParams(window.location.search);
    let page = urlParams.get('page');
    if (!page) {
      return this.landingPage;
    }
    if (['a', 'b'].some((c) => page?.endsWith(c))) {
      page = page.slice(0, page.length - 1);
    }
    try {
      return parseInt(page);
    } catch {
      return this.landingPage;
    }
  }

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

  private updatePageParam(newPage: number): void {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.replaceState({}, '', url.toString());
  }

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

  private incrementPage(): void {
    this.update(this.getPageParam() + 1);
  }

  private decrementPage(): void {
    this.update(this.getPageParam() - 1);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'KeyN') {
      this.incrementPage();
    } else if (event.code === 'KeyP') {
      this.decrementPage();
    }
  }
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

export class ZoomerDragger {
  private scale = 1;
  private startX = 0;
  private startY = 0;
  private originX = 0;
  private originY = 0;
  private isDragging = false;

  constructor(
    private readonly form: {
      image: HTMLImageElement;
      resetButton: HTMLElement;
    }
  ) {
    this.initEventListeners();
  }

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

  private startDragging(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.startX = e.clientX - this.originX;
    this.startY = e.clientY - this.originY;
    this.form.image.style.cursor = 'grabbing';
  }

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

  private stopDragging(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    this.form.image.style.cursor = 'grab';
  }

  private reset(): void {
    this.scale = 1;
    this.originX = 0;
    this.originY = 0;
    this.updateTransform();
  }

  private updateTransform(): void {
    this.form.image.style.transform = `scale(${this.scale.toString()}) translate(${this.originX.toString()}px, ${this.originY.toString()}px)`;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyR') {
      this.reset();
    }
  }
}

export class Dictionary {
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

  private search() {
    const query = this.form.searchBox.value.trim().toLowerCase();
    const page = this.index.getPage(query);
    if (page === undefined) {
      return;
    }
    this.scroller.update(page);
  }

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
    this.form.searchBox.addEventListener('keyup', (event: KeyboardEvent) => {
      event.stopPropagation();
    });
    this.form.searchBox.addEventListener('keydown', (event: KeyboardEvent) => {
      event.stopPropagation();
    });
    this.form.searchBox.addEventListener('keypress', (event: KeyboardEvent) => {
      event.stopPropagation();
    });
  }
}
