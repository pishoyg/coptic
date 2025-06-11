/** Package dropdown defines logic to control drop-down elements. */
import * as browser from './browser.js';

type Visibility = 'block' | 'none';

enum CLS {
  DROPDOWN = 'dropdown',
  DROPDOWN_CONTENT = 'dropdown-content',
}

/**
 *
 */
export class Dropdown {
  /** dropdownContent gets shown or hidden by clicking the button. */
  private readonly dropdownContent: HTMLElement;

  /**
   * @param dropdown - An element that contains both our drop-down button and
   * our drop-down content.
   */
  constructor(private readonly dropdown: HTMLElement) {
    // The content element is expected to be found inside the drop-down element,
    // and to bear the dropdown-content class.
    this.dropdownContent = this.dropdown.querySelector(
      `.${CLS.DROPDOWN_CONTENT}`
    )!;

    // A click on the drop-down element shows the content.
    this.dropdown.addEventListener('click', this.toggle.bind(this));

    // Prevent clicks on the content from hiding it.
    this.dropdownContent.addEventListener(
      'click',
      browser.stopPropagation.bind(browser)
    );

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

/**
 * Search for drop-down elements in the page, and initialize them.
 * The HTML must define elements with the correct classes and correct structure.
 * @returns
 */
export function addEventListeners(): Dropdown[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`.${CLS.DROPDOWN}`)
  ).map((dropdown: HTMLElement): Dropdown => new Dropdown(dropdown));
}
