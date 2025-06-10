/** Main function for a Bible chapter. */
import * as collapse from '../collapse.js';
import * as browser from '../browser.js';
/**
 * Add Bible event listeners.
 */
function addEventListeners() {
  document.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'n':
        browser.openNextLink();
        break;
      case 'p':
        browser.openPrevLink();
        break;
      case 'X':
        browser.openSearchLink();
        break;
      default:
      // For any other key, do nothing.
    }
  });
}
/**
 *
 */
function main() {
  collapse.addEventListenersForSiblings();
  addEventListeners();
}
main();
