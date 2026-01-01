/** Package dropdown defines logic for click-invoked droppables.
 * NOTE: The terms ‘droppable’ and ‘tooltip’ are used interchangeably.
 * */
import * as browser from './browser.js';
import * as log from './logger.js';
import * as str from './str.js';

type Visibility = 'block' | 'none';
type Invocation = 'hover' | 'click';
// New type to handle direction
type Position = 'above' | 'below';

const OVERFLOW_MARGIN = 10;

export enum CLS {
  /* DROPPABLE is the class of drop-down content. */
  DROPPABLE = 'droppable',
  /* DROP is the class of elements that, when clicked, toggle the display of
   * their associated droppable. */
  DROP = 'drop',
  /* DROPDOWN is the class of elements that, when hovered over, show their
   * associated droppable. */
  DROPDOWN = 'dropdown',
  /* ALIGN_RIGHT is the class of a right-aligned tooltip. (Tips are, by default,
   * left-aligned.) */
  ALIGN_RIGHT = 'align-right',
  /* ABOVE is the class for droppables that render above the element. */
  ABOVE = 'above',
}

/**
 *
 */
export class Droppable {
  /**
   * @param droppable - The element holding our drop-down content.
   * @param parent
   * @param invocation
   */
  public constructor(
    private readonly droppable: HTMLElement,
    parent: HTMLElement,
    invocation: Invocation
  ) {
    this.addEventListeners(parent, invocation);
  }

  /**
   *
   * @param parent
   * @param invocation
   */
  private addEventListeners(parent: HTMLElement, invocation: Invocation): void {
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
    parent.addEventListener('click', (e: MouseEvent) => {
      this.toggle();
      e.stopPropagation();
    });
    // A click anywhere outside the .droppable element hides it.
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
    if (visibility === 'none') {
      return;
    }
    this.realign();
  }

  /**
   *
   */
  private toggle(): void {
    this.set(this.get() === 'block' ? 'none' : 'block');
  }

  /**
   */
  private hide(): void {
    this.set('none');
  }

  /**
   * Realigns the droppable element to stay within the viewport.
   * NOTE: This only calculates X-axis overflow.
   */
  private realign(): void {
    // Reset the transform property to get accurate measurements.
    this.droppable.style.transform = '';

    const rect: DOMRect = this.droppable.getBoundingClientRect();
    const overflow: number = rect.right - document.documentElement.clientWidth;

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
export function addEventListeners(
  invocation: Invocation,
  root: HTMLElement = document.body
): Droppable[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      `.${invocation === 'click' ? CLS.DROP : CLS.DROPDOWN}`
    )
  ).map(
    (parent: HTMLElement): Droppable =>
      new Droppable(
        parent.querySelector(`.${CLS.DROPPABLE}`)!,
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
 * @param content - The content that shows when the drop element is hovered.
 * @param invocation
 * @param position - Whether to render 'above' or 'below'.
 */
export function addDroppable(
  dropdown: Element,
  content: (Node | string)[],
  invocation: Invocation = 'hover',
  position: Position = 'below'
): void {
  if (position === 'above' && invocation === 'click') {
    log.fatal(
      'Click-invoked tooltips can only render below their parent element! See the CSS!'
    );
  }
  const droppable: HTMLElement = ((): HTMLElement => {
    if (content.length === 1 && content[0] instanceof HTMLElement) {
      return content[0];
    }
    const container: HTMLSpanElement = document.createElement('span');
    container.append(...content);
    return container;
  })();

  dropdown.classList.add(invocation === 'hover' ? CLS.DROPDOWN : CLS.DROP);
  droppable.classList.add(CLS.DROPPABLE);

  // Apply the specific class if this is an upward droppable
  if (position === 'above') {
    droppable.classList.add(CLS.ABOVE);
  }

  // A hover-invoked droppable must be a child of its associated drop element.
  dropdown.appendChild(droppable);
}

/**
 * @param node
 * @returns
 */
export function noTipTextContent(node: Node): string {
  return str.textContent(node, { [CLS.DROPPABLE]: '' });
}
