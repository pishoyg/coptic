/** Package dropdown defines logic to control drop-down elements. */
import * as browser from './browser.js';
var CLS;
(function (CLS) {
  CLS['DROPDOWN'] = 'dropdown';
  CLS['DROPDOWN_CONTENT'] = 'dropdown-content';
})(CLS || (CLS = {}));
/**
 *
 */
export class Dropdown {
  dropdown;
  /** dropdownContent gets shown or hidden by clicking the button. */
  dropdownContent;
  /**
   * @param dropdown - An element that contains both our drop-down button and
   * our drop-down content.
   */
  constructor(dropdown) {
    this.dropdown = dropdown;
    // The content element is expected to be found inside the drop-down element,
    // and to bear the dropdown-content class.
    this.dropdownContent = this.dropdown.querySelector(
      `.${CLS.DROPDOWN_CONTENT}`
    );
    // A click on the drop-down element shows the content.
    this.dropdown.addEventListener('click', this.toggle.bind(this));
    // Prevent clicks on the content from hiding it.
    this.dropdownContent.addEventListener(
      'click',
      browser.stopPropagation.bind(browser)
    );
    // A click anywhere outside the element hides the content.
    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target)) {
        this.hide();
      }
    });
  }
  /**
   * @returns
   */
  get() {
    return this.dropdownContent.style.display;
  }
  /**
   * @param visibility
   */
  set(visibility) {
    this.dropdownContent.style.display = visibility;
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
export function addEventListeners() {
  return Array.from(document.querySelectorAll(`.${CLS.DROPDOWN}`)).map(
    (dropdown) => new Dropdown(dropdown)
  );
}
