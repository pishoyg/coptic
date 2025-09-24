/** Package browser defines generic browser and UI helpers. */
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
 * @param rel - The name of the link.
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
 * @param event
 */
export function preventDefault(event) {
  event.preventDefault();
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
 * Find the next, previous, or current element in the page, that matches the
 * given query.
 *
 * @param query - The query to filter elements.
 * @param target - The target.
 * @returns The requested element. If none matches the query, returns undefined.
 */
export function findNextElement(query, target) {
  const MIN_DELTA = 10;
  const currentHeight = window.scrollY;
  const delta = (el) => {
    const elementHeight = height(el);
    if (target === 'cur') {
      return Math.abs(currentHeight - elementHeight);
    }
    if (target === 'next' && elementHeight > currentHeight + MIN_DELTA) {
      return elementHeight - currentHeight;
    }
    if (target === 'prev' && elementHeight < currentHeight - MIN_DELTA) {
      return currentHeight - elementHeight;
    }
    return Infinity;
  };
  return Array.from(document.querySelectorAll(query)).reduce((best, el) =>
    delta(el) < delta(best) ? el : best
  );
}
/**
 *
 * @param query
 * @param target
 */
export function scrollToNextElement(query, target) {
  const elem = findNextElement(query, target);
  elem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
/**
 *
 * @param id
 */
export function click(id) {
  document.getElementById(id)?.click();
}
/**
 *
 * @param id
 */
export function focus(id) {
  document.getElementById(id)?.focus();
}
/**
 *
 */
export function removeFragment() {
  // Remove the URL fragment.
  // NOTE: We only reload when we actually detect an anchor (hash) or text
  // fragment in order to minimize disruption. Reloading the page causes a
  // small jitter.
  // NOTE: `url.hash` doesn't include text fragments (`#:~:text=`),
  // which is why we need to use `performance.getEntriesByType('navigation')`.
  // However, the latter doesn't always work, for some reason. In our
  // experience, it can retrieve the text fragment once, but if you reset and
  // then add a text fragment manually, it doesn't recognize it! This is not a
  // huge issue right now, so we aren't prioritizing fixing it!
  const url = new URL(window.location.href);
  if (
    !url.hash &&
    !performance.getEntriesByType('navigation')[0]?.name.includes('#')
  ) {
    return;
  }
  url.hash = '';
  window.history.replaceState('', '', url.toString());
  // Reload to get rid of the highlighting caused by the hash / fragment,
  // if any.
  window.location.reload();
}
