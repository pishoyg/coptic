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
 * NOTE: This must be used with corresponding classes defined in the CSS. See
 * below and see the CSS for more details.
 */
class Collapsible {
  collapsible;
  collapse;
  observer;
  /**
   *
   * @param collapsible
   * @param collapse
   */
  constructor(collapsible, collapse) {
    this.collapsible = collapsible;
    this.collapse = collapse;
    // A click on the collapse element toggles the collapsible.
    this.collapse.addEventListener('click', this.toggle.bind(this));
    // Create an observer to adjust the height whenever needed, e.g. due to
    // gaining or losing children, or perhaps due to zooming.
    this.observer = new ResizeObserver(() => {
      if (!this.visible()) {
        return;
      }
      this.collapsible.style.maxHeight = this.scrollHeight();
    });
    this.observer.observe(this.collapsible);
  }
  /**
   * @returns
   */
  scrollHeight() {
    return `${this.collapsible.scrollHeight}px`;
  }
  /**
   * Disconnects the observer to prevent memory leaks when the element is
   * removed from the DOM.
   * As of now, we don't add or remove any collapsible elements from the DOM, so
   * this method doesn't need to be called anywhere.
   */
  disconnectObserver() {
    this.observer.disconnect();
  }
  /**
   * @returns
   */
  visible() {
    return !!this.collapsible.style.maxHeight;
  }
  /**
   * Toggle the display of the collapsible.
   *
   * Toggles happen manually, so there is no need to worry about race
   * conditions.
   */
  toggle() {
    this.collapse.classList.toggle('is-open' /* CLS.IS_OPEN */);
    const maxHeight = this.visible() ? '' : this.scrollHeight();
    // Adjusting the height happens in two occasions:
    // - When the element visibility is toggled.
    // - When the element size changes (this is invoked by the observer).
    // If the element is being made invisible, its overflow should be hidden.
    // However, for visible elements, overflow should be visible. A collapsible
    // could have, for example, tooltip children, which render outside of its
    // borders. So it's important for overflow to be normally visible, in order
    // for such tooltips to render properly.
    // However, when the element gains new content, we want the overflow to
    // continue to be hidden until the height transition completes, otherwise
    // the overflow will show while the height is still adjusting.
    // We always hide overflow, adjust the height, then show overflow.
    this.collapsible.style.overflow = 'hidden';
    // Adjust the maximum height:
    this.collapsible.style.maxHeight = maxHeight;
    if (!this.visible()) {
      // The overflow property doesn't need to change.
      return;
    }
    // If we are opening the element...
    const handleTransitionEnd = () => {
      if (this.visible()) {
        // Set overflow to visible once the expansion is complete.
        this.collapsible.style.overflow = 'visible';
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
