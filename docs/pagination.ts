/**
 * Package pagination renders a paginated navigation bar: a
 * `[← prev] [centered page chips] [next →]` row whose middle is filled with as
 * many page-jump links as the container width allows.
 *
 * The module is split into two layers:
 * - A pure layer (`visiblePages`) that decides *which* pages to show, with no
 *   DOM dependency.
 * - A DOM layer (`Pagination`) that renders those pages, measures the result
 *   against the container, and wires navigation.
 */
import * as cls from './cls.js';
import * as numeral from './numeral.js';
import * as tool from './tooltip.js';

/**
 * CLS groups the class names used by the pagination bar, so the CSS that styles
 * them can be traced back to one place.
 */
export enum CLS {
  // CONTAINER is the class of the pagination bar's host element.
  CONTAINER = 'pagination',
  // PREV is the class of the "previous page" arrow.
  PREV = 'pagination-prev',
  // NEXT is the class of the "next page" arrow.
  NEXT = 'pagination-next',
  // PAGES is the class of the centered middle container holding the page chips.
  PAGES = 'pagination-pages',
  // NUM is the class of a clickable page-jump link.
  NUM = 'pagination-num',
  // CURRENT is the class of the current (non-clickable) page number.
  CURRENT = 'pagination-current',
  // ELLIPSIS is the class of an inert gap (`…`) marker.
  ELLIPSIS = 'pagination-ellipsis',
  // TIP is the class of a pagination tooltip, styled to resemble the faint
  // result-count numbers so users recognize the hint as page/result numbers.
  TIP = 'pagination-tip',
}

/**
 * MAX_SLOTS is the generous upper bound on the number of slots (page links +
 * gaps) the bar starts from before decrementing to fit the container width. It
 * comfortably exceeds what any realistic viewport fits.
 */
const MAX_SLOTS = 25;

/**
 * RESIZE_DEBOUNCE_MS is how long after the last window `resize` event we wait
 * before re-rendering the bar to fit the new viewport.
 *
 * TODO: (#0) Debouncing is hand-rolled here, and in `docs/xooxle.ts` (search
 * input). Extract a shared `debounce` helper into a common package and
 * deduplicate the code.
 */
const RESIZE_DEBOUNCE_MS = 150;

/**
 * PageToken is a single slot in the pagination bar: either a (0-based) page
 * number to render as a jump link, or a `'gap'` standing for an elided run of
 * pages (rendered as an ellipsis).
 */
export type PageToken = number | 'gap';

/**
 * tokenize converts a sorted, de-duplicated list of shown page indices into the
 * render token sequence, inserting a `'gap'` between two shown pages whenever
 * they hide ≥ 2 pages. When exactly one page is hidden, that page is shown
 * instead of a gap — a `'…'` glyph occupies the same slot as a page number, so
 * hiding a single page would save nothing.
 *
 * @param pages - Sorted, unique 0-based page indices to show.
 * @returns The render token sequence.
 */
function tokenize(pages: number[]): PageToken[] {
  const tokens: PageToken[] = [];
  pages.forEach((page: number, i: number): void => {
    if (i > 0) {
      const prev: number = pages[i - 1]!;
      const diff: number = page - prev;
      if (diff === 2) {
        // Exactly one page hidden: show it rather than a gap.
        tokens.push(prev + 1);
      } else if (diff > 2) {
        tokens.push('gap');
      }
    }
    tokens.push(page);
  });
  return tokens;
}

/**
 * visiblePages computes the pagination token sequence for the bar: the first
 * and last page are always present, a window is centered on the current page
 * and widened symmetrically (clamping at the ends of the range) until the token
 * count reaches `maxSlots`, and `'gap'` tokens mark each elided run.
 *
 * @param current - The current page (0-based).
 * @param total - The total number of pages.
 * @param maxSlots - The maximum number of tokens (page links + gaps) to emit.
 * @returns The token sequence to render.
 */
