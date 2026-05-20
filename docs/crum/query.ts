/**
 * Package query owns Lexicon's search query and search box.
 *
 * On every keystroke, it dispatches a `querychange` CustomEvent on
 * `document` whose `detail` is the current query string. Consumers — the
 * three views (Digital, Book, Dawoud) — listen with
 * `document.addEventListener(query.EVENT, …)` directly, so there is no
 * subscriber bookkeeping inside this module.
 *
 * All listeners fire on every keystroke regardless of which view is
 * currently visible, so the hidden views stay in sync with the visible
 * one and switching modes is instant.
 *
 * The trade-off: it increases resource consumption.
 * Xooxle may be CPU-intensive, and scans use bandwidth to download images.
 *
 * Consumers handle the URL-restored initial value by reading `current()`
 * once at setup time and then listening for subsequent events.
 *
 * TODO: (#203) The same CustomEvent shape can later carry NEXT / PREV /
 * RESET events — see the matching TODO in `docs/scan.ts`.
 */
import * as browser from '../browser.js';
import * as paths from '../paths.js';
import * as id from './id.js';

/**
 * Name of the query-change event dispatched on `document`. The event's
 * `detail` is the current query string.
 *
 * Usage:
 *   document.addEventListener(query.EVENT, (e: Event): void => {
 *     const q: string = (e as CustomEvent<string>).detail;
 *     ...
 *   });
 */
export const EVENT = 'querychange';

// Avoid setting the box in the global scope, as a reference to `document` in
// the global scope would make this package incompatible with Node.js. As of the
// time of writing, this gets imported into unit tests, so we avoid
// browser-specific code.
let box: HTMLInputElement | null = null;

/**
 * Dispatch a `querychange` event carrying the current query value.
 */
function dispatch(): void {
  document.dispatchEvent(
    new CustomEvent<string>(EVENT, { detail: box!.value })
  );
}

/**
 * Initialise the module: restore the memorised query from the URL, wire
 * the input + key listeners, prevent form submit, and focus the search box
 * so the user can start typing immediately.
 *
 * Does not dispatch an initial event: consumers attach their listeners
 * after this runs, so each one reads the URL-restored value via
 * `current()` at setup time and then listens for changes.
 */
export function init(): void {
  box ??= document.getElementById(id.SEARCH_BOX) as HTMLInputElement;
  const initial: string | null = browser.getParam(paths.QUERY_PARAM);
  if (initial) {
    box.value = initial;
  }

  box.addEventListener('input', () => {
    browser.setParam(paths.QUERY_PARAM, box!.value);
    dispatch();
  });

  // Stop key events on the search box from bubbling so other handlers
  // (such as the scan's N / P / R shortcuts) don't fire while typing.
  box.addEventListener('keyup', browser.stopPropagation);
  box.addEventListener('keypress', browser.stopPropagation);
  box.addEventListener('keydown', (e: KeyboardEvent) => {
    // Pressing Escape blurs the search box, letting the user switch from
    // typing to keyboard control of the page.
    if (e.key === 'Escape') {
      box!.blur();
    }
    browser.stopPropagation(e);
  });

  // Prevent submit on Enter — would otherwise clear the form.
  document
    .getElementById(id.FORM)!
    .addEventListener('submit', browser.preventDefault);

  box.focus();
}

/**
 * @returns The current query string. Consumers call this once at setup
 * time to handle the URL-restored initial value before any keystroke
 * events fire.
 */
export function current(): string {
  return box!.value;
}

/**
 * Return focus to the search box. Used by the mode switcher so the user
 * can keep typing without clicking back into the input after a switch.
 */
export function focus(): void {
  box!.focus();
}
