/**
 * Package iam defines page identities.
 *
 * You can use iam to determine where the code is running.
 */

export type Where =
  | 'UNKNOWN'
  | 'note' // A Crum word.
  | 'anki' // An Anki note.
  | 'lexicon' // Lexicon
  | 'index' // A Crum index page.
  | 'index_index'; // A Crum index index page.

enum CLS {
  // LEXICON is a class of the <body> tag of the Lexicon page.
  LEXICON = 'lexicon',
}

declare const NOTE: boolean;
declare const ANKI: boolean;
declare const INDEX: boolean;
declare const INDEX_INDEX: boolean;

/**
 * @returns The identity of the page where the code is executed.
 */
export function where(): Where {
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
export function amI(w: Where): boolean {
  return where() === w;
}
