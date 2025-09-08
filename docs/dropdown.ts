/** Package dropdown defines logic for click-invoked droppables. */
import * as browser from './browser.js';
import * as logger from './logger.js';

type Visibility = 'block' | 'none';

export enum CLS {
  /* DROPPABLE is the class of drop-down content. */
  DROPPABLE = 'droppable',
  /* DROP is the class of elements that, when clicked, toggle the display of
   * their associated droppable. */
  DROP = 'drop',
  /* DROPDOWN is the class of elements that, when hovered over, show their
   * associated droppable.
   * NOTE: This package only concerns itself with click-invoked, not
   * hover-invoked, drop-downs. But we include the class for completion in case
   * it's needed externally. */
  DROPDOWN = 'dropdown',
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
    drop: HTMLElement
  ) {
    // Prevent clicks on the content from hiding it.
    this.droppable.addEventListener(
      'click',
      browser.stopPropagation.bind(browser)
    );
    // A click on the .drop element hides the content.
    drop.addEventListener('click', (e: MouseEvent) => {
      this.toggle();
      e.stopPropagation();
    });
    // A click anywhere outside the .droppable element hides it.
    // We should also exclude clicks on the .drop element, since those toggle
    // rather than hide. But we already stop propagation of events on the .drop
    // element, so we don't need to check for it.
    document.addEventListener('click', (event: MouseEvent) => {
      if (!this.droppable.contains(event.target as Node)) {
        this.hide();
      }
    });
  }

  /**
   * @returns
   */
  private get(): Visibility {
    return this.droppable.style.display as Visibility;
  }

  /**
   * @param visibility
   */
  private set(visibility: Visibility): void {
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
      logger.ensure(
        droppable.classList.contains(CLS.DROPPABLE),
        'A .drop must be immediately followed by a .droppable!'
      );
      return new Droppable(droppable, drop);
    }
  );
}

/**
 * Add the given content as a hover-droppable child of the given drop.
 * @param drop - An element that, when hovered, should display the content.
 * @param content - The content that shows when the drop element is hovered.
 */
export function addHoverDroppable(
  drop: Element,
  ...content: (Node | string)[]
): void {
  drop.classList.add(CLS.DROPDOWN);
  const droppable = document.createElement('span');
  droppable.classList.add(CLS.DROPPABLE);
  droppable.append(...content);
  // A hover-invoked droppable must be a child of its associated drop element.
  drop.appendChild(droppable);
}
