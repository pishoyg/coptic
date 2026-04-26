/**
 * Package query is the single owner of Lexicon's search query and search box.
 *
 * All registered handlers fire on every keystroke, regardless of which view
 * (Digital / Book / Dawoud) is currently visible. The hidden views stay in
 * sync with the visible one, so switching modes is instant: the destination
 * view is already up to date and no re-dispatch is needed.
 * This also simplifies our code, as we don't have to mode-guard search
 * listeners.
 *
 * The trade-off: it increases resource consumption.
 * Xooxle may be CPU-intensive, and scans use bandwidth to download images.
 *
 * TODO: (#413) Replace the subscriber pattern entirely with a custom DOM
 * event, for example:
 *   `document.dispatchEvent(new CustomEvent('querychange', { detail: q }))`
 * Each engine would `addEventListener('querychange', …)` directly,
 * eliminating this module's bookkeeping and giving every consumer a uniform
 * event-driven hook. The same shape can later carry NEXT / PREV / RESET
 * events — see the matching TODO in `docs/scan.ts`.
 */
import * as browser from '../browser.js';
import * as paths from '../paths.js';
import * as id from './id.js';

type Handler = (query: string) => void;

// Avoid setting the box in the global scope, as a reference to `document` in
// the global scope would make this package incompatible with Node.js. As of the
// time of writing, this gets imported into unit tests, so we avoid
// browser-specific code.
let box: HTMLInputElement | null = null;

const handlers: Handler[] = [];

/**
 * Fire every registered handler with the current query value.
 */
function dispatch(): void {
  const q: string = box!.value;
  for (const h of handlers) {
    h(q);
  }
}

/**
 * Initialise the module: restore the memorised query from the URL, wire
 * the input + key listeners, prevent form submit, and focus the search box
 * so the user can start typing immediately.
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
 * Register a handler. It is invoked once immediately with the current
 * query (so freshly-constructed engines pick up the URL-restored value)
 * and then on every subsequent keystroke.
 *
 * @param handler - Called with the current query string.
 */
export function subscribe(handler: Handler): void {
  handlers.push(handler);
  handler(box!.value);
}

/**
 * Return focus to the search box. Used by the mode switcher so the user
 * can keep typing without clicking back into the input after a switch.
 */
export function focus(): void {
  box!.focus();
}
