/** Package scan defines the logic for a dictionary scan. */

// NOTE: This package is used in the browser, and also during validation. So we
// allow it to assert correctness, instead of trying to always fail gracefully.
import * as log from './logger.js';
import * as copt from './coptic.js';
import * as orth from './orth.js';
import * as dev from './dev.js';
import * as str from './str.js';
import * as head from './header.js';

// WANT_COLUMNS is the list of the first columns we expect to find in the TSV.
const WANT_COLUMNS = ['page', 'start', 'end'];

// ZOOM_DOUBLING_DELTA is how much wheel delta (in pixels) doubles or halves
// the zoom: each event multiplies the scale by
// `2 ** (-deltaPixels(e) / ZOOM_DOUBLING_DELTA)`.
//
// Expressing the rate as a delta budget, rather than as a step per event,
// is what makes the zoom feel the same on both devices: a single trackpad
// flick spends roughly this much delta across its hundreds of tiny events,
// so it lands near a 2x zoom, while a mouse-wheel notch spends ~100px of it
// and so zooms ~15%.
const ZOOM_DOUBLING_DELTA = 500;

// PINCH_DOUBLING_DELTA is ZOOM_DOUBLING_DELTA's counterpart for a trackpad
// pinch, which browsers deliver as a wheel event with `ctrlKey` set, rather
// than as a gesture of its own. A pinch spends an order of magnitude less
// delta than a two-finger scroll of the same physical effort — a comfortable
// pinch is a few tens of pixels, not a few hundred — so charging it the
// scroll budget would leave the gesture users reach for first barely moving
// the zoom at all.
const PINCH_DOUBLING_DELTA = 50;

// PINCH_MAX_DELTA is the largest per-event delta (in pixels) we will read as
// part of a pinch. A pinch is not an event of its own: it arrives as a wheel
// event with `ctrlKey` set, which is also exactly what ctrl + mouse wheel
// sends. The two are told apart only by grain — a pinch reports many fine
// deltas, a mouse a few coarse notches — so a `ctrlKey` event this large is
// a mouse, and is charged the scroll budget. Were it charged the pinch
// budget, a single notch would quarter the zoom.
const PINCH_MAX_DELTA = 50;

// PIXELS_PER_LINE converts a line-mode wheel delta into pixels. Chromium
// values a line at ~33px — it reports the standard three-line notch as the
// ~100px quoted above — and reusing that factor makes Firefox agree with
// Chromium for the same mouse on the same machine, whatever the OS's
// lines-per-notch setting happens to be.
const PIXELS_PER_LINE = 33;

const MIN_SCALE = 0.2;
const MAX_SCALE = 10;

/**
 * Normalize a wheel delta to pixels.
 *
 * `deltaY` is only expressed in pixels when `deltaMode` is
 * `DOM_DELTA_PIXEL`. Chromium and WebKit always report pixels, but Firefox
 * reports a line-scrolling mouse in *lines* [1] — a delta of ~3 rather than
 * ~100 — which a delta-proportional zoom would read as very nearly no zoom
 * at all, leaving the wheel apparently dead. (A trackpad is a precise
 * device, and reports pixels in every browser; only a mouse reaches this.)
 *
 * [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1057252
 *
 * @param e - Mouse wheel event.
 * @returns The event's vertical delta, in pixels.
 */
function deltaPixels(e: WheelEvent): number {
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return e.deltaY * PIXELS_PER_LINE;
    case WheelEvent.DOM_DELTA_PAGE:
      // A page is a scrollport, so the viewport height is the pixel count.
      return e.deltaY * window.innerHeight;
    default:
      return e.deltaY;
  }
}

/**
 * The delta budget that an event's zoom is charged against.
 *
 * @param e - Mouse wheel event.
 * @returns `PINCH_DOUBLING_DELTA` if the event is a trackpad pinch,
 * `ZOOM_DOUBLING_DELTA` otherwise.
 */
