/** Main function for the Bible index. */
import * as coll from '../collapse.js';
import * as log from '../logger.js';
import * as cls from './cls.js';
const BOOK_PARAM = 'book';
const CLICK_DELAY_MS = 500;
/**
 * If the book query parameter is present, click on the title of the given
 * book to expand its content, and scroll to it.
 */
function maybeGoToBook() {
  const url = new URL(window.location.href);
  const click = url.searchParams.get(BOOK_PARAM);
  if (!click) {
    return;
  }
  const elem = document.getElementById(click);
  if (!elem) {
    log.error(click, 'not found!');
    return;
  }
  elem.scrollIntoView({ behavior: 'smooth' });
  // Scroll first, wait a bit, then click.
  setTimeout(elem.click.bind(elem), CLICK_DELAY_MS);
}
/**
 *
 */
function main() {
  document.querySelectorAll(`.${cls.INDEX_BOOK_NAME}`).forEach((collapse) => {
    new coll.Collapsible(
      collapse,
      // In our index, the collapsibles conveniently happen to be the
      // immediate next siblings of title elements.
      collapse.nextElementSibling
    );
  });
  maybeGoToBook();
}
main();
