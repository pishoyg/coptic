/** Package header defines the header logic. */
import * as paths from './paths.js';

export enum CLS {
  // TODO: (#203) Header cells should perhaps have IDs and not classes.

  /** RESET is the class of our reset buttons. */
  RESET = 'reset',

  /** DEVELOPER is the key of elements that toggle developer mode when
   * clicked. */
  DEVELOPER = 'developer',
}

/**
 * Names of events the header module dispatches on `document`. Each value
 * is the string used as the event type so consumers can subscribe with
 * `document.addEventListener(head.EVENT.X, …)`.
 *
 * Consumers gate their handlers however they see fit — e.g. RESET is
 * routed to whichever dictionary is currently in view by having each
 * listener check its own active-view predicate.
 *
 * Add new event types here as more shared header actions need a global
 * signal (e.g. NEXT / PREV, mode-change broadcasts, etc.).
 *
 * TODO: (#203) Contemplate a clean design for mode-guarded events.
 * Today every listener re-implements the same `if (this.isActive())`
 * check, and the dispatcher has no idea which mode it is targeting —
 * which is brittle (each new listener has to remember the guard) and
 * scatters mode awareness across unrelated modules. Possible directions:
 * tag each dispatch with the originating mode and let the registry
 * filter; expose `head.on(event, mode, handler)` so the mode binding
 * lives at subscription time; or have the host re-register the listener
 * set wholesale on mode change so inactive views simply do not hear
 * the event.
 */
export enum EVENT {
  /** Triggered when the user asks to reset the current view. */
  RESET = 'reset',
}

/**
 * Dispatch the given header event on `document`.
 * @param event - The event type to dispatch.
 */
export function dispatch(event: EVENT): void {
  document.dispatchEvent(new CustomEvent(event));
}

/**
 * @returns
 */
export function reports(): string {
  const url = new URL(paths.REPORTS);
  url.searchParams.set(paths.REPORTS_PAGE_PARAM, window.location.href);
  return url.toString();
}
