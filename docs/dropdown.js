/** Package dropdown defines logic to control drop-down elements. */
import * as browser from './browser.js';
/**
 *
 */
export class Dropdown {
  dropdown;
  dropdownContent;
  /**
   *
   * @param dropdown
   * @param dropdownContent
   */
  constructor(dropdown, dropdownContent) {
    this.dropdown = dropdown;
    this.dropdownContent = dropdownContent;
    // A click on the drop-down element shows the content.
    this.dropdown.addEventListener('click', this.toggle.bind(this));
    // Prevent clicks on checkboxes in the list from hiding it.
    dropdownContent.querySelectorAll('label').forEach((el) => {
      el.addEventListener('click', browser.stopPropagation.bind(browser));
    });
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
