/** Package css defines generic CSS helpers. */

/**
 *
 * @param classes
 * @param sep
 * @returns
 */
function join(classes: string[], sep: string): string {
  return classes.map((c: string): string => `.${c}`).join(sep);
}

/**
 * @param classes - A list of HTML classes.
 * @returns A query that matches all elements belonging to ANY of the given
 * classes.
 */
export function disjunction(...classes: string[]): string {
  return join(classes, ', ');
}

/**
 * @param classes - A list of HTML classes.
 * @returns A query that matches all elements belonging to ANY of the given
 * classes.
 */
export function conjunction(...classes: string[]): string {
  return join(classes, '');
}

/**
 *
 * @param {...any} classes
 * @returns
 */
export function nested(...classes: string[]): string {
  return join(classes, ' ');
}
