/** Main function for the Bible index. */

import * as collapse from '../collapse.js';
import * as logger from '../logger.js';

const BOOK_PARAM = 'book';

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
  collapse.addEventListenersForSiblings();
  maybeGoToBook();
}

main();
