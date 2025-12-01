/** Main function for the Crum scan. */
// TODO: (#415) Fix the sorting logic. The current heuristic often doesn't align
// with Crum.
import * as scan from '../../scan.js';
import * as log from '../../logger.js';
import * as dev from '../../dev.js';
const MIN_PAGE_NUM = 1; // First file is "1.png".
const MAX_PAGE_NUM = 975; // Last file is "975.png".
const OFFSET = 22; // Page 1 in the dictionary is "23.png".
// By default, land on the List of Abbreviations, which is page -13, i.e.
// "9.png".
const LANDING = -13;
/* COPTIC defines the path to the dictionary index. */
const COPTIC = 'coptic.tsv';
/* LETTER matches a Coptic letter. */
const LETTER = /ⲉⲓ|ⲟⲩ|./g;
/* LETTERS is a list of all letters used in Crum's dictionary in lexicographic
 * order. */
const LETTERS = [
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
const LETTER_MAPPING = LETTERS.reduce((acc, value, index) => {
  acc[value] = String.fromCharCode('a'.charCodeAt(0) + index);
  return acc;
}, {});
/**
 *
 * @param word
 * @returns
 */
function normalize(word) {
  // For all purposes, some pairs are identical in Crum and can be safely
  // normalized early on.
  return word.replace('ⲯ', 'ⲡⲥ').replace('ⲝ', 'ⲕⲥ').replace('ϯ', 'ⲧⲓ');
}
/* ALWAYS_VOWELS defines a list of letters that are always considered vowels
 * in Crum's dictionary. */
const ALWAYS_VOWELS = ['ⲁ', 'ⲉ', 'ⲏ', 'ⲉⲓ', 'ⲓ', 'ⲟ', 'ⲱ'];
/**
 * Letter represents a letter in a word in Crum's dictionary.
 */
class Letter {
  text;
  /**
   *
   * @param text
   */
  constructor(text) {
    this.text = text;
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
  mapping(strict = false) {
    return LETTER_MAPPING[strict ? this.text : this.equivalent()];
  }
  /**
   * @returns
   */
  equivalent() {
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
  isVowel(prev) {
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
  isConsonant(prev) {
    return !this.isVowel(prev);
  }
  /**
   *
   * @param other
   * @param strict
   * @returns
   */
  eq(other, strict = false) {
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
  leq(other, strict = false) {
    return this.mapping(strict) <= other.mapping(strict);
  }
}
/**
 *
 */
class Sequence {
  letters;
  /**
   *
   * @param letters
   */
  constructor(letters) {
    this.letters = letters;
  }
  /**
   *
   * @param strict
   * @returns
   */
  mapping(strict = false) {
    return this.letters.map((l) => l.mapping(strict)).join('');
  }
  /**
   *
   * @param other
   * @param strict
   * @returns
   */
  eq(other, strict = false) {
    return this.mapping(strict) === other.mapping(strict);
  }
  /**
   *
   * @param other
   * @param strict
   * @returns
   */
  leq(other, strict = false) {
    return this.mapping(strict) <= other.mapping(strict);
  }
}
/**
 * Word represents a word in Crum's dictionary.
 */
export class Word {
  word;
  start;
  consonants;
  vowels;
  vowelSuffix;
  /**
   *
   * @param word
   */
  constructor(word) {
    this.word = word;
    word = normalize(word);
    LETTER.lastIndex = 0;
    const letters = (word.match(LETTER) ?? []).map((t) => new Letter(t));
    // Sanity check:
    dev.play(() => {
      log.ensure(
        letters.map((s) => s.text).join('') === word,
        'This is impossible given the regex!'
      );
    });
    const start = letters[0];
    if (!start) {
      log.fatal('Word may be empty:', word);
    }
    this.start = start;
    const vowelSuffix = [];
    let last = undefined;
    // Extract the vowel suffix:
    while (
      letters.length > 1 &&
      (last = letters.at(-1))?.isVowel(letters.at(-2))
    ) {
      vowelSuffix.push(last);
      letters.pop();
    }
    this.vowelSuffix = new Sequence(vowelSuffix.reverse());
    const consonants = [];
    const vowels = [];
    for (const [idx, letter] of letters.entries()) {
      if (!idx) {
        // We have already handled the first entry.
        continue;
      }
      if (letter.isConsonant(letters[idx - 1])) {
        consonants.push(letter);
      } else {
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
  leq(other) {
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
 *
 */
async function main() {
  const form = new scan.Form(
    document.getElementById('scan'),
    document.getElementById('next'),
    document.getElementById('prev'),
    document.getElementById('reset'),
    document.getElementById('search-box'),
    document.getElementById('form')
  );
  const scroller = new scan.Scroller(
    MIN_PAGE_NUM,
    MAX_PAGE_NUM,
    OFFSET,
    'png',
    form,
    LANDING
  );
  const index = new scan.Index(
    await fetch(COPTIC).then((res) => res.text()),
    Word
  );
  new scan.Dictionary(index, scroller, form);
  new scan.ZoomerDragger(form);
}
await main();
