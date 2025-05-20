/**
 *
 * @param rel - The name of the link (such as `next`, `prev`, or `search`).
 * @returns The `href` property of the link if found, or null if not found.
 */
export function getLinkHref(rel) {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}
/**
 *
 * @param rel - The name of the link (such as `next`, `prev`, or `search`).
 * @param target - The value of the `target` parameter to pass to `window.open`.
 */
export function openLinkHref(rel, target = '_self') {
  const href = getLinkHref(rel);
  if (href) {
    window.open(href, target);
  }
}
/**
 * Open the link marked as "next" in the HTML page.
 */
export function openNextLink() {
  openLinkHref('next');
}
/**
 * Open the link marked as "prev" in the HTML page.
 */
export function openPrevLink() {
  openLinkHref('prev');
}
/**
 * Open the link marked as "search" in the HTML page.
 */
export function openSearchLink() {
  openLinkHref('search', '_blank');
}
/**
 * @returns
 */
export async function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
