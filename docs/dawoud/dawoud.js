import * as scan from '../scan.js';
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1054;
const OFFSET = 16;
function main() {
  new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, 'jpg');
  new scan.ZoomerDragger();
}
main();
