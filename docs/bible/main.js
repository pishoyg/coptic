/* Main function for a Bible chapter. */
import * as highlight from './highlight.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as cls from './cls.js';
import * as d from './dialect.js';
/**
 * Add Bible event listeners.
 * TODO: (#349) Use proper shortcuts with a help panel.
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
      case 'r':
        d.manager.reset();
        highlight.update();
        browser.removeFragment();
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
  // Normalizing the tree is necessary for some of our text search logic to work
  // correctly.
  html.normalize();
  addEventListeners();
  highlight.update();
  highlight.addEventListeners();
  document
    .querySelector(`.${cls.TITLE}`)
    .insertAdjacentElement('afterend', highlight.form());
}
main();
