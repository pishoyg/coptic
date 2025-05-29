/**
 * This package defines generics CSS helpers.
 */
/**
 *
 * @param classes
 * @returns
 */
export function classQuery(classes) {
  return classes.map((c) => `.${c}`).join(', ');
}
