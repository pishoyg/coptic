/**
 * Lexicon orchestrator. The lexicon page hosts four views — digital,
 * book, kasser, and dawoud — and this file wires them up symmetrically.
 *
 * `mode.init()` runs first; it owns the Digital / Book / Kasser / Dawoud
 * switcher and the shared search box (the `?query=` URL param and key
 * handling). Once the box is wired, the four peer views are initialised in
 * parallel — each one attaches its own `input` listener to the shared
 * search box and performs its initial search from the box's value.
 *
 *   - `digital.ts` — Xooxle / digital-lexicon init
 *   - `book.ts`    — Crum scan init
 *   - `kasser.ts`  — Kasser scans init
 *   - `dawoud.ts`  — Dawoud scan init
 *
 * The footer's panels are wired up here as well.
 */
import * as about from '../about.js';
import * as mode from './mode.js';
import * as digital from './digital.js';
import * as book from './book.js';
import * as kasser from './kasser.js';
import * as dawoud from './dawoud.js';

/**
 * Boot the lexicon page.
 */
async function main(): Promise<void> {
  // Wire the Digital / Book / Kasser / Dawoud switcher and the shared search
  // box before any view-specific init runs.
  mode.init();
  about.init();
  await Promise.all([
    digital.init(),
    book.init(),
    kasser.init(),
    dawoud.init(),
  ]);
}

await main();
