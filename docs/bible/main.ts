import * as collapse from '../collapse.js';
import * as browser from '../browser.js';

/**
 *
 */
function main() {
  collapse.addListenersForSiblings();

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
    }
  });
}

main();
