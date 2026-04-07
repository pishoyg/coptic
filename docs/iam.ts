/**
 * Package iam defines page identities.
 *
 * You can use iam to find out where in the website your code is running.
 */

/**
 * Where represents an identity.
 */
export type Identity =
  | 'note' // A Crum word.
  // NOTE: The 'card' class is added by Anki.
  // See https://docs.ankiweb.net/templates/styling.html.
  | 'card' // An Anki note.
  | 'lexicon' // Lexicon
  | 'index' // A Crum index page.
  | 'index_index' // A Crum index index page.
  | 'bible' // Bible
  | 'chapter'; // A Bible chapter.

/**
 * @param w - An identity.
 * @returns Whether the code is running in a page with this identity.
 */
export function amI(w: Identity): boolean {
  if (typeof document === 'undefined') {
    // The code is not running in the browser.
    // As of the time of writing, this package is imported by the unit test
    // runner, which is executed by a Node.js runtime, making this check
    // necessary.
    return false;
  }
  return document.body.classList.contains(w);
}
