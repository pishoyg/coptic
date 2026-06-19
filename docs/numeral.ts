/** Package numeral converts integers to Coptic numerals.
 *
 * NOTE: A Python version of this file lives at `utils/numeral.py`. The two
 * should ideally stay in sync.
 * */

import * as log from './logger.js';

// Greek Numeral Sign (Lower Keraia) for thousands.
const THOUSANDS_MARK = '͵';
const COMBINING_OVERLINE = '̅';
const MAX = 999999;

const UNITS_MAP: string[] = ['', 'ⲁ', 'ⲃ', 'ⲅ', 'ⲇ', 'ⲉ', 'ⲋ', 'ⲍ', 'ⲏ', 'ⲑ'];

const TENS_MAP: string[] = ['', 'ⲓ', 'ⲕ', 'ⲗ', 'ⲙ', 'ⲛ', 'ⲝ', 'ⲟ', 'ⲡ', 'ϥ'];

const HUNDREDS_MAP: string[] = [
  '',
  'ⲣ',
  'ⲥ',
  'ⲧ',
  'ⲩ',
  'ⲫ',
  'ⲭ',
  'ⲯ',
  'ⲱ',
  'ⳁ',
];

/**
 *
 * @param letter
 * @param thousands
 */
function* digit(
  letter: string | undefined,
  thousands = false
): Generator<string> {
  if (!letter) {
    return;
  }
  if (thousands) {
    yield THOUSANDS_MARK;
    yield COMBINING_OVERLINE;
  }
  yield letter;
  yield COMBINING_OVERLINE;
}

/**
 * Converts an integer to Coptic numerals.
 * @param n The integer to convert.
 * @returns The Coptic numeral string.
 */
export function coptic(n: number): string {
  log.ensure(
    Number.isInteger(n) && n > 0 && n <= MAX,
    'Input must be between',
    1,
    'and',
    MAX
  );

  const num: string[] = [];

  /* eslint-disable no-magic-numbers */
  // TODO: (#0) Can we write the code below more elegantly. In a loop?
  num.push(...digit(HUNDREDS_MAP[Math.floor(n / 100000)], true));
  n %= 100000;
  num.push(...digit(TENS_MAP[Math.floor(n / 10000)], true));
  n %= 10000;
  num.push(...digit(UNITS_MAP[Math.floor(n / 1000)], true));
  n %= 1000;
  num.push(...digit(HUNDREDS_MAP[Math.floor(n / 100)]));
  n %= 100;
  num.push(...digit(TENS_MAP[Math.floor(n / 10)]));
  n %= 10;
  num.push(...digit(UNITS_MAP[n]));
  /* eslint-enable no-magic-numbers */

  return num.join('');
}
