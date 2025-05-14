/**
 *
 * @param rel
 */
export function getLinkHref(rel) {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}
/**
 *
 * @param rel
 * @param target
 */
export function openLinkHref(rel, target = '_self') {
  const href = getLinkHref(rel);
  if (href) {
    window.open(href, target);
  }
}
/**
 *
 */
export function openNextLink() {
  openLinkHref('next');
}
/**
 *
 */
export function openPrevLink() {
  openLinkHref('prev');
}
/**
 *
 */
export function openSearchLink() {
  openLinkHref('search', '_blank');
}
