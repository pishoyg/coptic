/** Main function for the Crum scan. */
import * as scan from '../../scan.js';
const MIN_PAGE_NUM = 1;
const MAX_PAGE_NUM = 973;
const OFFSET = 20;
const LANDING = -13; // List of Abbreviations is the default for Crum.
const PNG_RANGES = [
  [1, 6],
  [11, 20],
  [865, 973],
];
/**
 *
 * @param page
 * @returns
 */
function ext(page) {
  return PNG_RANGES.some((range) => page >= range[0] && page <= range[1])
    ? 'png'
    : 'jpeg';
}
/**
 *
 */
function main() {
  const form = new scan.Form(
    document.getElementById('scan'),
    document.getElementById('next'),
    document.getElementById('prev'),
    document.getElementById('reset'),
    // TODO: (#415) The page doesn't currently have a search box! This is OK at
    // the moment because the field isn't used.
    document.getElementById('search-box')
  );
  new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, ext, form, LANDING);
  new scan.ZoomerDragger(form);
}
main();
