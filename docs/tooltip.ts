/** Package tooltip defines logic for tooltips.
 *
 * Tooltips are implemented as native popovers. A tooltip lives under <body>
 * only while it shows, so it renders in the top layer and — crucially — never
 * pollutes its trigger's textContent. That keeps text-fragment URLs,
 * copy-paste, and screen-reader output aligned with what the user actually
 * sees.
 *
 * The rest of the time, the tooltip is detached from the document, and costs
 * it nothing. Keep it that way: a page of Wiki search results wires some 23k
 * tooltips, and when they all lived under <body>, Chrome took 10-15 seconds to
 * remove them on every new search whenever accessibility was enabled (#817).
 * Playwright's browsers run with accessibility disabled, so our tests wouldn't
 * catch a regression.
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

/* The tooltip of each trigger. The trigger is held weakly, so its entry goes
 * away with it, and the map needs no sweeping.
 *
 * Only offline consumers read the map: the Wiki dump
 * (`dictionary/marcion_sourceforge_net/wiki.ts`) and the tests. We keep it in
 * production anyway, since it costs a few milliseconds per 20k tooltips, and a
 * map that only exists in developer mode would make `tooltip` silently return
 * `undefined` for users. */
const tooltips = new WeakMap<Element, HTMLElement>();

export const ANCHOR_NAME = 'anchor-name';
export const POSITION_ANCHOR = 'position-anchor';

/**
 * @param trigger - An element passed to `addTooltip`.
 * @returns The trigger's tooltip, if it has one. Unless the tooltip shows, it
 * is detached from the document.
 */
export function tooltip(trigger: Element): HTMLElement | undefined {
  return tooltips.get(trigger);
}

/**
 * Tip shows and hides one tooltip, attaching it to <body> for as long as it
 * shows.
 */
class Tip {
  /* Watches for the trigger leaving the document while the tooltip shows. A
   * trigger removed from under the pointer (e.g. when a search-results table
   * is cleared) fires no `mouseleave`, so this is the only way to hide its
   * tooltip. Created by `prepare`, the first time the tooltip shows. */
  private observer: MutationObserver | undefined;

  /**
   * @param trigger - The trigger element (carries .tipper or .miser).
   * @param el - The element holding the tooltip content.
   * @param inv
   */
  public constructor(
    private readonly trigger: HTMLElement,
    private readonly el: HTMLElement,
    private readonly inv: Invocation
  ) {}

  /**
   * @returns Whether the tooltip shows.
   */
  public get open(): boolean {
    return this.el.matches(':popover-open');
  }

  /**
   * Attach the right interaction handlers.
   */
  public listen(): void {
    if (this.inv === 'click') {
      /* `popover="auto"`'s light-dismiss closes the popover on pointerdown —
       * including pointerdown on the trigger itself — before our click
       * handler fires. We snapshot the open-state on pointerdown (i.e. before
       * light-dismiss runs) and use it to decide what to do in click;
       * otherwise a click on the trigger would close-then-reopen the popover.
       */
      let wasOpen = false;
      this.trigger.addEventListener('pointerdown', (): void => {
        wasOpen = this.open;
      });
      this.trigger.addEventListener('click', (e: MouseEvent): void => {
        if (wasOpen) {
          this.hide();
        } else {
          this.show();
        }
        e.stopPropagation();
      });
      return;
    }

    let timer: number | undefined;
    const show = (): void => {
      window.clearTimeout(timer);
      this.show();
    };
    const hide = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout((): void => {
        this.hide();
      }, HOVER_HIDE_DELAY_MS);
    };
    this.trigger.addEventListener('mouseenter', show);
    this.trigger.addEventListener('mouseleave', hide);
    this.el.addEventListener('mouseenter', show);
    this.el.addEventListener('mouseleave', hide);
  }

  /**
   * Attach the tooltip to <body> if necessary, and show it.
   */
  public show(): void {
    // A tooltip fading out after its trigger left the document can still catch
    // the pointer. It must not show again with nothing to anchor to.
    if (this.open || !this.trigger.isConnected) {
      return;
    }
    this.observer ??= this.prepare();
    if (!this.el.isConnected) {
      document.body.append(this.el);
    }
    this.el.showPopover();
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Hide the tooltip. It detaches itself once it has faded out.
   */
  public hide(): void {
    if (this.open) {
      this.el.hidePopover();
    }
  }

  /**
   * Prepare the tooltip to show: anchor it to its trigger via a unique anchor
   * name, mark it as a popover, and create its observer. Done the first time
   * the tooltip shows, since most never do.
   *
   * @returns The tooltip's observer.
   */
  private prepare(): MutationObserver {
    const anchor = `--tooltip-${(++counter).toString()}`;
    this.trigger.style.setProperty(ANCHOR_NAME, anchor);
    this.el.style.setProperty(POSITION_ANCHOR, anchor);

    /* `manual` for hover so we drive show/hide ourselves without the auto
     * popover stack closing siblings; `auto` for click so the browser handles
     * outside-click and Escape dismissal. */
    this.el.setAttribute('popover', this.inv === 'hover' ? 'manual' : 'auto');

    const observer = new MutationObserver((): void => {
      if (!this.trigger.isConnected) {
        this.hide();
      }
    });

    /* However the tooltip hides (`hide`, or the light dismissal of an `auto`
     * popover), detach it. */
    this.el.addEventListener('toggle', (e: ToggleEvent): void => {
      if (e.newState === 'closed') {
        observer.disconnect();
        void this.detach();
      }
    });
    return observer;
  }

  /**
   * Detach the tooltip from the document, once its fade-out has finished.
   */
  private async detach(): Promise<void> {
    await Promise.allSettled(
      this.el.getAnimations().map((a: Animation) => a.finished)
    );
    // The tooltip may have been shown again during the fade-out.
    if (!this.open) {
      this.el.remove();
    }
  }
}

/**
 * Build a tooltip for the given parent, and attach the configured show/hide
 * handlers. The tooltip takes the content right away, but it only joins the
 * document (as a popover under <body>, anchored to the parent via CSS anchor
 * positioning) while it shows.
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
  const el: HTMLDivElement = document.createElement('div');
  el.append(...content);

  el.classList.add(CLS.TOOLTIP, ...classes);

  parent.classList.add(invocation === 'hover' ? CLS.TIPPER : CLS.MISER);

  const trigger = parent as HTMLElement;
  tooltips.set(trigger, el);
  new Tip(trigger, el, invocation).listen();
}