function doublingDelta(e: WheelEvent): number {
  return e.ctrlKey && Math.abs(deltaPixels(e)) < PINCH_MAX_DELTA
    ? PINCH_DOUBLING_DELTA
    : ZOOM_DOUBLING_DELTA;
}

/**
 * Clamp a zoom scale to the permitted range.
 *
 * @param scale - Candidate scale.
 * @returns The scale, confined to `[MIN_SCALE, MAX_SCALE]`.
 */
function bounded(scale: number): number {
  if (scale > MAX_SCALE) {
    return MAX_SCALE;
  }
  if (scale < MIN_SCALE) {
    return MIN_SCALE;
  }
  return scale;
}

/**
 * IsActive answers whether a scan view is currently the active one on the
 * host page. It is supplied by callers so that this package does not need
 * to know about its host's mode-switching mechanism.
 *
 * Used by both `Scroller` (for the shared next / prev buttons and N / P
 * keydown) and `ZoomerDragger` (for the shared reset trigger dispatched
 * by `head.EVENT`), so each handler can early-return when its scan is
 * not the active view.
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
export function chopColumn(page: string): [string, Column] {
  const col: string = page.slice(-1);
  if (col === 'a' || col === 'b') {
    return [page.slice(0, -1), col];
  }
  return [page, undefined];
}

/**
 * Render a page identifier (`"${NUM}${COL}"`, e.g. `1a`) as a sequence
 * of inline nodes.
 *
 * The input is expected to carry a column letter.
 *
 * @param page
 * @returns
 */
export function prettyPage(page: string): (Node | string)[] {
  const [num, col]: [string, string | undefined] = chopColumn(page);
  if (!col) {
    log.error('Page has no column:', page);
    return [num];
  }
  const i = document.createElement('i');
  i.textContent = col;
  return [`${num} `, i];
}

const SWAP_TOLERANCE = 10;

type Column = 'a' | 'b' | undefined;

/**
 * Result of resolving a search query against the index: the target
 * page, plus a column letter when one was determined.
 */
