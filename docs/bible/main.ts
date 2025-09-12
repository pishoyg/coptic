/** Main function for a Bible chapter. */

import * as collapse from '../collapse.js';
import * as browser from '../browser.js';

/**
 * Add Bible event listeners.
 */
function addEventListeners(): void {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
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
function main(): void {
  // Normalizing the tree is necessary for some of our text search logic to work
  // correctly.
  document.body.normalize();
  collapse.addEventListenersForSiblings();
  addEventListeners();
}

main();
