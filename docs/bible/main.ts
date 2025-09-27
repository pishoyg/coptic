/* Main function for a Bible chapter. */

import * as high from './highlight.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as drop from '../dropdown.js';
import * as cls from './cls.js';
import * as dial from './dialect.js';

enum ID {
  BAR = 'bar',
  TRAY = 'tray',
}

/**
 * Add Bible event listeners.
 * TODO: (#349) Use proper shortcuts with a help panel.
 * @param highlighter
 */
function addEventListeners(highlighter: high.Highlighter): void {
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
function main(): void {
  // Normalizing the tree is necessary for some of our text search logic to work
  // correctly.
  html.normalize();

  const boxes: HTMLInputElement[] = [];
  const labels = (): HTMLLabelElement[] => {
    return dial.DIALECTS.map((dialect: dial.Dialect): HTMLLabelElement => {
      const label: HTMLLabelElement = document.createElement('label');
      const box: HTMLInputElement = dialect.checkbox();
      boxes.push(box);
      label.append(box, dialect.name);
      return label;
    });
  };

  // We will have two sets of checkboxes – one living in a bar (that shows on
  // large screens) and one in a tray (for smaller screens) beneath a drop-down
  // element.
  const bar: HTMLDivElement = document.createElement('div');
  bar.append(...labels());
  bar.id = ID.BAR;

  const tray: HTMLDivElement = document.createElement('div');
  tray.append(...labels());
  const holder: HTMLSpanElement = document.createElement('span');
  holder.textContent = 'Languages ▾';
  holder.id = ID.TRAY;
  drop.addDroppable(holder, 'click', tray);

  // Construct the highlighter.
  const highlighter: high.Highlighter = new high.Highlighter(
    new dial.Manager(),
    [...boxes]
  );

  addEventListeners(highlighter);

  const title: HTMLElement = document.querySelector(`.${cls.TITLE}`)!;
  title.insertAdjacentElement('afterend', bar);
  title.insertAdjacentElement('afterend', holder);

  drop.addEventListeners('click');
}

main();
