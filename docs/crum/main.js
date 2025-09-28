/** Main function for a Crum word page (a Crum note). */
import * as help from './help.js';
import * as dial from './dialect.js';
import * as iam from '../iam.js';
import * as drop from '../dropdown.js';
import * as html from '../html.js';
import * as high from './highlight.js';
import * as crum from './crum.js';
/**
 *
 */
function main() {
  // Normalizing the tree and text content is necessary for some of our text
  // search logic to work correctly.
  html.normalize();
  const manager = new dial.Manager();
  const anki = iam.amI('anki');
  if (!anki) {
    // Set to defaults.
    // Anki manages its own dialects, so we shouldn't use defaults.
    manager.setToDefaultIfUnset();
  }
  const highlighter = new high.Highlighter(manager, []);
  const devHighlighter = new high.DevHighlighter();
  // We disable the help panel on Anki for the following reasons:
  // - There is no keyboard on mobile.
  // - Many of the shortcuts simply don't work, for some reason.
  // - Anki on macOS (and possibly on other platforms) has its own shortcuts,
  //   which conflict with ours!
  // - Elements created by the panel logic (such as the `help` footer) were
  //   found to be duplicated on some Anki platforms!
  if (!anki) {
    help.makeHelpPanel(highlighter, devHighlighter);
  }
  crum.handle(document.body, highlighter, devHighlighter);
  // We only have hover-invoked tooltips.
  drop.addEventListeners('hover');
}
main();
