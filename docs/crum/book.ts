/** Init function for the Crum scan view. */
// TODO: (#641) Fix the sorting logic. The current heuristic often doesn't align
// with Crum.
import * as scan from '../scan.js';
import * as log from '../logger.js';
import * as dev from '../dev.js';
import * as query from './query.js';
import * as mode from './mode.js';
import * as id from './id.js';
import * as str from '../str.js';

const MODE: mode.Mode = mode.BOOK;
const MIN_PAGE_NUM = 1; // First file is "1.png".
const MAX_PAGE_NUM = 975; // Last file is "975.png".
const OFFSET = 22; // Page 1 in the dictionary is "23.png".
// By default, land on the cover page (the first file in the scan, "1.png").
const LANDING = MIN_PAGE_NUM - OFFSET;

const DATA_DIR = 'crum/';

/* COPTIC defines the path to the dictionary index. */
const COPTIC = str.joinPaths(DATA_DIR, 'coptic.tsv');

/* HEADWORDS defines the path to the headword-to-column index. */
const HEADWORDS = str.joinPaths(DATA_DIR, 'headwords.json');

/* The book introduction uses Roman-numeral pagination from page v (the
 * Preface) through page xxiv (the last page of the Additions and
 * Corrections, which immediately precedes page 1 of the body). In our
 * logical page numbering, those run from -19 to 0.
 *
 * ROMAN_OVERRIDES lets the dictionary index resolve Roman-numeral queries
 * (e.g. `v`, `xi`, `xv`, with or without a trailing column letter) to
 * those logical page numbers, so the Preface, List of Abbreviations, and
 * Addenda are all linkable by their book-side numbering.
 */
const ROMAN_START = -19;
const ROMAN_PAGES: string[] = [
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
  'xiii',
  'xiv',
  'xv',
  'xvi',
  'xvii',
  'xviii',
  'xix',
  'xx',
  'xxi',
  'xxii',
  'xxiii',
  'xxiv',
];

/* LETTER matches a Coptic letter. */
const LETTER = /ⲉⲓ|ⲟⲩ|./g;

/* LETTERS is a list of all letters used in Crum's dictionary in lexicographic
 * order. */
const LETTERS: string[] = [
  'ⲁ',
  'ⲃ',
  'ⲅ',
  'ⲇ',
  'ⲉ',
  'ⲍ',
  'ⲏ',
  'ⲑ',
  'ⲉⲓ',
  'ⲓ',
  'ⲕ',
  'ⲗ',
  'ⲙ',
  'ⲛ',
  'ⲟ',
  'ⲡ',
  'ⲣ',
  'ⲥ',
  'ⲧ',
  'ⲟⲩ',
  'ⲩ',
  'ⲫ',
  'ⲭ',
  'ⲱ',
  'ϣ',
  'ϥ',
  'ⳉ',
  'ϧ',
  'ϩ',
  'ϫ',
  'ϭ',
];

/* LETTER_MAPPING maps a Coptic letter to an ASCII character such that, for a
 * pair of Coptic letters A and B where A is lexicographically smaller than B,
 * the mapping of A is lexicographically smaller than the mapping of B
 * (according to Crum's ordering).
 */
const LETTER_MAPPING: Record<string, string> = LETTERS.reduce<
  Record<string, string>
>((acc: Record<string, string>, value: string, index: number) => {
  acc[value] = String.fromCharCode('a'.charCodeAt(0) + index);
  return acc;
}, {});

/**
 *
 * @param word
 * @returns
 */
function normalize(word: string): string {
  // For all purposes, some pairs are identical in Crum and can be safely
  // normalized early on.
  return word.replaceAll('ⲯ', 'ⲡⲥ').replaceAll('ⲝ', 'ⲕⲥ').replaceAll('ϯ', 'ⲧⲓ');
}

/* ALWAYS_VOWELS defines a list of letters that are always considered vowels
 * in Crum's dictionary. */
