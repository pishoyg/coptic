/** Package browser defines generic browser and UI helpers. */

const SMALL_SCREEN_WIDTH = 500;

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
 * @returns Whether you're running on Firefox.
 */
export function firefox(): boolean {
  return navigator.userAgent.toLowerCase().includes('firefox');
}

/**
 * @returns
 */
export function smallScreen(): boolean {
  return window.innerWidth < SMALL_SCREEN_WIDTH;
}

/**
 *
 * @param rel - The name of the link.
 * @returns The `href` property of the link if found, or null if not found.
 */
export function getLinkHref(rel: 'next' | 'prev' | 'search'): string | null {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}

/**
 *
 * @param rel - The name of the link (such as `next`, `prev`, or `search`).
 * @param target - The value of the `target` parameter to pass to `window.open`.
 */
export function openLinkHref(
  rel: 'next' | 'prev' | 'search',
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
export function stopPropagation(event: Event): void {
  event.stopPropagation();
}

/**
 * @param event
 */
export function preventDefault(event: Event): void {
  event.preventDefault();
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

/**
 *
 */
export function removeFragment(): void {
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

/**
 * Copies the current page URL to the clipboard.
 * It specifically looks for an existing Text Fragment (#:~:text=) in the URL.
 * If found, it ensures that any dashes (-) within the text content are encoded
 * to %2D to comply with specific encoding requirements, while preserving
 * the syntax separators (-, and ,-).
 * This is to work around an issue in Chromium:
 * https://issues.chromium.org/issues/462468375
 * @returns
 */
export function urlWithFragment(): string {
  const href: string = window.location.href;

  let [baseURL, frag]: string[] = href.split('#:~:text=', 2);
  if (baseURL === undefined || frag === undefined) {
    [baseURL, frag] =
      performance
        .getEntriesByType('navigation')[0]
        ?.name.split('#:~:text=', 2) ?? [];
  }
  if (!baseURL || !frag) {
    return href;
  }

  return `${baseURL}#:~:text=${frag.replace(/(?<!,)-(?!,)/g, '%2D')}`;
}

/**
 * Update the given URL parameter.
 *
 * @param name
 * @param value
 */
export function setParam(
  name: string,
  value: string | boolean | undefined | null
): void {
  const url = new URL(window.location.href);
  if (!value) {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, String(value));
  }
  window.history.replaceState('', '', url.toString());
}

/**
 * @param textStart
 * @param prefix
 * @param suffix
 * @returns
 */
export function fragment(textStart: string, prefix = '', suffix = ''): string {
  /**
   *
   * @param text
   * @returns
   */
  function encode(text: string): string {
    // The dash requires special handling, because it doesn't get encoded by
    // default, and it needs to be encoded in order for text fragments to work
    // correctly.
    return encodeURIComponent(text).replaceAll('-', '%2D');
  }

  textStart = textStart.trim();
  prefix = prefix.trim();
  suffix = suffix.trim();

  let frag: string = encode(textStart);
  if (prefix) {
    frag = `${encode(prefix)}-,${frag}`;
  }
  if (suffix) {
    frag = `${frag},-${encode(suffix)}`;
  }
  return frag;
}
