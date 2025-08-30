/** Main function for the Crum scan. */
import * as scan from '../../scan.js';
const MIN_PAGE_NUM = 1;
const MAX_PAGE_NUM = 975;
const OFFSET = 22;
const LANDING = -13; // List of Abbreviations is the default for Crum.

/**
 *
 */
function main(): void {
  const form: scan.Form = new scan.Form(
    document.getElementById('scan') as HTMLImageElement,
    document.getElementById('next')!,
    document.getElementById('prev')!,
    document.getElementById('reset')!,
    // TODO: (#415) The page doesn't currently have a search box or a form!
    // This is OK at the moment because the field isn't used.
    document.getElementById('search-box') as HTMLInputElement,
    document.getElementById('form')!
  );
  new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, 'png', form, LANDING);
  new scan.ZoomerDragger(form);
}

main();
