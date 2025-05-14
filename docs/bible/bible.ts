import * as collapse from '../collapse.js';
import * as utils from '../utils.js';

/**
 *
 */
function main() {
  collapse.addListeners();

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'n':
        utils.openNextLink();
        break;
      case 'p':
        utils.openPrevLink();
        break;
      case 'X':
        utils.openSearchLink();
        break;
    }
  });
}

main();
