/** Package collapse defines logic to control collapsible elements. */
import * as log from './logger.js';
var CLS;
(function (CLS) {
  // COLLAPSE is the class of elements that, when clicked, trigger a collapse
  // effect in their next element sibling.
  CLS['COLLAPSE'] = 'collapse';
  // COLLAPSIBLE is the class of elements that collapse and expand.
  CLS['COLLAPSIBLE'] = 'collapsible';
  CLS['IS_OPEN'] = 'is-open';
})(CLS || (CLS = {}));
/**
 * Collapsible represents an element that can collapse, becoming visible /
 * invisible as needed.
 */
class Collapsible {
  collapsible;
  collapse;
  /**
   *
   * @param collapsible
   * @param collapse
   */
  constructor(collapsible, collapse) {
    this.collapsible = collapsible;
    this.collapse = collapse;
    this.collapse.addEventListener('click', this.toggle.bind(this));
  }
  /**
   * @returns
   */
  visible() {
    return this.collapse.classList.contains('is-open' /* CLS.IS_OPEN */);
  }
  /**
   *
   * @param overflow
   */
  setOverflow(overflow) {
    // We must set the overflow property of the collapsible and all direct
    // children.
    // See the CSS for details.
    [this.collapsible, ...this.collapsible.querySelectorAll('*')].forEach(
      (element) => {
        element.style.overflow = overflow;
      }
    );
  }
  /**
   *
   */
  toggle() {
    // Toggle classes. CSS takes care of resizing.
    this.collapse.classList.toggle('is-open' /* CLS.IS_OPEN */);
    this.collapsible.classList.toggle('is-open' /* CLS.IS_OPEN */);
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
    const handleTransitionEnd = () => {
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
export function addEventListenersForSiblings(toggleUponLoad = false) {
  document
    .querySelectorAll(`.${'collapse' /* CLS.COLLAPSE */}`)
    .forEach((collapse) => {
      const collapsible = collapse.nextElementSibling;
      log.ensure(
        collapsible.classList.contains('collapsible' /* CLS.COLLAPSIBLE */),
        'A .collapse must be followed by a .collapsible!'
      );
      const col = new Collapsible(collapsible, collapse);
      if (toggleUponLoad) {
        col.toggle();
      }
    });
}