export function visiblePages(
  current: number,
  total: number,
  maxSlots: number
): PageToken[] {
  if (total <= maxSlots) {
    // Everything fits: show every page, no gaps.
    return Array.from({ length: total }, (_: unknown, i: number): number => i);
  }

  // build tokenizes the window [lo, hi] together with the two anchor pages.
  const build = (lo: number, hi: number): PageToken[] => {
    const shown = new Set<number>([0, total - 1]);
    for (let page = lo; page <= hi; page++) {
      shown.add(page);
    }
    return tokenize([...shown].sort((a: number, b: number): number => a - b));
  };

  // Grow a window outward from the current page. The first and last page are
  // always present (added by `build`), so the result never shrinks below
  // `first … current … last`.
  let lo: number = current;
  let hi: number = current;
  for (;;) {
    const canLeft: boolean = lo > 0;
    const canRight: boolean = hi < total - 1;
    if (!canLeft && !canRight) {
      break;
    }
    // Widen symmetrically: extend the side with the smaller extent, falling
    // back to whichever side still has room.
    const expandLeft: boolean =
      canLeft && (!canRight || current - lo <= hi - current);
    const nLo: number = expandLeft ? lo - 1 : lo;
    const nHi: number = expandLeft ? hi : hi + 1;
    if (build(nLo, nHi).length > maxSlots) {
      break;
    }
    lo = nLo;
    hi = nHi;
  }

  return build(lo, hi);
}

/**
 * Pagination renders and manages the navigation bar inside a host container.
 * It owns the bar's contents (rebuilding them on every `render`) but not the
 * container element itself, which its host embeds and positions.
 */
export class Pagination {
  /**
   * last remembers the most recent `render` arguments so the bar can re-render
   * itself on viewport `resize` without the host re-supplying them.
   */
  private last: { currentPage: number; totalResults: number } | null = null;

  /** resizeTimer debounces re-renders triggered by window `resize`. */
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param container - The host element the bar renders into.
   * @param perPage - The number of results shown per page; used both to derive
   * the page count and to label each page's result range.
   * @param navigate - Called with the 0-based destination page when the user
   * activates an arrow or a page link.
   */
  public constructor(
    private readonly container: HTMLElement,
    private readonly perPage: number,
    private readonly navigate: (page: number) => void
  ) {
    this.addEventListeners();
  }

  /**
   * Wire the listeners owned by this `Pagination`. The bar is fitted to the
   * viewport at render time, so a debounced `resize` re-render keeps it fitted
   * as the window changes. The host re-renders on its own for paging and
   * search, so those paths need no listener here.
   */
  private addEventListeners(): void {
    window.addEventListener('resize', (): void => {
      if (this.resizeTimer !== null) {
        clearTimeout(this.resizeTimer);
      }
      this.resizeTimer = setTimeout((): void => {
        if (this.last !== null) {
          this.render(this.last.currentPage, this.last.totalResults);
        }
      }, RESIZE_DEBOUNCE_MS);
    });
  }

  /**
   * Render the bar for the given page. With a single page (or fewer) nothing is
   * rendered, leaving the container empty.
   *
   * Rendering happens in two passes: `fit` finds the largest slot budget whose
   * chips fit the available width, then the chosen chips are rebuilt with their
   * hover tooltips wired. The tooltips are attached only on this final pass,
   * not on every measured budget, so the measurement does not create and
   * orphan popovers it never shows.
   *
   * The bar is measured against the live viewport, so it is re-rendered on
   * paging, re-searching, and (debounced) window `resize` — see
   * `addEventListeners`.
   *
   * @param currentPage - The current page (0-based).
   * @param totalResults - The total number of search results.
   */
  public render(currentPage: number, totalResults: number): void {
    // Remember the args so a `resize` can re-render without the host's help.
    // Stored before the early return so resizing after an empty (single-page)
    // result keeps the bar empty rather than restoring a stale one.
    this.last = { currentPage, totalResults };

    this.container.replaceChildren();
    const totalPages: number = Math.ceil(totalResults / this.perPage);
    if (totalPages <= 1) {
      return;
    }

    const pages: HTMLDivElement = document.createElement('div');
    pages.classList.add(CLS.PAGES);
    this.container.append(
      this.arrow(currentPage, totalPages, -1),
      pages,
      this.arrow(currentPage, totalPages, 1)
    );

    this.capWidthToViewport();
    const tokens: PageToken[] = this.fit(pages, currentPage, totalPages);
    pages.replaceChildren(
      ...tokens.map((token: PageToken): HTMLElement => {
        const chip: HTMLSpanElement = this.chip(token, currentPage);
        if (token !== 'gap') {
          tool.addTooltip(chip, [this.range(token, totalResults)], [CLS.TIP]);
        }
        return chip;
      })
    );
  }

