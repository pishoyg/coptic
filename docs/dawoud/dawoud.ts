import * as scan from '../scan.js';
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1060;

function main() {
  new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, 'jpg');
  new scan.ZoomerDragger();
}

main();
