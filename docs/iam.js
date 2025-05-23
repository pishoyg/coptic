/**
 * @returns
 */
export function where() {
  if (typeof ANKI !== 'undefined') {
    return 'anki';
  }
  if (document.body.classList.contains('lexicon')) {
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
 * @param w
 * @returns
 */
export function amI(w) {
  return where() === w;
}
