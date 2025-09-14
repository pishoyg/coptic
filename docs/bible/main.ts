/** Main function for a Bible chapter.
 *
 * TODO: (#0) This file is used for both `index.html`, as well as individual
 * chapter files. Split i!
 * */

import * as collapse from '../collapse.js';
import * as browser from '../browser.js';
import * as logger from '../logger.js';

const BOOK_PARAM = 'book';

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
 * If the book query parameter is present, click on the title of the given
 * book to expand its content, and scroll to it.
 */
function maybeGoToBook(): void {
  const url: URL = new URL(window.location.href);
  const click: string | null = url.searchParams.get(BOOK_PARAM);
  if (!click) {
    return;
  }
  const elem = document.getElementById(click);
  if (!elem) {
    logger.error(click, 'not found!');
    return;
  }
  elem.click();
  elem.scrollIntoView({ behavior: 'smooth' });
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
  maybeGoToBook();
}

main();
