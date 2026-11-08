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
 *   - `ifao.ts`    — Kasser scans init
 *   - `dawoud.ts`  — Dawoud scan init
 *
 * The header and the footer's panels are wired up here as well.
 */
import * as about from '../about.js';
import * as head from '../header.js';
import * as mode from './mode.js';
import * as digital from './digital.js';
import * as book from './book.js';
import * as ifao from './ifao.js';
import * as dawoud from './dawoud.js';

/**
 * Boot the lexicon page.
 */
async function main(): Promise<void> {
  // Mount before the first `await`. See the NOTE in `header.ts`. Every button
  // dispatches an event, so nothing here waits for the views. Help and Dev
  // apply to the digital lexicon, and ⇐ and ⇒ to the scans; `lexicon.css`
  // shows one of each pair, by mode.
  head.mount(
    'header',
    head.home(),
    head.either(head.help(), head.prev()),
    head.reset(),
    head.either(head.dev(), head.next()),
    head.reports()
  );

  // Wire the Digital / Book / Kasser / Dawoud switcher and the shared search
  // box before any view-specific init runs.
  mode.init();
  about.init();
  await Promise.all([digital.init(), book.init(), ifao.init(), dawoud.init()]);
}

await main();
