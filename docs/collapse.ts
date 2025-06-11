/** Package collapse defines logic to control collapsible elements. */

enum CLS {
  // COLLAPSE is the class of elements that, when clicked, trigger a collapse
  // effect in their next element sibling.
  COLLAPSE = 'collapse',
  COLLAPSE_ARROW = 'collapse-arrow',
}

/**
 * Collapsible represents an element that can collapse, becoming visible /
 * invisible as needed.
 * NOTE: This must be used with corresponding classes defined in the CSS. See
 * below and see the CSS for more details.
 */
export class Collapsible {
  private arrow?: HTMLSpanElement;

  /**
   * @param collapsible - The collapsible HTML element.
   * @param collapse
   * @param arrows
   */
  constructor(
    private readonly collapsible: HTMLElement,
    collapse?: HTMLElement,
    arrows = false
  ) {
    if (!collapse) {
      return;
    }

    collapse.addEventListener('click', this.toggle.bind(this));

    if (!arrows) {
      return;
    }
    // Create and prepend arrow element.
    this.arrow =
      collapse.querySelector(`.${CLS.COLLAPSE_ARROW}`) ??
      document.createElement('span');
    collapse.prepend(this.arrow);
    this.updateArrow(); // Set initial arrow.
  }

  /**
   * @returns The current visible height. This should return the empty string if
   * the element is currently hidden, thus you can use `!!this.get()` to test
   * whether the element is visible.
   */
  private get(): string {
    return this.collapsible.style.maxHeight;
  }

  /**
   * @param maxHeight
   */
  private set(maxHeight: string): void {
    this.collapsible.style.maxHeight = maxHeight;
  }

  /**
   * @returns
   */
  private scrollHeight(): string {
    return `${this.collapsible.scrollHeight.toString()}px`;
  }

  /**
   * Toggle the display of the collapsible.
   */
  toggle(): void {
    const expanded = !!this.get();
    this.set(expanded ? '' : this.scrollHeight());
    this.updateArrow();
  }

  /**
   * If currently visible, update the height to the height currently needed.
   * NOTE: Expanding the element involves calculating the current scroll height,
   * which is a very expensive operation. Don't perform it repeatedly in
   * performance-sensitive applications.
   */
  adjustHeightIfVisible(): void {
    if (!this.get()) {
      // This element is currently collapsed, so we keep the height at zero.
      return;
    }
    this.set(this.scrollHeight());
  }

  /**
   * Updates the arrow indicator element if available.
   */
  private updateArrow(): void {
    if (!this.arrow) {
      return;
    }
    this.arrow.textContent = `${this.get() ? '▾' : '▸'} `;
  }
}

/**
 * addListenersForSiblings initializes pairs of `collapse` and `collapsible`
 * elements in the page, such that clicking a `collapse` element collapses the
 * `collapsible`.
 * NOTE:
 * - Collapse (clickable) elements have the class `collapse`.
 * - Collapsible elements have the class `collapsible`.
 * - The `collapsible` elements are the siblings immediately following
 *   collapse` elements.
 * See the related CSS.
 *
 * @param toggleUponLoad - If true, toggle once after loading.
 * @param arrows
 */
export function addEventListenersForSiblings(
  toggleUponLoad = false,
  arrows = false
): void {
  document
    .querySelectorAll<HTMLElement>(`.${CLS.COLLAPSE}`)
    .forEach((collapse: HTMLElement): void => {
      const collapsible = new Collapsible(
        collapse.nextElementSibling as HTMLElement,
        collapse,
        arrows
      );
      if (toggleUponLoad) {
        collapsible.toggle();
      }
    });
}
