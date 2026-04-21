/** Package dropdown defines logic for droppables.
 * NOTE: The terms ‘droppable’ and ‘tooltip’ are used interchangeably.
 * Hover-invoked tooltips are handled entirely in CSS.
 * */
import * as browser from './browser.js';
import * as str from './str.js';

type Invocation = 'hover' | 'click';
type Position = 'above' | 'below';

export enum CLS {
  /* DROPPABLE is the class of drop-down content. */
  DROPPABLE = 'droppable',
  /* DROP is the class of elements that, when clicked, toggle the display of
   * their associated droppable. */
  DROP = 'drop',
  /* DROPDOWN is the class of elements that, when hovered over, show their
   * associated droppable. */
  DROPDOWN = 'dropdown',
  /* ABOVE is the class for droppables that render above the element. */
  ABOVE = 'above',
  /* SHOW is the class to display a click-invoked droppable. */
  SHOW = 'show',
}

/**
 * Droppable represents a click-invoked droppable.
 * NOTE: This is irrelevant for hover-invoked droppables.
 */
class Droppable {
  /**
   * @param droppable - The element holding our drop-down content.
   * @param parent
   */
  public constructor(
    private readonly droppable: HTMLElement,
    parent: HTMLElement
  ) {
    this.addEventListeners(parent);
  }

  /**
   *
   * @param parent
   */
  private addEventListeners(parent: HTMLElement): void {
    // Prevent clicks on the content from hiding it.
    this.droppable.addEventListener('click', browser.stopPropagation);

    // A click on the .drop element toggles the content.
    parent.addEventListener('click', (e: MouseEvent) => {
      this.toggle();
      e.stopPropagation();
    });

    // A click anywhere outside the .droppable AND the parent hides it.
    document.addEventListener('click', (event: MouseEvent) => {
      if (!this.droppable.contains(event.target as Node)) {
        this.hide();
      }
    });
  }

  /**
   * @returns
   */
  private visible(): boolean {
    return this.droppable.classList.contains(CLS.SHOW);
  }

  /**
   * @param visible
   */
  private set(visible: boolean): void {
    this.droppable.classList.toggle(CLS.SHOW, visible);
  }

  /**
   *
   */
  private toggle(): void {
    this.set(!this.visible());
  }

  /**
   */
  private hide(): void {
    this.set(false);
  }
}

/**
 * Add event listeners for click-invoked tooltips in the page.
 * Hover-invoked tooltips don't require any JavaScript, as the implementation is
 * completely done in CSS.
 * The HTML must define elements with the correct classes and correct
 * structure.
 *
 * @param root
 * @returns List of Droppable objects (empty for hover).
 */
export function addEventListeners(root: HTMLElement = document.body): void {
  for (const parent of root.querySelectorAll<HTMLElement>(`.${CLS.DROP}`)) {
    for (const tooltip of parent.querySelectorAll<HTMLElement>(
      `.${CLS.DROPPABLE}`
    )) {
      new Droppable(tooltip, parent);
    }
  }
}

/**
 * Add the given content as a hover-droppable child of the given drop.
 * NOTE: This merely constructs the elements, and does NOT add event listeners
 * necessary for the element to function properly. You need to do that
 * separately.
 *
 * @param parent - An element that, when hovered or clicked, should display
 * the content.
 * @param content - The content that shows when the drop element is hovered.
 * @param invocation
 * @param position - Whether to render 'above' or 'below'.
 */
export function addDroppable(
  parent: Element,
  content: (Node | string)[],
  invocation: Invocation = 'hover',
  position: Position = 'below'
): void {
  const droppable: HTMLElement = ((): HTMLElement => {
    if (content.length === 1 && content[0] instanceof HTMLElement) {
      return content[0];
    }
    const container: HTMLSpanElement = document.createElement('span');
    container.append(...content);
    return container;
  })();

  parent.classList.add(invocation === 'hover' ? CLS.DROPDOWN : CLS.DROP);
  droppable.classList.add(CLS.DROPPABLE);

  // Apply the specific class if this is an upward droppable
  if (position === 'above') {
    droppable.classList.add(CLS.ABOVE);
  }

  parent.appendChild(droppable);
}

/**
 * @param node
 * @returns
 */
export function noTipTextContent(node: Node): string {
  return str.textContent(node, { [CLS.DROPPABLE]: '' });
}