export interface Result {
  page: number;
  column?: Column;
}

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
   * @param overrides - Map from a query string to its target page
   * identifier. The value is a string that may itself carry a trailing
   * column letter (`a` / `b`), and may also be another override key
   * (e.g. a Roman-numeral page like `xv`); `getPage` recurses to
   * resolve it. Looked up early on, so callers can route non-canonical query
   * forms to a specific page.
   *
   * Keys may include a column suffix (e.g. `xva`) for finer control;
   * `getPage` first tries the full query, then falls back to the
   * column-chopped form. Any column letter on the resolved value
   * propagates out of `getPage` and is honored over a user-typed
   * column letter — see the `getPage` JSDoc for the priority rules.
   *
   * Defaults to no overrides.
   */
  public constructor(
    index: string,
    private readonly wordType: new (s: string) => Word,
    private readonly overrides: Record<string, string> = {}
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
   * Resolve a search query to a `Result` (page number + optional
   * column).
   *
   * Resolution order (first match wins):
   *   1. **Override, exact match.** If the normalized query is itself
   *      a key in `overrides`, recurse on the override value. A column
   *      letter at the tail of the query is part of the lookup, so a
   *      key like `xva` can be registered independently of `xv`.
   *   2. **Override, column-chopped.** Strip the trailing column letter
   *      (if any) and look the base up in `overrides`. Used so that
   *      both `xv`, `xva`, and `xvb` resolve via the same override.
   *   3. **Coptic word.** Extract all Coptic characters and binary-
   *      search the index. Columns are not inferred from Coptic
   *      searches.
   *   4. **Page number.** Extract the first decimal run and parse it.
   *
   * Column priority: an override value's column wins over a column
   * the user typed at the top level. When both are present and
   * disagree, a warning is logged. Rationale: override entries
   * encode curator-supplied knowledge about which column a headword
   * lives in, so they should not be overridden by an incidental
   * typed suffix.
   *
   * @param query - The raw search query (any case, any whitespace).
   * @returns The resolved `Result`, or `undefined` when no rule fires.
   */
  public getPage(query: string): Result | undefined {
    // Normalize the query.
    query = query.toLowerCase();
    query = orth.cleanDiacritics(query);
    // For all our use cases, spaces don't make any difference.
    query = query.replace(/\s/g, '');

    if (!query) {
      return undefined;
    }

    let column: Column;
    let override: string | undefined;
    // 1. Check overrides with the query as-is first.
    override = this.overrides[query];
    if (override) {
      return this.getPage(override);
    }

    // Check overrides with the trailing column letter chopped, so queries like
    // `xva` resolve to the override registered for `xv`. The override value is
    // itself a page identifier — possibly with its own column suffix, or itself
    // another override key — so we recurse through `getPage` to resolve it, and
    // propagate whatever column the chain ends on.
    [query, column] = chopColumn(query);
    override = this.overrides[query];
    if (override) {
      const result: Result | undefined = this.getPage(override);
      if (!result) {
        log.error('Override', override, 'does not resolve for query', query);
        return result;
      }
      if (result.column && column) {
        log.warn(
          'Override',
          override,
          'resolves column',
          result.column,
          'while the query',
          query,
          'was followed by column',
          column
        );
      }
      result.column ??= column;
      return result;
    }

    // If any Coptic characters are present, extract them all and search
    // the concatenation as a single word. Otherwise fall back to digit
    // extraction to interpret the query as a page number.
    // TODO: (640) Extend to other word classes (Greek, Arabic).
    const coptic: string = Array.from(query).filter(copt.isCoptic).join('');
    if (coptic) {
      return { page: this.binarySearch(new this.wordType(coptic)) };
    }

    const number: RegExpMatchArray | null = query.match(/-?\d+/g);
    if (number) {
      return { page: parseInt(number[0]), column };
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
 * The search box and the wrapping <form> are NOT part of this — the
 * shared search box is wired by `docs/crum/mode.ts` (which owns the
 * `?query=` URL param and key handling), while each `Dictionary` listens
 * to it directly to run a search on every keystroke.
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

enum CLS {
  /** CSS class applied by the `Scroller` to its column-highlight overlay. */
  COLUMN_HIGHLIGHT = 'column-highlight',
  A = 'a',
  B = 'b',
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
  private readonly highlight: HTMLDivElement;
  private currentPage: number;
  // Latest `src` assigned to the image. We compare against this to
  // detect re-navigation to the same page (where `img.src = sameValue`
  // would not refire `load`).
  private currentSrc = '';
  // Tracks the in-flight image load. Each new navigation aborts the
  // previous controller so a stale `load` callback from a superseded
  // navigation can't clobber the latest highlight.
  private pendingLoad: AbortController | undefined = undefined;

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

    // The overlay is inserted as a sibling of the image, inside the same
    // parent (the `<figure>` for the existing scan pages). That parent
    // also receives the zoom / pan transform applied by `ZoomerDragger`,
    // so the highlight tracks the image automatically.
    this.highlight = document.createElement('div');
    this.highlight.classList.add(CLS.COLUMN_HIGHLIGHT);
    this.form.image.insertAdjacentElement('afterend', this.highlight);

    this.addEventListeners();
    this.update(this.landingPage);
  }

  /**
   * Update the display to the given page number.
   *
   * @param page - Page number to open. This will be modified if it falls
   * outside our page range.
   * @param column - Optional column to highlight ('a' or 'b'). Omit
   * to clear the highlight — N / P navigation and queries without an
   * explicit column letter call `update` without this argument, so the
   * leftover highlight from a previous typed `1a`/`1b` is cleared.
   */
  public update(page: number, column?: Column): void {
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
    // Defer the highlight to the new image's `load` event so the
    // rectangle appears alongside the new scan rather than flashing
    // over the previous one. Until then the previous highlight stays
    // visible on the previous image, which is the visually consistent
    // state.
    this.updateDisplay(page, this.updateHighlight.bind(this, column));
  }

  /**
   * Show the column highlight, or hide it when no column was given.
   *
   * @param column - Column letter to highlight, or `undefined` to clear.
   */
  private updateHighlight(column: Column): void {
    this.highlight.classList.toggle(CLS.A, column === 'a');
    this.highlight.classList.toggle(CLS.B, column === 'b');
  }

  /**
   * Update the image to the given page number, invoking `onLoad` once
   * the new image has actually rendered.
   *
   * Callers (the column-highlight overlay) need to know when the new
   * scan is on screen so their own DOM changes happen in sync with it
   * — applying them eagerly would let the overlay flash over the
   * previous page while the new one is still streaming in. Same-src +
   * already-loaded fires `onLoad` synchronously since
   * `img.src = sameValue` does not refire `load`.
   *
   * @param page - Page number. The value is NOT verified.
   * @param onLoad - Invoked once the requested image is on screen.
   */
  private updateDisplay(page: number, onLoad: () => void): void {
    const stem: number = page + this.offset;
    const newSrc: string = str.joinPaths(
      this.directory,
      `${stem.toString()}.${this.ext}`
    );

    this.form.image.alt = page.toString();

    // Cancel any prior pending load so its stale callback can't apply
    // a highlight that no longer matches the latest navigation.
    this.pendingLoad?.abort();

    if (newSrc === this.currentSrc && this.form.image.complete) {
      this.pendingLoad = undefined;
      onLoad();
      return;
    }

    this.pendingLoad = new AbortController();
    this.currentSrc = newSrc;
    this.form.image.addEventListener('load', onLoad, {
      once: true,
      signal: this.pendingLoad.signal,
    });
    this.form.image.src = newSrc;
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
    // TODO: (#203) Part of this logic should live in the header module. You
    // should add a listener to a `head.EVENT.NEXT` and `head.EVENT.PREV`
    // events, which get triggered elsewhere.
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
   * TODO: (#203) Re-express NEXT / PREV as custom DOM events dispatched
   * by the host (or by the buttons themselves on the active scan's
   * image). Each scroller would listen on its own image and so be
   * inherently mode-scoped, eliminating the `active()` checks here. Search
   * input is already handled directly by each `Dictionary` via the shared
   * search box's `input` event; RESET already follows the custom-event
   * shape via `head.EVENT`.
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
  private readonly isActive: IsActive;
  /**
   * The element that receives the zoom / pan CSS transform. We transform
   * the image's parent rather than the image itself so that overlay
   * siblings (e.g. the `Scroller`'s column highlight) inherit the same
   * transform and stay aligned with the image at any zoom / pan.
   */
  private readonly transformTarget: HTMLElement;

  /**
   * @param form - Image + reset-button pair the dragger controls.
   * @param form.image - <img> the dragger zooms and pans.
   * @param form.resetButton - Button that resets the zoom / pan transform.
   * @param isActive - Predicate that answers whether this scan is the
   * active one on the host page. When the host serves multiple scans
   * behind a mode switcher, every scan's `ZoomerDragger` listens to the
   * same `head.EVENT` dispatched by the shared reset button, so only the
   * active one should perform the reset. Omit on single-scan pages.
   */
  public constructor(
    private readonly form: {
      image: HTMLImageElement;
      resetButton: HTMLElement;
    },
    isActive?: IsActive
  ) {
    this.isActive = isActive ?? ((): boolean => true);
    this.transformTarget = form.image.parentElement!;
    this.addEventListeners();
  }

  /**
   * Register event listeners.
   *
   * The image-scoped listeners (wheel, mousedown) can't fire when the
   * image lives in a `display: none` ancestor; the document-level drag
   * listeners are latched off `this.isDragging`, which can only become
   * true via a mousedown on a visible image; so neither group needs
   * mode gating.
   *
   * The reset trigger is shared across scans (one `.reset` button, one
   * `head.EVENT`), so we gate the listener with `isActive` to restrict
   * reset to whichever scan is currently in view.
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

    document.addEventListener(head.EVENT.RESET, (): void => {
      if (this.isActive()) {
        this.reset();
      }
    });
  }

  /**
   * Handle the mouse wheel event.
   *
   * @param e - Mouse wheel event.
   */
  private handleZoom(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();

    // Zoom by the wheel delta, rather than by a fixed step per event. A
    // mouse reports a few coarse events per gesture (|deltaY| ~= 100), a
    // trackpad hundreds of tiny ones (|deltaY| ~= 1), so a fixed step lets a
    // single trackpad flick race all the way to a clamp. Scaling
    // exponentially also keeps the zoom multiplicative, so equal and
    // opposite deltas cancel out exactly.
    const scale: number = bounded(
      this.scale * 2 ** (-deltaPixels(e) / doublingDelta(e))
    );
    // Take the ratio from the *clamped* scale, so a zoom that the clamp
    // refuses does not pan the image either.
    const ratio: number = scale / this.scale;

    // Anchor the zoom at the pointer, keeping whichever pixel of the image
    // sits under the cursor there. Otherwise the image slides out from under
    // the cursor as it shrinks, and the remainder of the gesture — no longer
    // over the image, so no longer ours to preventDefault — scrolls the page.
    //
    // CSS maps a local point `p` to `origin + translate + scale * (p -
    // origin)`, so the transformed box's centre is precisely the image of the
    // transform origin. Holding the pointer fixed then reduces to nudging the
    // translation by the pointer's offset from that centre.
    const rect: DOMRect = this.transformTarget.getBoundingClientRect();
    const centerX: number = rect.left + rect.width / 2;
    const centerY: number = rect.top + rect.height / 2;
    this.originX += (1 - ratio) * (e.clientX - centerX);
    this.originY += (1 - ratio) * (e.clientY - centerY);
    this.scale = scale;
    if (this.isDragging) {
      // handleZoom moved the origin; rebase the drag so the next mousemove
      // does not snap the image by the anchoring offset.
      this.startX = e.clientX - this.originX;
      this.startY = e.clientY - this.originY;
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
    // The listener is on the document, so it sees every mouseup on the page,
    // not just the ones ending a drag. Without this guard we would cancel and
    // stop the propagation of all of them — including clicks on the search
    // box, the mode buttons, and the pagination chips.
    if (!this.isDragging) {
      return;
    }
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
    // Translate must come before scale: CSS applies transforms
    // right-to-left, so the scale runs first in the element's local space
    // and the translate then moves the already-scaled image by raw screen
    // pixels. Reversing the order would scale the translate too, making
    // the image drift away from the pointer at any zoom != 1.
    this.transformTarget.style.transform = `translate(${this.originX.toString()}px, ${this.originY.toString()}px) scale(${this.scale.toString()})`;
  }
}

/**
 * Dictionary represents a searchable dictionary scan.
 *
 * The Dictionary listens to the shared search box's `input` event and
 * navigates to the matching page on each keystroke. Ownership of the
 * `?query=` URL param and the box's key handling lives in
 * `docs/crum/mode.ts`.
 */
export class Dictionary {
  /**
   * @param index - The dictionary index. Given a (well-formed) search query,
   * the index should supply us with the number of the page containing the
   * definition of the word in the query.
   *
   * @param scroller - The scroller updates the scan image given a page
   * number.
   * @param searchBox - The shared search box. The `Dictionary` listens to
   * its `input` event and searches on every keystroke.
   */
  public constructor(
    private readonly index: Index,
    private readonly scroller: Scroller,
    private readonly searchBox: HTMLInputElement
  ) {
    searchBox.addEventListener('input', this.search.bind(this));
    this.search();
  }

  /**
   * Execute a search for the given query, navigating the scroller to the
   * matching page (if any).
   */
  public search(): void {
    const ref: Result | undefined = this.index.getPage(this.searchBox.value);
    if (ref === undefined) {
      return;
    }
    this.scroller.update(ref.page, ref.column);
  }
}
