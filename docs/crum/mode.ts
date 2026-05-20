/**
 * Package mode handles switching between the three lexicon views — the
 * digital dictionaries, the Crum book scan, and the Dawoud book scan — that
 * coexist on the lexicon page.
 *
 * The current mode is reflected by a class on the document body. CSS can use
 * this class to show / hide the corresponding view. The mode is also mirrored
 * to a `?mode=` URL query parameter so the view survives reload and link
 * sharing.
 *
 */
import * as browser from '../browser.js';
import * as query from './query.js';
import * as id from './id.js';

import {
  type Mode,
  DIGITAL,
  BOOK,
  DAWOUD,
  MODE_PARAM as PARAM,
} from '../paths.js';

// The `Mode` type and values live in `paths.ts`, which owns the lexicon URL
// contract. They are re-exported here so consumers continue to spell
// `mode.Mode`, etc.
export { type Mode, DIGITAL, BOOK, DAWOUD };

const MODES: Mode[] = [DIGITAL, BOOK, DAWOUD];
const DEFAULT: Mode = DIGITAL;

/**
 * Switch to the given mode: update the body class and URL parameter, and
 * return focus to the search box so the user can keep typing.
 *
 * This is the public entry point for mode switches: button clicks, keyboard
 * shortcuts (`help.ts`), and the initial URL-driven setup in `init` all
 * funnel through it.
 *
 * @param mode - Mode to activate.
 */
export function set(mode: Mode): void {
  for (const m of MODES) {
    document.body.classList.toggle(m, m === mode);
  }
  browser.setParam(PARAM, mode === DEFAULT ? null : mode);
  if (browser.virtualKeyboardLikely()) {
    // Skip focusing the search box when an on-screen keyboard is likely to
    // appear, since that would cover the page.
    return;
  }
  query.focus();
}

/**
 * @param mode - Mode to check.
 * @returns Whether `mode` is currently the active view.
 */
export function active(mode: Mode): boolean {
  return document.body.classList.contains(mode);
}

/**
 * Initialise mode switching. Reads the initial mode from the URL (falling
 * back to `digital`), applies it, and attaches click listeners to the three
 * mode buttons.
 */
export function init(): void {
  // Initialise the query module before we apply a mode, so that the very
  // first `set` call can hand focus back to the search box via
  // `query.focus()`.
  query.init();

  for (const mode of MODES) {
    // Suppress the default mousedown focus shift onto the button so the
    // search box keeps focus across a click. Without this, the search
    // box's :focus styles briefly flicker off between mousedown and the
    // re-focus that happens inside `set` → `query.focus()`.
    const button = document.getElementById(id.modeButton(mode))!;
    button.addEventListener('mousedown', browser.preventDefault);
    button.addEventListener('click', set.bind(null, mode));
  }

  set((browser.getParam(PARAM) as Mode | undefined) ?? DEFAULT);
}
