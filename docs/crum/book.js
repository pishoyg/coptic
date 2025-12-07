/* In the book, the Additions and Corrections range from page xv to page xxiv in
 * the introduction, immediately preceding page 1 which starts the body of the
 * book.
 *
 * In other words, Addenda range from pages -9 to page 0.
 */
const ADDENDA_START = -9;
const ADDENDA_PAGES = [
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
export const ADDENDA_ROMAN_TO_INT = Object.fromEntries(
  ADDENDA_PAGES.map((item, index) => [item, ADDENDA_START + index])
);
