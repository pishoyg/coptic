/* Main function for a Bible chapter. */
import * as highlight from './highlight.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as dropdown from '../dropdown.js';
import * as cls from './cls.js';
const BAR_ID = 'bar';
const TRAY_ID = 'tray';
/**
 * Add Bible event listeners.
 * TODO: (#349) Use proper shortcuts with a help panel.
 * @param highlighter
 */
function addEventListeners(highlighter) {
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
        highlighter.reset();
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
  // We will have two sets of checkboxes – one living in a bar (that shows on
  // large screens) and one in a tray (for smaller screens).
  const barBoxes = highlight.buildCheckboxes();
  const trayBoxes = highlight.buildCheckboxes();
  // Construct the highlighter.
  const highlighter = new highlight.Highlighter([...barBoxes, ...trayBoxes]);
  addEventListeners(highlighter);
  const bar = document.createElement('div');
  bar.append(...highlight.buildLabels(barBoxes));
  bar.id = BAR_ID;
  const tray = document.createElement('div');
  tray.append(...highlight.buildLabels(trayBoxes));
  // The tray lives inside a drop-down element.
  const drop = document.createElement('span');
  drop.textContent = 'Dialects ▾';
  drop.id = TRAY_ID;
  dropdown.addDroppable(drop, 'click', tray);
  const title = document.querySelector(`.${cls.TITLE}`);
  title.insertAdjacentElement('afterend', bar);
  title.insertAdjacentElement('afterend', drop);
  dropdown.addEventListeners('click');
}
main();
