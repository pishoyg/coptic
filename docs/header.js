/** Package header defines the header logic. */
import * as browser from './browser.js';
import * as paths from './paths.js';
export var CLS;
(function (CLS) {
  // TODO: (#203) Header cells should perhaps have IDs and not classes.
  /** RESET is the class of our reset buttons. */
  CLS['RESET'] = 'reset';
  /** DEVELOPER is the key of elements that toggle developer mode when
   * clicked. */
  CLS['DEVELOPER'] = 'developer';
})(CLS || (CLS = {}));
/**
 *
 */
export function reports() {
  const url = new URL(paths.REPORTS);
  url.searchParams.set(paths.REPORTS_PAGE_PARAM, window.location.href);
  browser.open(url.toString(), true);
}
