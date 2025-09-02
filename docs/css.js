/** Package css defines generic CSS helpers. */
/**
 * @param classes - A list of HTML classes.
 * @returns A query that matches all elements belonging to ANY of the given
 * classes.
 */
export function classQuery(...classes) {
  return classes.map((c) => `.${c}`).join(', ');
}
/**
 *
 * @param selector
 * @param opacity
 */
export function setOpacity(selector, opacity) {
  document.querySelectorAll(selector).forEach((el) => {
    el.style.opacity = opacity;
  });
}
/**
 *
 * @param selector
 * @param display
 */
export function setDisplay(selector, display) {
  document.querySelectorAll(selector).forEach((el) => {
    el.style.display = display;
  });
}
