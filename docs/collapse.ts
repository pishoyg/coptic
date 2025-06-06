enum CLS {
  // COLLAPSE is the class of elements that, when clicked, trigger a collapse
  // effect in their next element sibling.
  COLLAPSE = 'collapse',
}

/**
 * Collapsible represents an element that can collapse, becoming visible /
 * invisible as needed.
 * NOTE: This must be used with corresponding classes defined in the CSS. See
 * below and see the CSS for more details.
 */
export class Collapsible {
  /**
   * @param element - The collapsible HTML element.
   */
  constructor(private readonly element: HTMLElement) {}

  /**
   * Toggle the display of the collapsible.
   */
  toggle() {
    this.element.style.maxHeight = this.element.style.maxHeight
      ? ''
      : this.element.scrollHeight.toString() + 'px';
  }

  /**
   * If currently visible, update the height to the height currently needed.
   * NOTE: Expanding the element involves calculating the current scroll height,
   * which is a very expensive operation. Don't perform it repeatedly in
   * performance-sensitive applications.
   */
  updateHeight() {
    if (!this.element.style.maxHeight) {
      // This element is currently collapsed, so we keep the height at zero.
      return;
    }
    this.element.style.maxHeight = this.element.scrollHeight.toString() + 'px';
  }

  /**
   * @param collapse - The element that should toggle the display of this
   * element when clicked.
   */
  addEventListener(collapse: HTMLElement): void {
    collapse.addEventListener('click', this.toggle.bind(this));
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
 */
export function addEventListenersForSiblings(toggleUponLoad = false) {
  document
    .querySelectorAll<HTMLElement>(`.${CLS.COLLAPSE}`)
    .forEach((collapse: HTMLElement): void => {
      const collapsible = new Collapsible(
        collapse.nextElementSibling as HTMLElement
      );
      collapsible.addEventListener(collapse);
      if (toggleUponLoad) {
        collapsible.toggle();
      }
    });
}
