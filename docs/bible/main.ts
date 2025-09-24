/* Main function for a Bible chapter. */

import * as highlight from './highlight.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as cls from './cls.js';

/**
 * @param link
 */
function openLink(link: 'next' | 'prev'): void {
  const href: string | null = browser.getLinkHref(link);
  if (!href) {
    return;
  }
  const url = new URL(href);
  highlight.setParam(url);
  browser.open(url.toString(), false);
}

/**
 * Add Bible event listeners.
 * TODO: (#349) Use proper shortcuts with a help panel.
 */
function addEventListeners(): void {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'n':
        openLink('next');
        break;
      case 'p':
        openLink('prev');
        break;
      case 'X':
        browser.openSearchLink();
        break;
      case 'r':
        highlight.reset();
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
  html.normalize();
  highlight.populateBoxes();
  highlight.addEventListeners();
  document
    .querySelector(`.${cls.TITLE}`)!
    .insertAdjacentElement('afterend', highlight.form());
  addEventListeners();
}

main();
