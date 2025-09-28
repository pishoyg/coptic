/* Main function for a Bible chapter. */
import * as high from './highlight.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as drop from '../dropdown.js';
import * as cls from './cls.js';
import * as dial from './dialect.js';
var ID;
(function (ID) {
  ID['BAR'] = 'bar';
  ID['TRAY'] = 'tray';
})(ID || (ID = {}));
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
 * @returns
 */
/**
 *
 */
function main() {
  // Normalizing the tree is necessary for some of our text search logic to work
  // correctly.
  html.normalize();
  const boxes = [];
  const labels = () => {
    return dial.DIALECTS.map((dialect) => {
      const label = document.createElement('label');
      const box = dialect.checkbox();
      boxes.push(box);
      label.append(box, dialect.name);
      return label;
    });
  };
  // We will have two sets of checkboxes – one living in a bar (that shows on
  // large screens) and one in a tray (for smaller screens) beneath a drop-down
  // element.
  const bar = document.createElement('div');
  bar.append(...labels());
  bar.id = ID.BAR;
  const tray = document.createElement('div');
  tray.append(...labels());
  const holder = document.createElement('span');
  holder.textContent = 'Languages ▾';
  holder.id = ID.TRAY;
  drop.addDroppable(holder, 'click', tray);
  // Construct the highlighter.
  const highlighter = new high.Highlighter(new dial.Manager(), [...boxes]);
  addEventListeners(highlighter);
  const title = document.querySelector(`.${cls.TITLE}`);
  title.insertAdjacentElement('afterend', bar);
  title.insertAdjacentElement('afterend', holder);
  drop.addEventListeners('click');
}
main();
