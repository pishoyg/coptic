/** Main function for the Crum scan. */
import * as scan from '../../scan.js';
const MIN_PAGE_NUM = 1;
const MAX_PAGE_NUM = 975;
const OFFSET = 22;
const LANDING = -13; // List of Abbreviations is the default for Crum.
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
  new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, 'png', form, LANDING);
  new scan.ZoomerDragger(form);
}
main();