const ALWAYS_VOWELS: string[] = ['ⲁ', 'ⲉ', 'ⲏ', 'ⲉⲓ', 'ⲓ', 'ⲟ', 'ⲱ'];

/**
 * Letter represents a letter in a word in Crum's dictionary.
 */
class Letter {
  /**
   *
   * @param text
   */
  public constructor(public readonly text: string) {
    dev.play(() => {
      log.ensure(text in LETTER_MAPPING, text, 'is not a letter!');
    });
  }

  /**
   *
   * @param strict
   * @returns An ASCII mapping of this letter, for lexicographic sorting
   * purposes.
   * See LETTER_MAPPING for more details.
   */
  public mapping(strict = false): string {
    return LETTER_MAPPING[strict ? this.text : this.equivalent()]!;
  }

  /**
   * @returns
   */
  private equivalent(): string {
    if (this.text === 'ⲟⲩ') {
      return 'ⲩ';
    }
    if (this.text === 'ⲉⲓ') {
      return 'ⲓ';
    }
    return this.text;
  }

  /**
   *
   * @param prev
   * @returns
   */
  public isVowel(prev: Letter | undefined): boolean {
    if (ALWAYS_VOWELS.includes(this.text)) {
      return true;
    }
    // Besides the always-vowels, the letters "ⲩ" or "ⲟⲩ" could be vowels,
    // though this depends on the preceding letter.
    if (this.text !== 'ⲟⲩ' && this.text !== 'ⲩ') {
      // This letter is not an always-vowel, and is not ⲩ or ⲟⲩ either. Then
      // it's a consonant.
      return false;
    }
    if (!prev) {
      // ⲟⲩ at the start of a word is a vowel.
      return true;
    }
    if (['ⲁ', 'ⲉ', 'ⲏ', 'ⲟ', 'ⲱ'].includes(prev.text)) {
      // ⲟⲩ preceded by any of these letters is a consonant.
      return false;
    }
    // Otherwise, this ⲟⲩ is a vowel.
    return true;
  }

  /**
   *
   * @param prev
   * @returns
   */
  public isConsonant(prev: Letter | undefined): boolean {
    return !this.isVowel(prev);
  }

  /**
   *
   * @param other
   * @param strict
   * @returns
   */
  public eq(other: Letter, strict = false): boolean {
    return strict
      ? this.text === other.text
      : this.equivalent() === other.equivalent();
  }

  /**
   *
   * @param other
   * @param strict
   * @returns
   */
  public leq(other: Letter, strict = false): boolean {
    return this.mapping(strict) <= other.mapping(strict);
  }
}

/**
 *
 */
class Sequence {
  /**
   *
   * @param letters
   */
  public constructor(private readonly letters: Letter[]) {}

  /**
   *
   * @param strict
   * @returns
   */
  private mapping(strict = false): string {
    return this.letters.map((l) => l.mapping(strict)).join('');
  }

  /**
   *
   * @param other
   * @param strict
   * @returns
   */
  public eq(other: Sequence, strict = false): boolean {
    return this.mapping(strict) === other.mapping(strict);
  }

  /**
   *
   * @param other
   * @param strict
   * @returns
   */
  public leq(other: Sequence, strict = false): boolean {
    return this.mapping(strict) <= other.mapping(strict);
  }
}

/**
 * Word represents a word in Crum's dictionary.
 */
export class Word implements scan.Word {
  private readonly start: Letter;
  private readonly consonants: Sequence;
  private readonly vowels: Sequence;
  private readonly vowelSuffix: Sequence;

