import * as scan from '../scan.js';
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1054;
const OFFSET = 16;
// TODO: (#405): Use the local TSV once the index is populated.
const COPTIC =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-qCcmKVqniHVF6vtmzRoedIqgH96sDWMetp4HMSApUKNCZSqUDi3FnU_tW87yWBH2HPMbjJei9KIL/pub?gid=0&single=true&output=tsv';
async function main() {
  const scroller = new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, 'jpg');
  new scan.ZoomerDragger();
  const searchBox = document.getElementById('searchBox');
  const dictionaryIndex = await fetch(COPTIC)
    .then((res) => res.text())
    .then((text) =>
      text
        .trim()
        .split('\n')
        .map((row) => {
          const [page, start, end] = row.split('\t');
          return { page, start, end };
        })
    );
  searchBox.addEventListener('input', () => {
    const word = searchBox.value.trim();
    if (!word) {
      return;
    }
    for (const entry of dictionaryIndex) {
      if (word >= entry.start && word <= entry.end) {
        scroller.update(parseInt(entry.page));
        return;
      }
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Slash') {
      searchBox.focus();
      event.preventDefault();
      event.stopPropagation();
    }
  });
  searchBox.focus();
}
await main();
