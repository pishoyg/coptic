/**
 * Lexicon orchestrator. The lexicon page hosts three views — digital,
 * book, and dawoud — and this file wires them up symmetrically.
 *
 * `mode.init()` runs first; it owns the Digital / Book / Dawoud switcher
 * and the shared search box (the `?query=` URL param and key handling).
 * Once the box is wired, the three peer views are initialised in
 * parallel — each one attaches its own `input` listener to the shared
 * search box and performs its initial search from the box's value.
 *
 *   - `digital.ts` — Xooxle / digital-lexicon init
 *   - `book.ts`    — Crum scan init
 *   - `dawoud.ts`  — Dawoud scan init
 */
import * as mode from './mode.js';
import * as digital from './digital.js';
import * as book from './book.js';
import * as dawoud from './dawoud.js';

/**
 * Boot the lexicon page.
 */
async function main(): Promise<void> {
  // Wire the Digital / Book / Dawoud switcher and the shared search box
  // before any view-specific init runs.
  mode.init();
  await Promise.all([digital.init(), book.init(), dawoud.init()]);
}

await main();
