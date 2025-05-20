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