  /**
   *
   * @param word
   */
  public constructor(public readonly word: string) {
    word = normalize(word);
    const letters: Letter[] = (word.match(LETTER) ?? []).map(
      (t) => new Letter(t)
    );

    // Sanity check:
    dev.play(() => {
      log.ensure(
        letters.map((s) => s.text).join('') === word,
        'This is impossible given the regex!'
      );
    });

    const start: Letter | undefined = letters[0];
    if (!start) {
      log.fatal('Word may be empty:', word);
    }
    this.start = start;

    const vowelSuffix: Letter[] = [];
    let last: Letter | undefined = undefined;
    // Extract the vowel suffix:
    while (
      letters.length > 1 &&
      (last = letters.at(-1))?.isVowel(letters.at(-2))
    ) {
      vowelSuffix.push(last);
      letters.pop();
    }
    this.vowelSuffix = new Sequence(vowelSuffix.reverse());

    const consonants: Letter[] = [];
    const vowels: Letter[] = [];
    for (const [idx, letter] of letters.entries()) {
      if (!idx) {
        // We have already handled the first entry.
        continue;
      }
      if (letter.isConsonant(letters[idx - 1])) {
        consonants.push(letter);
      } else if (!vowels.at(-1)?.eq(letter)) {
        // Collapse geminate vowels: a Coptic doubled vowel (e.g. ⲱⲱ, ⲟⲟ, ⲁⲁ)
        // writes a single long vowel and occupies the same grade in Crum, so
        // forms like ⲕⲱⲗⲉ and ⲕⲱⲱⲗⲉ are interfiled rather than separated. Keep
        // only the first letter of each run of equivalent interior vowels.
        vowels.push(letter);
      }
    }

    this.consonants = new Sequence(consonants);
    this.vowels = new Sequence(vowels);
  }

  /**
   * Lexicographically compare two words in Crum's dictionary.
   * @param other - Word to compare.
   * @returns The truth value of `this <= other`, based on Crum's ordering.
   */
  public leq(other: Word): boolean {
    if (this.word === other.word) {
      // These words are identical in all aspects.
      return true;
    }

    if (!this.start.eq(other.start)) {
      return this.start.leq(other.start);
    }

    if (!this.consonants.eq(other.consonants)) {
      return this.consonants.leq(other.consonants);
    }

    if (!this.vowelSuffix.eq(other.vowelSuffix)) {
      return this.vowelSuffix.leq(other.vowelSuffix);
    }

    return this.vowels.leq(other.vowels);
  }
}

/**
 * Initialise the Crum scan view: build the index, wire the scroller, and
 * subscribe to query-change events.
 */
export async function init(): Promise<void> {
  const form: scan.Form = {
    image: document.getElementById(id.CRUM_SCAN) as HTMLImageElement,
    nextButton: document.getElementById(id.NEXT)!,
    prevButton: document.getElementById(id.PREV)!,
    resetButton: document.getElementById(id.RESET)!,
  };

  const isActive: scan.IsActive = () => mode.active(MODE);

  const scroller = new scan.Scroller({
    start: MIN_PAGE_NUM,
    end: MAX_PAGE_NUM,
    ext: 'png',
    form,
    offset: OFFSET,
    landingPage: LANDING,
    directory: DATA_DIR,
    isActive,
  });

  const [coptic, headwords]: [string, Record<string, string>] =
    await Promise.all([
      fetch(COPTIC).then((res: Response): Promise<string> => res.text()),
      fetch(HEADWORDS).then(
        (res: Response): Promise<Record<string, string>> =>
          res.json() as Promise<Record<string, string>>
      ),
    ]);

  const romanOverrides: Record<string, string> = Object.fromEntries(
    ROMAN_PAGES.map((item: string, idx: number): [string, string] => [
      item,
      (ROMAN_START + idx).toString(),
    ])
  );

  const index = new scan.Index(coptic, Word, {
    ...headwords,
    ...romanOverrides,
  });
  const dictionary = new scan.Dictionary(index, scroller);

  new scan.ZoomerDragger(form, isActive);

  document.addEventListener(query.EVENT, (e: Event): void => {
    dictionary.search((e as CustomEvent<string>).detail);
  });
  dictionary.search(query.current());
}
