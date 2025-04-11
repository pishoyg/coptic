import * as scan from '../../scan.js';
const MIN_PAGE_NUM = 1;
const MAX_PAGE_NUM = 973;
const OFFSET = 20;
const LANDING = -13; // List of Abbreviations is the default for Crum.
const PNG_RANGES: [number, number][] = [
  [1, 6],
  [11, 20],
  [865, 973],
];

function ext(page: number): string {
  return PNG_RANGES.some((range) => page >= range[0] && page <= range[1])
    ? 'png'
    : 'jpeg';
}

function main() {
  const form: scan.Form = scan.Form.default();
  new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, ext, form, LANDING);
  new scan.ZoomerDragger(form);
}

main();
