/** Package header defines the header logic. */
import * as browser from './browser.js';
import * as paths from './paths.js';

export enum CLS {
  // TODO: (#203) Header cells should perhaps have IDs and not classes.

  /** RESET is the class of our reset buttons. */
  RESET = 'reset',

  /** DEVELOPER is the key of elements that toggle developer mode when
   * clicked. */
  DEVELOPER = 'developer',
}

/**
 *
 */
export function reports() {
  const url = new URL(paths.REPORTS);
  url.searchParams.set(paths.REPORTS_PAGE_PARAM, window.location.href);
  console.log(url.toString());
  browser.open(url.toString(), true);
}
