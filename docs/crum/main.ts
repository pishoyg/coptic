/** Main function for a Crum word page (a Crum note). */

import * as help from './help.js';
import * as d from './dialect.js';
import * as iam from '../iam.js';
import * as dropdown from '../dropdown.js';
import * as html from '../html.js';
import * as highlight from './highlight.js';
import * as crum from './crum.js';

/**
 *
 */
function main(): void {
  // Normalizing the tree and text content is necessary for some of our text
  // search logic to work correctly.
  html.normalize();
  const manager: d.Manager = new d.Manager();
  const anki = iam.amI('anki');
  if (!anki) {
    // Set to defaults.
    // Anki manages its own dialects, so we shouldn't use defaults.
    manager.setToDefaultIfUnset();
  }

  const highlighter = new highlight.Highlighter(manager, []);

  // We disable the help panel on Anki for the following reasons:
  // - There is no keyboard on mobile.
  // - Many of the shortcuts simply don't work, for some reason.
  // - Anki on macOS (and possibly on other platforms) has its own shortcuts,
  //   which conflict with ours!
  // - Elements created by the panel logic (such as the `help` footer) were
  //   found to be duplicated on some Anki platforms!
  if (!anki) {
    help.makeHelpPanel(highlighter);
  }

  crum.handle(document.body, highlighter);
  // We only have hover-invoked tooltips.
  dropdown.addEventListeners('hover');
}

main();
