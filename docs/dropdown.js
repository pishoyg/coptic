/** Package dropdown defines logic for click-invoked droppables. */
import * as browser from './browser.js';
import * as logger from './logger.js';
export var CLS;
(function (CLS) {
  /* DROPPABLE is the class of drop-down content. */
  CLS['DROPPABLE'] = 'droppable';
  /* DROP is the class of elements that, when clicked, toggle the display of
   * their associated droppable. */
  CLS['DROP'] = 'drop';
  /* DROPDOWN is the class of elements that, when hovered over, show their
   * associated droppable.
   * NOTE: This package only concerns itself with click-invoked, not
   * hover-invoked, drop-downs. But we include the class for completion in case
   * it's needed externally. */
  CLS['DROPDOWN'] = 'dropdown';
})(CLS || (CLS = {}));
/**
 *
 */
export class Droppable {
  droppable;
  /**
   * @param droppable - The element holding our drop-down content.
   * @param drop
   */
  constructor(droppable, drop) {
    this.droppable = droppable;
    // Prevent clicks on the content from hiding it.
    this.droppable.addEventListener(
      'click',
      browser.stopPropagation.bind(browser)
    );
    // A click on the .drop element hides the content.
    drop.addEventListener('click', (e) => {
      this.toggle();
      e.stopPropagation();
    });
    // A click anywhere outside the .droppable element hides it.
    // We should also exclude clicks on the .drop element, since those toggle
    // rather than hide. But we already stop propagation of events on the .drop
    // element, so we don't need to check for it.
    document.addEventListener('click', (event) => {
      if (!this.droppable.contains(event.target)) {
        this.hide();
      }
    });
  }
  /**
   * @returns
   */
  get() {
    return this.droppable.style.display;
  }
  /**
   * @param visibility
   */
  set(visibility) {
    this.droppable.style.display = visibility;
  }
  /**
   *
   */
  toggle() {
    this.set(this.get() === 'block' ? 'none' : 'block');
  }
  /**
   */
  show() {
    this.set('block');
  }
  /**
   */
  hide() {
    this.set('none');
  }
}
/**
 * Search for drop-down elements in the page, and initialize them.
 * The HTML must define elements with the correct classes and correct structure.
 * @returns
 */
export function addEventListenersForSiblings() {
  return Array.from(document.querySelectorAll(`.${CLS.DROP}`)).map((drop) => {
    const droppable = drop.nextElementSibling;
    logger.err(
      droppable.classList.contains(CLS.DROPPABLE),
      'A .drop must be immediately followed by a .droppable!'
    );
    return new Droppable(droppable, drop);
  });
}
