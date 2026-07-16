/** Init function for the Crum scan view. */
// TODO: (#641) Fix the sorting logic. The current heuristic often doesn't align
// with Crum.
import * as scan from '../scan.js';
import * as log from '../logger.js';
import * as dev from '../dev.js';
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
export const ROMAN_PAGES: string[] = [
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

/* BACK_VOWELS are the vowels after which a following ⲟⲩ/ⲩ is realised as the
 * consonant /w/ rather than the vowel /u/ (e.g. ⲁⲩⲱ). They exclude the front
 * vowels ⲓ/ⲉⲓ, after which ⲟⲩ/ⲩ stays vocalic unless it is also followed by a
 * vowel (the intervocalic case handled in `Letter.isVowel`). */
const BACK_VOWELS: string[] = ['ⲁ', 'ⲉ', 'ⲏ', 'ⲟ', 'ⲱ'];

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
   * Whether this letter behaves as a vowel in its surrounding context. The
   * classification depends on the original neighbours, so it must be computed
   * before any letters are stripped off the word.
   *
   * @param prev - The preceding letter, if any.
   * @param next - The following letter, if any.
   * @returns Whether this letter is a vowel.
   */
  public isVowel(prev: Letter | undefined, next: Letter | undefined): boolean {
    if (ALWAYS_VOWELS.includes(this.text)) {
      return true;
    }
    // Besides the always-vowels, only "ⲩ" or "ⲟⲩ" are ambiguous; anything else
    // is a consonant.
    if (this.text !== 'ⲟⲩ' && this.text !== 'ⲩ') {
      return false;
    }
    if (!prev) {
      // At the start of a word, ⲟⲩ/ⲩ is the vowel /u/.
      return true;
    }
    if (!ALWAYS_VOWELS.includes(prev.text)) {
      // After a consonant, ⲟⲩ/ⲩ is the vowel /u/.
      return true;
    }
    // `prev` is a vowel. ⲟⲩ/ⲩ is then the consonant /w/ when it follows a back
    // vowel (e.g. ⲁⲩⲱ) or when it sits between two vowels (the intervocalic
    // glide, e.g. ⲁⲗⲓⲟⲩⲓ, which Crum files under the skeleton ⲁⲗⲟⲩ alongside
    // ⲁⲗⲁⲩ and ⲁⲗⲏⲟⲩ); otherwise it stays the vowel /u/.
    const nextIsVowel = next && ALWAYS_VOWELS.includes(next.text);
    return !(BACK_VOWELS.includes(prev.text) || nextIsVowel);
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

    // Classify every letter as vowel or consonant up front, using its original
    // neighbours. This must happen before any letters are stripped, since the
    // ⲟⲩ/ⲩ rule depends on both the preceding and following letter.
    const vowelFlags: boolean[] = letters.map((letter, idx) =>
      letter.isVowel(letters[idx - 1], letters[idx + 1])
    );

    // Extract the trailing vowel suffix.
    const vowelSuffix: Letter[] = [];
    while (letters.length > 1 && vowelFlags[letters.length - 1]) {
      vowelSuffix.push(letters[letters.length - 1]!);
      letters.pop();
    }
    this.vowelSuffix = new Sequence(vowelSuffix.reverse());

    const consonants: Letter[] = [];
    const vowels: Letter[] = [];
    for (let idx = 1; idx < letters.length; idx++) {
      const letter: Letter = letters[idx]!;
      if (!vowelFlags[idx]) {
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
 * hand the shared search box to the `Dictionary` so it searches on every
 * keystroke.
 */
export async function init(): Promise<void> {
  const form: scan.Form = {
    image: document.getElementById(id.CRUM_SCAN) as HTMLImageElement,
    nextButton: document.getElementById(id.NEXT)!,
    prevButton: document.getElementById(id.PREV)!,
    resetButton: document.getElementById(id.RESET)!,
  };

  const isActive: scan.IsActive = () => mode.active(MODE);

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

  new scan.ZoomerDragger(form, isActive);

  new scan.Dictionary(
    new scan.Index(coptic, Word, {
      ...headwords,
      ...romanOverrides,
    }),
    new scan.Scroller({
      start: MIN_PAGE_NUM,
      end: MAX_PAGE_NUM,
      ext: 'png',
      form,
      offset: OFFSET,
      directory: DATA_DIR,
      isActive,
    }),
    document.getElementById(id.SEARCH_BOX) as HTMLInputElement,
    LANDING
  );
}
