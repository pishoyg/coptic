/** Package dropdown defines logic to control drop-down elements. */
import * as browser from './browser.js';
import * as logger from './logger.js';
export var CLS;
(function (CLS) {
  CLS['DROP'] = 'drop';
  CLS['DROPPABLE'] = 'droppable';
})(CLS || (CLS = {}));
/**
 *
 */
export class Droppable {
  droppable;
  drop;
  /**
   * @param droppable - The element holding our drop-down content.
   * @param drop
   */
  constructor(droppable, drop) {
    this.droppable = droppable;
    this.drop = drop;
    // Prevent clicks on the content from hiding it.
    this.droppable.addEventListener(
      'click',
      browser.stopPropagation.bind(browser)
    );
    // A click on the .drop element hides the content.
    drop?.addEventListener('click', (e) => {
      this.toggle();
      e.stopPropagation();
    });
    // A click anywhere outside the element hides it.
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
