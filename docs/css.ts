/**
 * This package defines generics CSS helpers.
 */

/**
 *
 * @param classes
 * @returns
 */
export function classQuery(classes: string[]): string {
  return classes.map((c) => `.${c}`).join(', ');
}
