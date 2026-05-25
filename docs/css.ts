/** Package css defines generic CSS helpers. */

/**
 *
 * @param cls
 * @returns
 */
export function c(cls: string): string {
  return `.${cls}`;
}

/**
 * @param classes - A list of HTML classes.
 * @returns A query that matches all elements belonging to ANY of the given
 * classes.
 */
export function disjunction(...classes: string[]): string {
  return classes.map(c).join(', ');
}

/**
 * @param classes - A list of HTML classes.
 * @returns A query that matches all elements belonging to ANY of the given
 * classes.
 */
export function conjunction(...classes: string[]): string {
  return classes.map(c).join('');
}

/**
 *
 * @param {...any} classes
 * @returns
 */
export function nested(...classes: string[]): string {
  return classes.map(c).join(' ');
}