  /**
   * Cap the bar's width to the visible viewport. The host container can live
   * inside a horizontally-scrolling region wider than the viewport (e.g. a wide
   * results table), in which case it would otherwise stretch to that region's
   * width and render page links off-screen. We size it to the viewport minus
   * the bar's own (symmetric) horizontal offset, so it stays aligned with the
   * surrounding content but never exceeds the visible width. Paired with the
   * `sticky` positioning in the CSS, the bar stays in view as the region
   * scrolls.
   */
  private capWidthToViewport(): void {
    const left: number = Math.max(
      this.container.getBoundingClientRect().left,
      0
    );
    const visible: number = document.documentElement.clientWidth - 2 * left;
    this.container.style.width = `${visible.toString()}px`;
  }

  /**
   * Find the page tokens for the largest slot budget whose rendered chips fit
   * the available width. The chips are fit to the container width: the bar is
   * rendered at a generous budget and the budget is decremented until it stops
   * overflowing. `.pagination-pages` has a stable, content-independent width
   * (its flex siblings — the arrows — are fixed-width), so its `clientWidth` is
   * the available width while its `scrollWidth` is the full content width, and
   * an overflow shows up as `scrollWidth > clientWidth`.
   *
   * Measurement uses bare chips (no tooltips); the caller rebuilds the chosen
   * tokens with tooltips wired.
   *
   * @param pages - The (attached) middle container the chips render into.
   * @param currentPage - The current page (0-based).
   * @param totalPages - The total number of pages.
   * @returns The fitting token sequence.
   */
  private fit(
    pages: HTMLDivElement,
    currentPage: number,
    totalPages: number
  ): PageToken[] {
    let tokens: PageToken[] = [];
    for (let budget: number = MAX_SLOTS; budget >= 1; budget--) {
      tokens = visiblePages(currentPage, totalPages, budget);
      pages.replaceChildren(
        ...tokens.map(
          (token: PageToken): HTMLElement => this.chip(token, currentPage)
        )
      );
      if (pages.scrollWidth <= pages.clientWidth) {
        break;
      }
    }
    return tokens;
  }

  /**
   * Build a prev/next arrow. At the ends of the range the arrow is an empty
   * element, preserving the flex spacing of the three-section bar.
   *
   * @param currentPage - The current page (0-based).
   * @param totalPages - The total number of pages.
   * @param step - -1 for the previous-page arrow, 1 for the next-page arrow.
   * @returns The arrow element.
   */
  private arrow(
    currentPage: number,
    totalPages: number,
    step: -1 | 1
  ): HTMLDivElement {
    const isPrev: boolean = step < 0;
    const div: HTMLDivElement = document.createElement('div');
    div.classList.add(isPrev ? CLS.PREV : CLS.NEXT, cls.LINK);
    const target: number = currentPage + step;
    if (target < 0 || target >= totalPages) {
      return div;
    }
    div.textContent = isPrev ? '←' : '→';
    tool.addTooltip(div, [isPrev ? 'prev' : 'next'], [CLS.TIP]);
    div.addEventListener('click', (e: Event): void => {
      e.preventDefault();
      this.navigate(target);
    });
    return div;
  }

  /**
   * Build a single chip: a gap ellipsis, the non-clickable current page, or a
   * clickable page-jump link. The chip carries no tooltip — the caller wires
   * one onto the final, fitted chips (see `render`).
   *
   * @param token - The page token to render.
   * @param currentPage - The current page (0-based).
   * @returns The chip element.
   */
  private chip(token: PageToken, currentPage: number): HTMLSpanElement {
    const span: HTMLSpanElement = document.createElement('span');
    if (token === 'gap') {
      span.classList.add(CLS.ELLIPSIS);
      span.textContent = '…';
      return span;
    }

    span.textContent = numeral.coptic(token + 1);
    if (token === currentPage) {
      span.classList.add(CLS.CURRENT);
      return span;
    }

    span.classList.add(CLS.NUM, cls.LINK);
    span.addEventListener('click', (e: Event): void => {
      e.preventDefault();
      this.navigate(token);
    });
    return span;
  }

  /**
   * @param page - The page (0-based) to describe.
   * @param totalResults - Total result count, clamping the last page's range.
   * @returns A human-readable label for the results on the given page.
   */
  private range(page: number, totalResults: number): string {
    const from: number = page * this.perPage + 1;
    const to: number = Math.min((page + 1) * this.perPage, totalResults);
    return `${from.toString()}–${to.toString()}`;
  }
}
