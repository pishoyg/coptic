/** Package browser defines generic browser and UI helpers. */

/**
 *
 * @param url
 * @param external
 */
export function open(url: string | null | undefined, external = true): void {
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
export function getLinkHref(rel: string): string | null {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}

/**
 *
 * @param rel - The name of the link (such as `next`, `prev`, or `search`).
 * @param target - The value of the `target` parameter to pass to `window.open`.
 */
export function openLinkHref(
  rel: string,
  target: '_self' | '_blank' = '_self'
): void {
  const href = getLinkHref(rel);
  if (href) {
    window.open(href, target);
  }
}

/**
 * Open the link marked as "next" in the HTML page.
 */
export function openNextLink(): void {
  openLinkHref('next');
}

/**
 * Open the link marked as "prev" in the HTML page.
 */
export function openPrevLink(): void {
  openLinkHref('prev');
}

/**
 * Open the link marked as "search" in the HTML page.
 */
export function openSearchLink(): void {
  openLinkHref('search', '_blank');
}

/**
 * @returns
 */
export async function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * @param event
 */
export function stopPropagation(event: KeyboardEvent) {
  event.stopPropagation();
}

/**
 *
 * @param id
 */
export function scroll(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/**
 *
 * @param text
 */
export function yank(text: string): void {
  void navigator.clipboard.writeText(text);
}

/**
 *
 * @param path
 * @returns
 */
export function stem(path: string): string {
  return path.split('/').pop()!.replace('.html', '');
}

/**
 *
 * @param elem
 * @returns
 */
export function height(elem: HTMLElement): number {
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
export function findNextElement(
  query: string,
  target: 'next' | 'prev' | 'cur'
): HTMLElement | undefined {
  const MIN_DELTA = 10;

  const currentHeight: number = window.scrollY;

  const delta = (el: HTMLElement): number => {
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

  return Array.from(document.querySelectorAll<HTMLElement>(query)).reduce(
    (best, el) => (delta(el) < delta(best) ? el : best)
  );
}

/**
 *
 * @param query
 * @param target
 */
export function scrollToNextElement(
  query: string,
  target: 'next' | 'prev' | 'cur'
): void {
  const elem = findNextElement(query, target);
  elem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 *
 * @param id
 */
export function click(id: string): void {
  document.getElementById(id)?.click();
}

/**
 *
 * @param id
 */
export function focus(id: string): void {
  document.getElementById(id)?.focus();
}
