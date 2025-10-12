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
      return;
    }
    // This is a click-invoked tooltip.
    // Prevent clicks on the content from hiding it.
    this.droppable.addEventListener('click', browser.stopPropagation);
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
    if (visibility === 'none') {
      return;
    }
    this.realign();
  }
  /**
   *
   */
  toggle() {
    this.set(this.get() === 'block' ? 'none' : 'block');
  }
  /**
   */
  hide() {
    this.set('none');
  }
  /**
   * Realigns the droppable element to stay within the viewport.
   * TODO: (#241) Implement alignment using CSS.
   */
  realign() {
    // Reset the transform property to get accurate measurements.
    this.droppable.style.transform = '';
    const rect = this.droppable.getBoundingClientRect();
    const overflow = rect.right - document.documentElement.clientWidth;
    if (overflow > -OVERFLOW_MARGIN) {
      // This element overflows the right edge of the screen.
      // Translate it leftward to bring it back into view.
      this.droppable.style.transform = `translateX(-${overflow + OVERFLOW_MARGIN}px)`;
    }
  }
}
/**
 * Add event listeners for click- or hover-invoked tooltips in the page.
 * The HTML must define elements with the correct classes and correct structure.
 * @param invocation
 * @param root
 * @returns List of Droppable objects.
 */
export function addEventListeners(invocation, root = document.body) {
  return Array.from(
    root.querySelectorAll(
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
 * NOTE: This merely constructs the elements, and does NOT add event listeners
 * necessary for the element to function properly. You need to do that
 * separately.
 *
 * @param dropdown - An element that, when hovered, should display the content.
 * @param invocation
 * @param content - The content that shows when the drop element is hovered.
 */
export function addDroppable(dropdown, invocation, ...content) {
  const droppable = (() => {
    if (content.length === 1 && content[0] instanceof HTMLElement) {
      return content[0];
    }
    const container = document.createElement('span');
    container.append(...content);
    return container;
  })();
  dropdown.classList.add(invocation === 'hover' ? CLS.DROPDOWN : CLS.DROP);
  droppable.classList.add(CLS.DROPPABLE);
  // A hover-invoked droppable must be a child of its associated drop element.
  dropdown.appendChild(droppable);
}
/**
 * @param node
 * @returns
 */
export function noTipTextContent(node) {
  return [...noTipTextContentAux(node)].join('');
}
/**
 * @param node
 * @returns
 */
function* noTipTextContentAux(node) {
  // If the node is a text node and has content, yield it.
  if (node.nodeType === Node.TEXT_NODE && node.textContent) {
    yield node.textContent;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    // This is a non-text and a non-element node. It may be some other type,
    // such as a comment. Return immediately.
    return;
  }
  // This is an element node.
  if (node.classList.contains(CLS.DROPPABLE)) {
    // This node is a tooltip.
    return;
  }
  for (const child of node.childNodes) {
    yield* noTipTextContentAux(child);
  }
}
