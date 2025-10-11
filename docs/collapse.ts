/** Package collapse defines logic to control collapsible elements. */
import * as log from './logger.js';

const enum CLS {
  // COLLAPSE is the class of elements that, when clicked, trigger a collapse
  // effect in their next element sibling.
  COLLAPSE = 'collapse',
  // COLLAPSIBLE is the class of elements that collapse and expand.
  COLLAPSIBLE = 'collapsible',
  IS_OPEN = 'is-open',
}

/**
 * Collapsible represents an element that can collapse, becoming visible /
 * invisible as needed.
 */
class Collapsible {
  /**
   *
   * @param collapsible
   * @param collapse
   */
  public constructor(
    private readonly collapsible: HTMLElement,
    private readonly collapse: HTMLElement
  ) {
    this.collapse.addEventListener('click', this.toggle.bind(this));
  }

  /**
   * @returns
   */
  private visible(): boolean {
    return this.collapse.classList.contains(CLS.IS_OPEN);
  }

  /**
   *
   * @param overflow
   */
  private setOverflow(overflow: 'hidden' | 'visible'): void {
    // We must set the overflow property of the collapsible and all direct
    // children.
    // See the CSS for details.
    [
      this.collapsible,
      ...this.collapsible.querySelectorAll<HTMLElement>('*'),
    ].forEach((element: HTMLElement): void => {
      element.style.overflow = overflow;
    });
  }

  /**
   *
   */
  public toggle(): void {
    // Toggle classes. CSS takes care of resizing.
    this.collapse.classList.toggle(CLS.IS_OPEN);
    this.collapsible.classList.toggle(CLS.IS_OPEN);
    // We need to adjust overflow in TypeScript.
    // The reason we can't have hidden overflow is that they hide tooltips,
    // which normally render outside the collapsible.
    // During the transition, the overflow is always hidden.
    this.setOverflow('hidden');
    if (!this.visible()) {
      // The overflow property doesn't need to change.
      return;
    }

    // If we are opening the element, we make overflow visible, but we do this
    // when the transition completes. Otherwise, the overflow might show before
    // the element is fully visible.
    const handleTransitionEnd = (): void => {
      if (this.visible()) {
        // Set overflow to visible once the expansion is complete.
        this.setOverflow('visible');
      }
      // Remove the event listener to prevent it from firing on subsequent
      // transitions (e.g., from the ResizeObserver).
      this.collapsible.removeEventListener(
        'transitionend',
        handleTransitionEnd
      );
    };

    // Listen for the transition to finish.
    this.collapsible.addEventListener('transitionend', handleTransitionEnd);
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
