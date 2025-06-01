/**
 * Package iam defines page identities.
 *
 * You can use iam to determine where the code is running.
 */
/**
 * @returns The identity of the page where the code is executed.
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
 * @param w - An identity.
 * @returns Whether the code is running in a page with this identity.
 */
export function amI(w) {
  return where() === w;
}
