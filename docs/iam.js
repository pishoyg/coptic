/**
 * Package iam defines page identities.
 *
 * You can use iam to find out where in the website your code is running.
 */
var CLS;
(function (CLS) {
  // LEXICON is a class of the <body> tag of the Lexicon page.
  CLS['LEXICON'] = 'lexicon';
})(CLS || (CLS = {}));
/**
 * @returns The identity of the page where the code is executed.
 */
export function where() {
  if (typeof ANKI !== 'undefined') {
    return 'anki';
  }
  if (document.body.classList.contains(CLS.LEXICON)) {
    return 'lexicon';
  }
  if (typeof NOTE !== 'undefined') {
    return 'note';
  }
  if (typeof INDEX !== 'undefined') {
    return 'index';
  }
  if (typeof INDEX_INDEX !== 'undefined') {
    return 'index_index';
  }
  return 'UNKNOWN';
}
/**
 * @param w - An identity.
 * @returns Whether the code is running in a page with this identity.
 */
export function amI(w) {
  return where() === w;
}
