/** Package tooltip defines logic for tooltips.
 *
 * Tooltips are implemented as native popovers and live directly under
 * <body>, so they render in the top layer and — crucially — never pollute
 * their trigger's textContent. That keeps text-fragment URLs, copy-paste, and
 * screen-reader output aligned with what the user actually sees.
 * */

type Invocation = 'hover' | 'click';

export enum CLS {
  /* TOOLTIP is the class of tooltip content. */
  TOOLTIP = 'tooltip',
  /* TIPPER is the class of elements that, when hovered over, show their
   * associated tooltip. */
  TIPPER = 'tipper',
  /* MISER is the class of elements that, when clicked, toggle the display of
   * their associated tooltip. */
  MISER = 'miser',
}

/* Delay (ms) between mouseleave and hiding a hover-invoked tooltip, giving
 * the user time to move the cursor onto the popover itself. */
const HOVER_HIDE_DELAY_MS = 100;

let counter = 0;

/* Back-reference from a wired tooltip to its trigger. Used by
 * cleanupOrphans() to detect popovers whose triggers were removed from the
 * DOM (e.g. when a search-results table is cleared). The WeakMap key (the
 * tooltip) is held weakly, so entries clear themselves once the tooltip
 * is removed and GCed. */
const triggers = new WeakMap<HTMLElement, HTMLElement>();

/**
 * Reparent the tooltip to <body>, anchor it to its trigger via a unique
 * anchor name, mark it as a popover, and attach the right interaction
 * handlers.
 *
 * @param parent - The trigger element (carries .tipper or .miser).
 * @param tooltip - The element holding the tooltip content.
 * @param inv
 */
function wire(
  parent: HTMLElement,
  tooltip: HTMLElement,
  inv: Invocation
): void {
  const anchor = `--tooltip-${(++counter).toString()}`;
  parent.style.setProperty('anchor-name', anchor);
  tooltip.style.setProperty('position-anchor', anchor);

  /* `manual` for hover so we drive show/hide ourselves without the auto
   * popover stack closing siblings; `auto` for click so the browser handles
   * outside-click and Escape dismissal. */
  tooltip.setAttribute('popover', inv === 'hover' ? 'manual' : 'auto');
  document.body.appendChild(tooltip);
  triggers.set(tooltip, parent);

  if (inv === 'click') {
    /* `popover="auto"`'s light-dismiss closes the popover on pointerdown —
     * including pointerdown on the trigger itself — before our click handler
     * fires. We snapshot the open-state on pointerdown (i.e. before
     * light-dismiss runs) and use it to decide what to do in click; otherwise
     * a click on the trigger would close-then-reopen the popover. */
    let wasOpen = false;
    parent.addEventListener('pointerdown', (): void => {
      wasOpen = tooltip.matches(':popover-open');
    });
    parent.addEventListener('click', (e: MouseEvent): void => {
      if (wasOpen) {
        tooltip.hidePopover();
      } else {
        tooltip.showPopover();
      }
      e.stopPropagation();
    });
  } else {
    let timer: number | undefined;
    const show = (): void => {
      window.clearTimeout(timer);
      if (!tooltip.matches(':popover-open')) {
        tooltip.showPopover();
      }
    };
    const hide = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout((): void => {
        if (tooltip.matches(':popover-open')) {
          tooltip.hidePopover();
        }
      }, HOVER_HIDE_DELAY_MS);
    };
    parent.addEventListener('mouseenter', show);
    parent.addEventListener('mouseleave', hide);
    tooltip.addEventListener('mouseenter', show);
    tooltip.addEventListener('mouseleave', hide);
  }
}

/**
 * Build a tooltip for the given parent, append it to <body> as a popover,
 * anchor it to the parent via CSS anchor positioning, and attach the
 * configured show/hide handlers.
 *
 * NOTE: Wiring is eager — the popover is reparented to <body> and registered
 * in the orphan-tracking WeakMap synchronously, regardless of whether the
 * parent is connected to the document yet. Callers are free to wire tooltips
 * on detached subtrees, but they must connect the parent in the *same*
 * synchronous turn. If control yields (via `await` or otherwise) between
 * `addTooltip` and the moment the parent is connected, an interleaved
 * `cleanupOrphans()` call will see the parent as disconnected and wrongly
 * delete the freshly-wired popover.
 *
 * @param parent - An element that, when hovered or clicked, should display
 * the content.
 * @param content - The content that shows when the parent element is hovered.
 * @param classes
 * @param invocation
 */
export function addTooltip(
  parent: Element,
  content: (Node | string)[],
  classes: string[] = [],
  invocation: Invocation = 'hover'
): void {
  const tooltip: HTMLDivElement = document.createElement('div');
  tooltip.append(...content);

  tooltip.classList.add(CLS.TOOLTIP, ...classes);

  parent.classList.add(invocation === 'hover' ? CLS.TIPPER : CLS.MISER);

  wire(parent as HTMLElement, tooltip, invocation);
}

/**
 * Remove every wired tooltip whose trigger is no longer connected to the
 * DOM. Wired tooltips live under <body>, so they don't disappear when their
 * trigger's subtree is torn down (e.g. when a search-results table is
 * cleared); without this sweep they accumulate as orphans.
 */
export function cleanupOrphans(): void {
  document.body
    .querySelectorAll<HTMLElement>(`.${CLS.TOOLTIP}[popover]`)
    .forEach((tooltip: HTMLElement): void => {
      if (!triggers.get(tooltip)?.isConnected) {
        tooltip.remove();
      }
    });
}
