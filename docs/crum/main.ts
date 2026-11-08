/** Main function for a Crum word page (a Crum note). */

import * as help from './help.js';
import * as dial from './dialect.js';
import * as iam from '../iam.js';
import * as high from './highlight.js';
import * as crum from './crum.js';
import * as paths from '../paths.js';
import * as dev from '../dev.js';
import * as head from '../header.js';
import * as numeral from '../numeral.js';
import * as log from '../logger.js';

/**
 * Mount the header and footer of a Crum note.
 *
 * Anki cards have no `<head>`, hence no `<link rel=prev|next>`, so they get no
 * ⇐ / ⇒. They have no Help panel either (see {@link main}), so they get no
 * Help. The footer lives in the back field, so the question side has none, and
 * mounting it there is a no-op.
 */
function mountNote(): void {
  const key: number = crum.marcion()!;
  const card: boolean = iam.amI('card');
  const label: HTMLElement = head.label(
    numeral.coptic(key),
    // On Anki, the hyperlink helps take you to the web version.
    // On web, it's pointless, as it simply points to itself.
    card ? paths.crum(key.toString()) : undefined
  );
  // Search points to the Lexicon, rather than `<link rel=search>`, so it works
  // on Anki.
  const search: HTMLElement = head.search(paths.LEXICON);

  if (card) {
    head.mount(
      'header',
      head.home(),
      head.reports(),
      label,
      head.reset(),
      search
    );
    head.mount('footer', head.dev());
    return;
  }

  head.mount(
    'header',
    head.home(),
    head.reports(),
    head.prev(),
    label,
    head.next(),
    head.reset(),
    search
  );
  head.mount('footer', head.help(), head.dev());
}

/**
 * Mount the header and footer of the page, be it a note, an index, or an index
 * index.
 *
 * See the NOTE at the top of `header.ts`: this must run synchronously, before
 * anything else changes the page.
 */
function mount(): void {
  if (iam.amI('index_index')) {
    head.mount('header', head.home(), head.search(), head.reports());
    head.mount('footer', head.help());
    return;
  }

  if (iam.amI('index')) {
    // Subindexes link to each other in a loop, and search leads to their
    // parent index index.
    head.mount(
      'header',
      head.home(),
      head.search(),
      head.prev(),
      head.next(),
      head.reset(),
      head.dev()
    );
    head.mount('footer', head.help());
    return;
  }

  if (iam.amI('note') || iam.amI('card')) {
    mountNote();
    return;
  }

  log.error('Page identity cannot be determined!');
}

/**
 *
 */
function main(): void {
  mount();

  const highlighter = new high.Highlighter(new dial.Manager());
  // The developer-mode highlighter listens for the Dev event.
  new dev.Highlighter();

  // We disable the help panel on Anki for the following reasons:
  // - There is no keyboard on mobile.
  // - Many of the shortcuts simply don't work, for some reason.
  // - Anki on macOS (and possibly on other platforms) has its own shortcuts,
  //   which conflict with ours!
  // - Elements created by the panel logic were found to be duplicated on some
  //   Anki platforms! (The panel used to create its own footer; the footer now
  //   comes from the header module.)
  if (!iam.amI('card')) {
    help.makeHelpPanel(highlighter);
  }

  crum.handle(document.body, highlighter);
}

main();
