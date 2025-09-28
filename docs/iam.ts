/**
 * Package iam defines page identities.
 *
 * You can use iam to find out where in the website your code is running.
 */

/**
 * Where represents an identity.
 */
export type Identity =
  | 'UNKNOWN'
  | 'note' // A Crum word.
  | 'anki' // An Anki note.
  | 'lexicon' // Lexicon
  | 'index' // A Crum index page.
  | 'index_index' // A Crum index index page.
  | 'bible' // Bible
  | 'chapter'; // A Bible chapter.

// For Anki, we define a global const variable in the Anki JavaScript. Thus we
// can distinguish whether we're running on Anki by whether this variable is
// defined.
// For other types of pages, we add the page identity as a class in the <body>
// tag.
declare const ANKI: boolean;

/**
 * @param w - An identity.
 * @returns Whether the code is running in a page with this identity.
 */
export function amI(w: Identity): boolean {
  if (w === 'anki') {
    return typeof ANKI !== 'undefined';
  }
  return document.body.classList.contains(w);
}
