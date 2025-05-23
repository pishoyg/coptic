/**
 *
 * @param url
 * @param external
 */
export function window_open(url: string | null, external = true): void {
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
 * @param classes
 * @returns
 */
export function classQuery(classes: string[]): string {
  return classes.map((c) => `.${c}`).join(', ');
}

/**
 *
 * @param el
 * @param tag
 * @param attrs
 */
export function moveElement(
  el: Element,
  tag: string,
  attrs: Record<string, string>
): void {
  const copy = document.createElement(tag);
  copy.innerHTML = el.innerHTML;
  Array.from(el.attributes).forEach((att: Attr): void => {
    copy.setAttribute(att.name, att.value);
  });
  Object.entries(attrs).forEach(([key, value]: [string, string]): void => {
    copy.setAttribute(key, value);
  });
  el.parentNode!.replaceChild(copy, el);
}

/**
 *
 * @param el
 * @param target
 */
export function makeSpanLinkToAnchor(el: Element, target: string): void {
  if (el.tagName !== 'SPAN') {
    console.warn(`Converting ${el.tagName} tag to <a> tag!`);
  }
  moveElement(el, 'a', { href: target });
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
 *
 * @param query
 * @param target
 * @returns
 */
export function findNextElement(
  query: string,
  target: 'next' | 'prev' | 'cur'
): HTMLElement | undefined {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(query));
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
export function scrollToNextElement(
  query: string,
  target: 'next' | 'prev' | 'cur'
): void {
  const elem = findNextElement(query, target);
  if (!elem) {
    return;
  }
  elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 *
 * @param page
 * @returns
 */
export function chopColumn(page: string): string {
  if (['a', 'b'].some((c) => page.endsWith(c))) {
    page = page.slice(0, page.length - 1);
  }
  return page;
}
