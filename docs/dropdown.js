/** Package dropdown defines logic for click-invoked droppables.
 * NOTE: The terms ‘droppable’ and ‘tooltip’ are used interchangeably.
 * */
import * as browser from './browser.js';
const OVERFLOW_MARGIN = 10;
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
  /* ALIGN_RIGHT is the class of a right-aligned tooltip. (Tips are, by default,
   * left-aligned.)
   */
  CLS['ALIGN_RIGHT'] = 'align-right';
})(CLS || (CLS = {}));
/**
 *
 */
export class Droppable {
  droppable;
  /**
   * @param droppable - The element holding our drop-down content.
   * @param parent
   * @param invocation
   */
  constructor(droppable, parent, invocation) {
    this.droppable = droppable;
    this.addEventListeners(parent, invocation);
  }
  /**
   *
   * @param parent
   * @param invocation
   */
  addEventListeners(parent, invocation) {
    if (invocation === 'hover') {
      // This is a hover-invoked tooltip. We just need a listener for
      // realignment.
      parent.addEventListener('mouseenter', this.realign.bind(this));
      parent.addEventListener('mouseleave', this.resetAlignment.bind(this));
      return;
    }
    // This is a click-invoked tooltip.
    // Prevent clicks on the content from hiding it.
    this.droppable.addEventListener(
      'click',
      browser.stopPropagation.bind(browser)
    );
    // A click on the .drop element hides the content.
    parent.addEventListener('click', (e) => {
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
    if (visibility === 'block') {
      this.realign();
    } else {
      this.resetAlignment();
    }
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
  /**
   */
  realign() {
    // Reset the transform property.
    const rect = this.droppable.getBoundingClientRect();
    const overflow = rect.right - window.innerWidth;
    if (overflow > -OVERFLOW_MARGIN) {
      // This element overflows outside the right edge of the screen. Change
      // its alignment.
      this.droppable.style.transform = `translateX(-${overflow + OVERFLOW_MARGIN}px)`;
    }
  }
  /**
   *
   */
  resetAlignment() {
    this.droppable.style.transform = '';
  }
}
/**
 * Add event listeners for click- or hover-invoked tooltips in the page.
 * The HTML must define elements with the correct classes and correct structure.
 * @param invocation
 * @returns List of Droppable objects.
 */
export function addEventListeners(invocation) {
  return Array.from(
    document.querySelectorAll(
      `.${invocation === 'click' ? CLS.DROP : CLS.DROPDOWN}`
    )
  ).map(
    (parent) =>
      new Droppable(
        parent.querySelector(`.${CLS.DROPPABLE}`),
        parent,
        invocation
      )
  );
}
/**
 * Add the given content as a hover-droppable child of the given drop.
 * @param dropdown - An element that, when hovered, should display the content.
 * @param content - The content that shows when the drop element is hovered.
 */
export function addHoverDroppable(dropdown, ...content) {
  dropdown.classList.add(CLS.DROPDOWN);
  const droppable = document.createElement('span');
  droppable.classList.add(CLS.DROPPABLE);
  droppable.append(...content);
  // A hover-invoked droppable must be a child of its associated drop element.
  dropdown.appendChild(droppable);
}
