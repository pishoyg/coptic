// NOTE: This package is used in the browser, and also during validation. So we
// allow it to assert correctness, instead of trying to always fail gracefully.
import * as logger from './logger.js';
import * as coptic from './coptic.js';
import * as browser from './browser.js';
// WANT_COLUMNS is the list of the first columns we expect to find in the TSV.
const WANT_COLUMNS = ['page', 'start', 'end'];
// ZOOM_FACTOR controls how fast zooming happens in response to scroll events.
const ZOOM_FACTOR = 0.05;
/**
 * We often use the notation "${NUM}${COL}" to refer to a given column in a
 * page. For example, "1a" refers to the left column of page 1.
 * chopColumn removes the column from the page, if present, returning the page
 * number.
 *
 * @param page - A page number, potentially containing a column.
 * @returns - The page number without the column.
 */
export function chopColumn(page) {
  if (['a', 'b'].some((c) => page.endsWith(c))) {
    page = page.slice(0, page.length - 1);
  }
  return page;
}
/**
 * A dictionary index.
 */
export class Index {
  WordType;
  pages;
  /**
   * @param index - The content of the index, in plain TSV format,with the first
   * three column being:
   * 1. Page number
   * 2. Page start word
   * 3. Page end word
   *
   * @param WordType - The type of words in this dictionary. This should be a
   * constructor type that takes as input the string representation of the word,
   * which is retrieved from the index columns.
   */
  constructor(index, WordType) {
    this.WordType = WordType;
    const lines = index.trim().split('\n');
    const header = Index.toColumns(lines[0]);
    // Verify that the header has the expected column names.
    logger.assass(
      WANT_COLUMNS.every((col, idx) => header[idx] === col),
      header.slice(0, WANT_COLUMNS.length),
      'do not match the list of wanted columns',
      WANT_COLUMNS
    );
    this.pages = lines
      .slice(1) // Skip the header.
      .map((row) => {
        const [page, start, end] = Index.toColumns(row);
        return {
          page: Index.forceParseInt(page),
          start: new WordType(start),
          end: new WordType(end),
        };
      });
  }
  /**
   * @param str - String representation of a TSV row.
   * @returns The content of the columns of interest in the given row.
   */
  static toColumns(str) {
    return str
      .split('\t')
      .slice(0, WANT_COLUMNS.length)
      .map((l) => l.trim());
  }
  /**
   * Parse an integer, throwing an error if it's not parsable.
   * @param str - A string representation of an integer.
   * @returns - The parsed integer.
   */
  static forceParseInt(str) {
    const num = parseInt(str);
    logger.assass(!isNaN(num), 'unable to parse page number', num);
    return num;
  }
  /**
   * Given a search query, return the dictionary page number.
   * @param query - Search query.
   * @returns - Page number, or undefined if the number can't be inferred from
   * the query.
   */
  getPage(query) {
    query = query.trim();
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
      // Neither a number nor a Coptic word! Nothing we can do!
      // TODO: (#411) This should support other classes of words as well, not
      // just Coptic words.
      // We should perhaps introduce another class method:
      //   searchable(query: string): boolean
      // and allow different children of this class to override this method,
      // and use that method instead.
      return undefined;
    }
    // Binary search the word in the dictionary.
    const target = new this.WordType(query);
    let left = 0;
    let right = this.pages.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const cur = this.pages[mid];
      if (target.leq(cur.end)) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }
    return this.pages[right].page;
  }
  /**
   * Build the index, and validate that its words are indeed lexicographically
   * sorted, as should be the case with a dictionary index.
   *
   * @param strict - If true, exit when encountering a sorting error. If false,
   * simply log an error message.
   */
  validate(strict = true) {
    const error = strict ? logger.fatal : logger.error;
    for (const [i, p] of this.pages.entries()) {
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
      const prev = this.pages[i - 1];
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
 * A holder of the HTML elements used to interact with the dictionary.
 */
export class Form {
  image;
  nextButton;
  prevButton;
  resetButton;
  searchBox;
  /**
   *
   * @param image - <img> element holding the book page.
   * @param nextButton - Button to navigate to the next page when clicked.
   * @param prevButton - Button to navigate to the previous page when clicked.
   * @param resetButton - Button to reset display.
   * @param searchBox - Search box, providing search queries.
   */
  constructor(image, nextButton, prevButton, resetButton, searchBox) {
    this.image = image;
    this.nextButton = nextButton;
    this.prevButton = prevButton;
    this.resetButton = resetButton;
    this.searchBox = searchBox;
  }
  /**
   * If you use a standard set of element IDs to mark your HTML elements,
   * default() can construct the Form object for you from the HTML document.
   * @returns
   */
  static default() {
    return new Form(
      document.getElementById('scan'),
      document.getElementById('next'),
      document.getElementById('prev'),
      document.getElementById('reset'),
      document.getElementById('searchBox')
    );
  }
}
/**
 *
 */
export class Scroller {
  offset;
  ext;
  form;
  landingPage;
  start;
  end;
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
  constructor(start, end, offset = 0, ext, form, landingPage = 1) {
    this.offset = offset;
    this.ext = ext;
    this.form = form;
    this.landingPage = landingPage;
    this.start = start - this.offset;
    this.end = end - this.offset;
    this.initEventListeners();
    this.update(this.getPageParam());
  }
  /**
   *
   * @returns
   */
  getPageParam() {
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
  update(page) {
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
  updatePageParam(newPage) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.replaceState({}, '', url.toString());
  }
  /**
   *
   * @param page
   */
  updateDisplay(page) {
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
  incrementPage() {
    this.update(this.getPageParam() + 1);
  }
  /**
   *
   */
  decrementPage() {
    this.update(this.getPageParam() - 1);
  }
  /**
   *
   * @param event
   */
  handleKeyDown(event) {
    if (event.code === 'KeyN') {
      this.incrementPage();
    } else if (event.code === 'KeyP') {
      this.decrementPage();
    }
  }
  /**
   *
   */
  initEventListeners() {
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
  form;
  scale = 1;
  startX = 0;
  startY = 0;
  originX = 0;
  originY = 0;
  isDragging = false;
  /**
   *
   * @param form
   * @param form.image
   * @param form.resetButton
   */
  constructor(form) {
    this.form = form;
    this.initEventListeners();
  }
  /**
   *
   */
  initEventListeners() {
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
  handleZoom(e) {
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
  startDragging(e) {
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
  dragImage(e) {
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
  stopDragging(e) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    this.form.image.style.cursor = 'grab';
  }
  /**
   *
   */
  reset() {
    this.scale = 1;
    this.originX = 0;
    this.originY = 0;
    this.updateTransform();
  }
  /**
   *
   */
  updateTransform() {
    this.form.image.style.transform = `scale(${this.scale.toString()}) translate(${this.originX.toString()}px, ${this.originY.toString()}px)`;
  }
  /**
   *
   * @param e
   */
  handleKeyDown(e) {
    if (e.code === 'KeyR') {
      this.reset();
    }
  }
}
/**
 *
 */
export class Dictionary {
  index;
  scroller;
  form;
  /**
   *
   * @param index
   * @param scroller
   * @param form
   * @param form.searchBox
   */
  constructor(
    // index stores our dictionary index, and will be used to look up pages.
    index,
    // scroller will be used to update the scan image for each query.
    scroller,
    form
  ) {
    this.index = index;
    this.scroller = scroller;
    this.form = form;
    this.form.searchBox.focus();
    this.addListeners();
  }
  /**
   *
   */
  search() {
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
  addListeners() {
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
