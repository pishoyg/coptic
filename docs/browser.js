/**
 * This package defines generic utilities for browser and UI actions and
 * navigation.
 */
/**
 *
 * @param url
 * @param external
 */
export function open(url, external = true) {
  if (!url) {
    return;
  }
  if (external) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  window.open(url, '_self');
}
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
/**
 * @param event
 */
export function stopPropagation(event) {
  event.stopPropagation();
}
/**
 *
 * @param id
 */
export function scroll(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
/**
 *
 * @param text
 */
export function yank(text) {
  void navigator.clipboard.writeText(text);
}
/**
 *
 * @param path
 * @returns
 */
export function stem(path) {
  return path.split('/').pop().replace('.html', '');
}
/**
 *
 * @param elem
 * @returns
 */
export function height(elem) {
  return elem.getBoundingClientRect().top + window.scrollY;
}
/**
 *
 * @param query
 * @param target
 * @returns
 */
export function findNextElement(query, target) {
  const elements = Array.from(document.querySelectorAll(query));
  elements.sort((a, b) =>
    target == 'prev' ? height(b) - height(a) : height(a) - height(b)
  );
  const currentScrollY = window.scrollY;
  return elements.find((element) =>
    target === 'prev'
      ? height(element) < currentScrollY - 10
      : target === 'next'
        ? height(element) > currentScrollY + 10
        : height(element) >= currentScrollY - 1
  );
}
/**
 *
 * @param query
 * @param target
 */
export function scrollToNextElement(query, target) {
  const elem = findNextElement(query, target);
  if (!elem) {
    return;
  }
  elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
/**
 *
 * @param id
 */
export function click(id) {
  document.getElementById(id).click();
}
/**
 *
 * @param id
 */
export function focus(id) {
  document.getElementById(id).focus();
}
