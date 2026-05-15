/** Package dropdown defines logic for droppables.
 * NOTE: The terms ‘droppable’ and ‘tooltip’ are used interchangeably.
 *
 * Droppables are implemented as native popovers and live directly under
 * <body>, so they render in the top layer and — crucially — never pollute
 * their trigger's textContent. That keeps text-fragment URLs, copy-paste, and
 * screen-reader output aligned with what the user actually sees.
 * */

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
}

/* Delay (ms) between mouseleave and hiding a hover-invoked droppable, giving
 * the user time to move the cursor onto the popover itself. */
const HOVER_HIDE_DELAY_MS = 100;

let counter = 0;

/* Back-reference from a wired droppable to its trigger. Used by
 * cleanupOrphans() to detect popovers whose triggers were removed from the
 * DOM (e.g. when a search-results table is cleared). The WeakMap key (the
 * droppable) is held weakly, so entries clear themselves once the droppable
 * is removed and GCed. */
const triggers = new WeakMap<HTMLElement, HTMLElement>();

/**
 * Reparent the droppable to <body>, anchor it to its trigger via a unique
 * anchor name, mark it as a popover, and attach the right interaction
 * handlers.
 *
 * @param parent - The trigger element (carries .drop or .dropdown).
 * @param droppable - The element holding the drop-down content.
 * @param inv
 */
function wire(
  parent: HTMLElement,
  droppable: HTMLElement,
  inv: Invocation
): void {
  const anchor = `--droppable-${(++counter).toString()}`;
  parent.style.setProperty('anchor-name', anchor);
  droppable.style.setProperty('position-anchor', anchor);

  /* `manual` for hover so we drive show/hide ourselves without the auto
   * popover stack closing siblings; `auto` for click so the browser handles
   * outside-click and Escape dismissal. */
  droppable.setAttribute('popover', inv === 'hover' ? 'manual' : 'auto');
  document.body.appendChild(droppable);
  triggers.set(droppable, parent);

  if (inv === 'click') {
    /* `popover="auto"`'s light-dismiss closes the popover on pointerdown —
     * including pointerdown on the trigger itself — before our click handler
     * fires. We snapshot the open-state on pointerdown (i.e. before
     * light-dismiss runs) and use it to decide what to do in click; otherwise
     * a click on the trigger would close-then-reopen the popover. */
    let wasOpen = false;
    parent.addEventListener('pointerdown', (): void => {
      wasOpen = droppable.matches(':popover-open');
    });
    parent.addEventListener('click', (e: MouseEvent): void => {
      if (wasOpen) {
        droppable.hidePopover();
      } else {
        droppable.showPopover();
      }
      e.stopPropagation();
    });
  } else {
    let timer: number | undefined;
    const show = (): void => {
      window.clearTimeout(timer);
      if (!droppable.matches(':popover-open')) {
        droppable.showPopover();
      }
    };
    const hide = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout((): void => {
        if (droppable.matches(':popover-open')) {
          droppable.hidePopover();
        }
      }, HOVER_HIDE_DELAY_MS);
    };
    parent.addEventListener('mouseenter', show);
    parent.addEventListener('mouseleave', hide);
    droppable.addEventListener('mouseenter', show);
    droppable.addEventListener('mouseleave', hide);
  }
}

/**
 * Build a droppable for the given parent, append it to <body> as a popover,
 * anchor it to the parent via CSS anchor positioning, and attach the
 * configured show/hide handlers.
 *
 * @param parent - An element that, when hovered or clicked, should display
 * the content.
 * @param content - The content that shows when the drop element is hovered.
 * @param classes
 * @param invocation
 * @param position - Whether to render 'above' or 'below'.
 */
export function addDroppable(
  parent: Element,
  content: (Node | string)[],
  classes: string[] = [],
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

  droppable.classList.add(CLS.DROPPABLE, ...classes);
  if (position === 'above') {
    droppable.classList.add(CLS.ABOVE);
  }

  parent.classList.add(invocation === 'hover' ? CLS.DROPDOWN : CLS.DROP);

  wire(parent as HTMLElement, droppable, invocation);
}

/**
 * Remove every wired droppable whose trigger is no longer connected to the
 * DOM. Wired droppables live under <body>, so they don't disappear when their
 * trigger's subtree is torn down (e.g. when a search-results table is
 * cleared); without this sweep they accumulate as orphans.
 */
export function cleanupOrphans(): void {
  document.body
    .querySelectorAll<HTMLElement>(`.${CLS.DROPPABLE}[popover]`)
    .forEach((droppable: HTMLElement): void => {
      if (!triggers.get(droppable)?.isConnected) {
        droppable.remove();
      }
    });
}
