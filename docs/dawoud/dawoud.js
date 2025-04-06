import * as scan from '../scan.js';
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1054;
const OFFSET = 16;
// TODO: (#405): Use the local TSV once the index is populated.
const COPTIC =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-qCcmKVqniHVF6vtmzRoedIqgH96sDWMetp4HMSApUKNCZSqUDi3FnU_tW87yWBH2HPMbjJei9KIL/pub?gid=0&single=true&output=tsv';
// NOTE: Capital letters have a higher unicode value, and they immediately
// precede their small counterpart.
const COPTIC_LETTERS = [
  ['Ⲁ', 'ⲱ'],
  ['Ϣ', 'ϯ'],
];
const SEARCH_BOX = 'searchBox';
class Index {
  scroller;
  static mapping = Index.buildMapping();
  index;
  searchBox = document.getElementById(SEARCH_BOX);
  constructor(index, scroller) {
    this.scroller = scroller;
    this.index = this.buildIndex(index);
    this.addListeners();
    this.searchBox.focus();
  }
  buildIndex(index) {
    const arr = index
      .trim()
      .split('\n')
      .map((row) => {
        const [page, start, end] = row.split('\t').map((s) => s.trim());
        return [
          { word: start, page: parseInt(page) },
          { word: end, page: parseInt(page) },
        ];
      })
      .flat();
    // TODO: Remove this block once the index is complete!
    arr.forEach((entry, idx) => {
      if (!idx) {
        return;
      }
      if (entry.word) {
        return;
      }
      arr[idx].word = arr[idx - 1].word;
    });
    return arr;
  }
  getPage() {
    const query = this.searchBox.value.trim().toLowerCase();
    if (!query) {
      return undefined;
    }
    const num = parseInt(query);
    if (!isNaN(num)) {
      // This is a page number.
      return num;
    }
    // Check if this is a Coptic word.
    if (!Index.isCopticWord(query)) {
      return undefined;
    }
    let left = 0;
    let right = this.index.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2) + 1;
      const cur = this.index[mid];
      if (cur.word === query) {
        return cur.page;
      }
      if (Index.less(query, cur.word)) {
        right = mid - 1;
      } else {
        left = mid;
      }
    }
    return this.index[right].page;
  }
  search() {
    const page = this.getPage();
    if (page === undefined) {
      return;
    }
    this.scroller.update(page);
  }
  addListeners() {
    // Input in the search box triggers a search.
    this.searchBox.addEventListener('input', this.search.bind(this));
    // The slash key focuses on the search box.
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Slash') {
        this.searchBox.focus();
        event.preventDefault();
        event.stopPropagation();
      }
    });
    // Prevent other elements in the page from picking up keyboard events on the
    // search box.
    this.searchBox.addEventListener('keyup', (event) => {
      event.stopPropagation();
    });
    this.searchBox.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });
    this.searchBox.addEventListener('keypress', (event) => {
      event.stopPropagation();
    });
  }
  static isCopticWord(word) {
    return [...word].every((c) => c in Index.mapping);
  }
  // Compare two Coptic words.
  static less(a, b) {
    return Index.map(a) < Index.map(b);
  }
  static map(a) {
    return Array.from(a)
      .map((a) => Index.mapping[a] ?? a)
      .join();
  }
  static buildMapping() {
    return COPTIC_LETTERS.map((range) => Index.between(range[0], range[1]))
      .flat()
      .reduce((acc, letter, index) => {
        acc[letter] = String.fromCharCode('a'.charCodeAt(0) + index);
        return acc;
      }, {});
  }
  static between(a, b) {
    const arr = [];
    for (
      let char = a;
      char <= b;
      char = String.fromCharCode(char.charCodeAt(0) + 1)
    ) {
      arr.push(char);
    }
    return arr;
  }
  static *letters() {
    yield* Index.between('ⲁ', 'ⲱ');
    yield* Index.between('ϣ', 'ϯ');
  }
}
async function main() {
  const scroller = new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, 'jpg');
  const index = await fetch(COPTIC).then((res) => res.text());
  new scan.ZoomerDragger();
  new Index(index, scroller);
}
await main();
