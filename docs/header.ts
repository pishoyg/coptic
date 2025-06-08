/** Package header defines the header logic. */
import * as browser from './browser.js';

const REPORTS =
  'https://docs.google.com/forms/d/e/1FAIpQLSeNVAjxtJcAR7i6AwBI3SFlzRWC5DQ09G6LfbySbZGvZCdpIg/viewform?usp=pp_url';
const PAGE_PARAM = 'entry.1382006920';

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
  const url = new URL(REPORTS);
  url.searchParams.set(PAGE_PARAM, window.location.href);
  console.log(url.toString());
  browser.open(url.toString(), true);
}
