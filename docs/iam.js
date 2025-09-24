/**
 * Package iam defines page identities.
 *
 * You can use iam to find out where in the website your code is running.
 */
/**
 * @param w - An identity.
 * @returns Whether the code is running in a page with this identity.
 */
export function amI(w) {
  if (w === 'anki') {
    return typeof ANKI !== 'undefined';
  }
  return document.body.classList.contains(w);
}
