/** Package css defines generic CSS helpers. */

/**
 * @param classes - A list of HTML classes.
 * @returns A query that matches all elements belonging to ANY of the given
 * classes.
 */
export function classQuery(...classes: string[]): string {
  return classes.map((c) => `.${c}`).join(', ');
}

/**
 *
 * @param selector
 * @param opacity
 */
export function setOpacity(selector: string, opacity: string): void {
  document
    .querySelectorAll<HTMLElement>(selector)
    .forEach((el: HTMLElement): void => {
      el.style.opacity = opacity;
    });
}

// TODO: (#498) Allow visibility to assume more values.
export type Visibility = 'block' | 'none';
/**
 *
 * @param selector
 * @param display
 */
export function setDisplay(selector: string, display: Visibility): void {
  document
    .querySelectorAll<HTMLElement>(selector)
    .forEach((el: HTMLElement): void => {
      el.style.display = display;
    });
}
