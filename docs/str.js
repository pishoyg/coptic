/**
 * Check whether the given text is upper-case.
 * NOTE: If the text doesn't contain any "casable" characters, return true.
 *
 * @param s - string to check
 * @returns - Whether the string is in upper-case.
 */
export function isUpper(s) {
  return s.toUpperCase() === s;
}
/**
 * Check whether the given text is lower-case.
 * NOTE: If the text doesn't contain any "casable" characters, return true.
 *
 * @param s - string to check
 * @returns - Whether the string is in lower-case.
 */
export function isLower(s) {
  return s.toLowerCase() === s;
}
/**
 * @param text
 * @returns
 */
export function toggleCase(text) {
  return Array.from(text)
    .map((ch) => (isUpper(ch) ? ch.toLowerCase() : ch.toUpperCase()))
    .join('');
}
