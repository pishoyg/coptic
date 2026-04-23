/** Main function for the Bible index. */

import * as coll from '../collapse.js';
import * as log from '../logger.js';
import * as browser from '../browser.js';
import * as cls from './cls.js';

const BOOK_PARAM = 'book';
const CLICK_DELAY_MS = 500;

/**
 * If the book query parameter is present, click on the title of the given
 * book to expand its content, and scroll to it.
 */
function maybeGoToBook(): void {
  const book: string | null = browser.getParam(BOOK_PARAM);
  if (!book) {
    return;
  }
  const elem = document.getElementById(book);
  if (!elem) {
    log.error(book, 'not found!');
    return;
  }
  elem.scrollIntoView({ behavior: 'smooth' });
  // Scroll first, wait a bit, then click.
  setTimeout(elem.click.bind(elem), CLICK_DELAY_MS);
}

/**
 *
 */
function main(): void {
  document
    .querySelectorAll<HTMLElement>(`.${cls.INDEX_BOOK_NAME}`)
    .forEach((collapse: HTMLElement): void => {
      new coll.Collapsible(
        collapse,
        // In our index, the collapsibles conveniently happen to be the
        // immediate next siblings of title elements.
        collapse.nextElementSibling as HTMLElement
      );
    });
  maybeGoToBook();
}

main();
