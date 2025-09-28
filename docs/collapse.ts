/** Package collapse defines logic to control collapsible elements. */
import * as log from './logger.js';

enum CLS {
  // COLLAPSE is the class of elements that, when clicked, trigger a collapse
  // effect in their next element sibling.
  COLLAPSE = 'collapse',
  // COLLAPSIBLE is the class of elements that collapse and expand.
  COLLAPSIBLE = 'collapsible',
  // COLLAPSE_ARROW is the class of the optional arrow in the collapse element.
  COLLAPSE_ARROW = 'collapse-arrow',
}

const COLLAPSISBLE_TRANSITION_MS = 500;
const COLLAPSISBLE_TRANSITION_WAIT = 0.65;

/**
 * Collapsible represents an element that can collapse, becoming visible /
 * invisible as needed.
 * NOTE: This must be used with corresponding classes defined in the CSS. See
 * below and see the CSS for more details.
 */
export class Collapsible {
  private arrow?: HTMLSpanElement | undefined;

  /**
   * @param collapsible - The collapsible HTML element.
   * @param collapse
   */
  public constructor(
    private readonly collapsible: HTMLElement,
    collapse?: HTMLElement
  ) {
    // A click on the collapse element toggles the collapsible.
    collapse?.addEventListener('click', this.toggle.bind(this));

    this.arrow =
      collapse?.querySelector<HTMLSpanElement>(`.${CLS.COLLAPSE_ARROW}`) ??
      undefined;
    // Update arrow once upon load.
    this.updateArrow();
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
  public toggle(): void {
    const visible = !!this.get();
    this.set(visible ? '' : this.scrollHeight());
    if (visible) {
      // The element is visible and about to get hidden. Update the arrow during
      // the transition.
      setTimeout(
        this.updateArrow.bind(this),
        COLLAPSISBLE_TRANSITION_MS * COLLAPSISBLE_TRANSITION_WAIT
      );
    } else {
      // The element is hidden and about to become visible. Update the arrow
      // immediately.
      this.updateArrow();
    }
  }

  /**
   * If currently visible, update the height to the height currently needed.
   * NOTE: Expanding the element involves calculating the current scroll height,
   * which is a very expensive operation. Don't perform it repeatedly in
   * performance-sensitive applications.
   */
  public adjustHeightIfVisible(): void {
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
 */
export function addEventListenersForSiblings(toggleUponLoad = false): void {
  document
    .querySelectorAll<HTMLElement>(`.${CLS.COLLAPSE}`)
    .forEach((collapse: HTMLElement): void => {
      const collapsible: HTMLElement =
        collapse.nextElementSibling as HTMLElement;
      log.ensure(
        collapsible.classList.contains(CLS.COLLAPSIBLE),
        'A .collapse must be followed by a .collapsible!'
      );
      const col = new Collapsible(collapsible, collapse);
      if (toggleUponLoad) {
        col.toggle();
      }
    });
}
