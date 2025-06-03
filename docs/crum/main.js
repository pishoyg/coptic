import * as help from './help.js';
import * as iam from '../iam.js';
import * as highlight from './highlight.js';
import * as crum from './crum.js';
/**
 *
 */
function main() {
  const highlighter = new highlight.Highlighter(iam.amI('anki'), []);
  // We disable the help panel on Anki for the following reasons:
  // - There is no keyboard on mobile.
  // - Many of the shortcuts simply don't work, for some reason.
  // - Anki on macOS (and possibly on other platforms) has its own shortcuts,
  //   which conflict with ours!
  // - Elements created by the panel logic (such as the `help` footer) were
  //   found to be duplicated on some Anki platforms!
  if (!iam.amI('anki')) {
    help.makeHelpPanel(highlighter);
  }
  crum.handleAll(document.body, highlighter);
}
main();
