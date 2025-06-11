/** Package dropdown defines logic to control drop-down elements. */
import * as browser from './browser.js';

type Visibility = 'block' | 'none';

/**
 *
 */
export class Dropdown {
  /**
   *
   * @param dropdown
   * @param dropdownContent
   */
  constructor(
    private readonly dropdown: HTMLElement,
    private readonly dropdownContent: HTMLElement
  ) {
    // A click on the drop-down element shows the content.
    this.dropdown.addEventListener('click', this.toggle.bind(this));

    // Prevent clicks on checkboxes in the list from hiding it.
    dropdownContent
      .querySelectorAll('label')
      .forEach((el: HTMLLabelElement) => {
        el.addEventListener('click', browser.stopPropagation.bind(browser));
      });

    // A click anywhere outside the element hides the content.
    document.addEventListener('click', (event: MouseEvent) => {
      if (!dropdown.contains(event.target as Node)) {
        this.hide();
      }
    });
  }

  /**
   * @returns
   */
  get(): Visibility {
    return this.dropdownContent.style.display as Visibility;
  }

  /**
   * @param visibility
   */
  set(visibility: Visibility): void {
    this.dropdownContent.style.display = visibility;
  }

  /**
   *
   */
  toggle(): void {
    this.set(this.get() === 'block' ? 'none' : 'block');
  }

  /**
   */
  show(): void {
    this.set('block');
  }

  /**
   */
  hide(): void {
    this.set('none');
  }
}
