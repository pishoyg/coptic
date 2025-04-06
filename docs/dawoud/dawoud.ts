import * as scan from '../scan.js';
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1054;
const OFFSET = 16;
// TODO: If this were to be adapted to Crum, keep in mind that he sorts the
// words in a peculiar way!

// TODO: (#405): Use the local TSV once the index is fully populated.
const COPTIC =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-qCcmKVqniHVF6vtmzRoedIqgH96sDWMetp4HMSApUKNCZSqUDi3FnU_tW87yWBH2HPMbjJei9KIL/pub?gid=0&single=true&output=tsv';

// Coptic exists in the Unicode in two blocks:
//   https://en.wikipedia.org/wiki/Coptic_(Unicode_block)
//   https://en.wikipedia.org/wiki/Greek_and_Coptic
// Thus, to list the letters, we need to iterate over the two ranges separately.
// There is also one letter, added later, that has its own range — the Akhmimic
// Khei.
const COPTIC_LETTERS: [string, string][] = [
  // Capital letters have a higher unicode value, and they immediately
  // precede their small counterpart.
  // Thus, to cover the full range of the alphabet, pair[0] should be a
  // capital letter, and pair[1] should be a small letter.
  ['Ⲁ', 'ⲱ'],
  ['Ⳉ', 'ⳉ'],
  ['Ϣ', 'ϯ'],
];

// SEARCH_BOX is the ID of the search box element in the page.
const SEARCH_BOX = 'searchBox';

// Word represents a Coptic word that is lexicographically comparable to
// another.
// The two unicode blocks for the language are swapped (the lexicographically
// smaller range have higher Unicode values!) We hack around it using this
// wrapper, to allow you to conveniently compare words lexicographically.
class Word {
  private static readonly mapping: Record<string, string> = Word.buildMapping();
  private readonly mapped: string;
  readonly word: string;
  constructor(word: string) {
    // I hope the word consists entirely of Coptic words.
    this.word = word.toLowerCase();
    this.mapped = Word.map(this.word);
  }

  static isCopticWord(word: string) {
    return [...word].every((c) => c in Word.mapping);
  }

  leq(other: Word): boolean {
    return this.mapped <= other.mapped;
  }

  private static map(word: string): string {
    return Array.from(word)
      .map((a) => Word.mapping[a] ?? a)
      .join();
  }

  private static buildMapping(): Record<string, string> {
    return COPTIC_LETTERS.map((range) => Word.between(range[0], range[1]))
      .flat()
      .reduce<Record<string, string>>((acc, letter, index) => {
        acc[letter] = String.fromCharCode('a'.charCodeAt(0) + index);
        return acc;
      }, {});
  }

  private static between(a: string, b: string): string[] {
    const arr: string[] = [];
    for (
      let char = a;
      char <= b;
      char = String.fromCharCode(char.charCodeAt(0) + 1)
    ) {
      arr.push(char);
    }
    return arr;
  }
}

// Dawoud gives ⲟⲩ special handling!
// All words starting with ⲟⲩ are grouped together, under a section in the
// dictionary between ⲟ and ⲡ.
// We reimplement sorting for Dawoud!
class DawoudWord extends Word {
  override leq(other: Word): boolean {
    if (DawoudWord.ou(this) === DawoudWord.ou(other)) {
      // Either neither is an ⲟⲩ words, or both are.
      // Lexicographic comparison should work either way.
      return super.leq(other);
    }
    if (!DawoudWord.o(this) || !DawoudWord.o(other)) {
      // One of them doesn't start with ⲟ. Again, lexicographic comparison
      // should work.
      return super.leq(other);
    }
    // Both words start with ⲟ, and only one of them starts with ⲟⲩ.
    // The ⲟⲩ word is lexicographically larger.
    return !DawoudWord.ou(this);
  }

  private static o(w: Word): boolean {
    return w.word.startsWith('ⲟ');
  }

  private static ou(w: Word): boolean {
    return w.word.startsWith('ⲟⲩ');
  }
}

// Entry represents a dictionary page, where each page has a defined range,
// specified by the so-called *guide words*.
interface Page {
  start: Word;
  end: Word;
  page: number;
}

class Dictionary {
  private readonly index: Page[];
  private readonly searchBox = document.getElementById(
    SEARCH_BOX
  ) as HTMLInputElement;
  constructor(
    // index represents the guide words in TSV format.
    index: string,
    // scroller will be used to update the scan image for each query.
    private readonly scroller: scan.Scroller
  ) {
    this.index = this.buildIndex(index);
    this.addListeners();
    this.searchBox.focus();
  }

  private buildIndex(index: string): Page[] {
    const arr: Page[] = index
      .trim()
      .split('\n')
      .map((row) => {
        const [page, start, end] = row.split('\t').map((s) => s.trim());
        return {
          page: parseInt(page!),
          start: new DawoudWord(start!),
          end: new DawoudWord(end!),
        };
      });

    // TODO: Remove this block once the index is complete!
    arr.forEach((entry, idx) => {
      if (!idx) {
        return;
      }
      if (!entry.start.word) {
        entry.start = arr[idx - 1]!.end;
      }
      if (!entry.end.word) {
        entry.end = entry.start;
      }
    });
    return arr;
  }

  // Parse the query from the search box, and return a target page.
  private getPage(): number | undefined {
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
    if (!Word.isCopticWord(query)) {
      return undefined;
    }

    const target = new DawoudWord(query);
    let left = 0;
    let right = this.index.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const cur = this.index[mid]!;
      if (target.leq(cur.end)) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }

    return left === right ? this.index[right]!.page : undefined;
  }

  private search() {
    const page = this.getPage();
    if (page === undefined) {
      return;
    }
    this.scroller.update(page);
  }

  private addListeners() {
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
    this.searchBox.addEventListener('keyup', (event: KeyboardEvent) => {
      event.stopPropagation();
    });
    this.searchBox.addEventListener('keydown', (event: KeyboardEvent) => {
      event.stopPropagation();
    });
    this.searchBox.addEventListener('keypress', (event: KeyboardEvent) => {
      event.stopPropagation();
    });
  }
}

async function main() {
  const scroller = new scan.Scroller(MIN_PAGE_NUM, MAX_PAGE_NUM, OFFSET, 'jpg');
  const index = await fetch(COPTIC).then((res) => res.text());
  new scan.ZoomerDragger();
  new Dictionary(index, scroller);
}

await main();
