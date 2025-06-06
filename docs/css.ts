/**
 * This package defines generics CSS helpers.
 */

/**
 * @param classes - A list of HTML classes.
 * @returns A query that matches all elements belonging to ANY of the given
 * classes.
 */
export function classQuery(...classes: string[]): string {
  return classes.map((c) => `.${c}`).join(', ');
}
