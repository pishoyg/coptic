import * as collapse from '../collapse.js';
import * as utils from '../utils.js';
function main() {
  collapse.addListeners();
  document.addEventListener('keydown', (event) => {
    if (event.code === 'n') {
      utils.openNextLink();
    } else if (event.key === 'p') {
      utils.openPrevLink();
    } else if (event.key === 'X') {
      utils.openSearchLink();
    }
  });
}
main();
