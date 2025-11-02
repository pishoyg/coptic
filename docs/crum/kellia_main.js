/* Main function for a KELLIA note. */
import * as kellia from './kellia.js';
import * as high from './highlight.js';
import * as dial from './dialect.js';
/**
 *
 */
function main() {
  kellia.handle(document.body, new high.Highlighter(new dial.Manager(), []));
}
main();
