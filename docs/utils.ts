/**
 *
 * @param rel
 */
export function getLinkHref(rel: string): string | null {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}

/**
 *
 * @param rel
 * @param target
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
 *
 */
export function openNextLink(): void {
  openLinkHref('next');
}

/**
 *
 */
export function openPrevLink(): void {
  openLinkHref('prev');
}

/**
 *
 */
export function openSearchLink(): void {
  openLinkHref('search', '_blank');
}
