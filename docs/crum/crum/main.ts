/** Main function for the Crum scan. */
import * as scan from '../../scan.js';
const MIN_PAGE_NUM = 1;
const MAX_PAGE_NUM = 973;
const OFFSET = 20;
const LANDING = -13; // List of Abbreviations is the default for Crum.
/* eslint-disable no-magic-numbers */
const PNG_RANGES: [number, number][] = [
  [1, 6],
  [11, 20],
  [865, 973],
];
/* eslint-enable no-magic-numbers */

/**
 *
 * @param page
 * @returns
 */
function ext(page: number): string {
  return PNG_RANGES.some((range) => page >= range[0] && page <= range[1])
    ? 'png'
    : 'jpeg';
}

/**
 *
 */
function main(): void {
  const form: scan.Form = new scan.Form(
    document.getElementById('scan') as HTMLImageElement,
    document.getElementById('next')!,
    document.getElementById('prev')!,
    document.getElementById('reset')!,
    // TODO: (#415) The page doesn't currently have a search box! This is OK at
    // the moment because the field isn't used.
    document.getElementById('search-box') as HTMLInputElement
  );
  new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, ext, form, LANDING);
  new scan.ZoomerDragger(form);
}

main();
