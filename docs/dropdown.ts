/** Package dropdown defines logic to control drop-down elements. */
import * as browser from './browser.js';
import * as logger from './logger.js';

type Visibility = 'block' | 'none';

export enum CLS {
  DROP = 'drop',
  DROPPABLE = 'droppable',
}

/**
 *
 */
export class Droppable {
  /**
   * @param droppable - The element holding our drop-down content.
   * @param drop
   */
  constructor(
    private readonly droppable: HTMLElement,
    readonly drop?: HTMLElement
  ) {
    // Prevent clicks on the content from hiding it.
    this.droppable.addEventListener(
      'click',
      browser.stopPropagation.bind(browser)
    );
    // A click on the .drop element hides the content.
    drop?.addEventListener('click', (e: MouseEvent) => {
      this.toggle();
      e.stopPropagation();
    });
    // A click anywhere outside the element hides it.
    document.addEventListener('click', (event: MouseEvent) => {
      if (!this.droppable.contains(event.target as Node)) {
        this.hide();
      }
    });
  }

  /**
   * @returns
   */
  get(): Visibility {
    return this.droppable.style.display as Visibility;
  }

  /**
   * @param visibility
   */
  set(visibility: Visibility): void {
    this.droppable.style.display = visibility;
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
export function addEventListenersForSiblings(): Droppable[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`.${CLS.DROP}`)).map(
    (drop: HTMLElement): Droppable => {
      const droppable = drop.nextElementSibling as HTMLElement;
      logger.err(
        droppable.classList.contains(CLS.DROPPABLE),
        'A .drop must be immediately followed by a .droppable!'
      );
      return new Droppable(droppable, drop);
    }
  );
}
