/**
 *
 * @param url
 * @param external
 */
export function window_open(url, external = true) {
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
 * @param classes
 * @returns
 */
export function classQuery(classes) {
  return classes.map((c) => `.${c}`).join(', ');
}
/**
 *
 * @param el
 * @param tag
 * @param attrs
 */
export function moveElement(el, tag, attrs) {
  const copy = document.createElement(tag);
  copy.innerHTML = el.innerHTML;
  Array.from(el.attributes).forEach((att) => {
    copy.setAttribute(att.name, att.value);
  });
  Object.entries(attrs).forEach(([key, value]) => {
    copy.setAttribute(key, value);
  });
  el.parentNode.replaceChild(copy, el);
}
/**
 *
 * @param el
 * @param target
 */
export function makeSpanLinkToAnchor(el, target) {
  if (el.tagName !== 'SPAN') {
    console.warn(`Converting ${el.tagName} tag to <a> tag!`);
  }
  moveElement(el, 'a', { href: target });
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
 * @param page
 * @returns
 */
export function chopColumn(page) {
  if (['a', 'b'].some((c) => page.endsWith(c))) {
    page = page.slice(0, page.length - 1);
  }
  return page;
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
/**
 *
 * @param root
 * @param regex
 * @param url
 * @param classes
 * @param direct_parent_excluded_classes
 */
export function linkifyText(
  root,
  regex,
  url,
  classes,
  direct_parent_excluded_classes = []
) {
  const admit = (node) => {
    if (!node.nodeValue) {
      // The node has no text!
      return false;
    }
    if (!regex.test(node.nodeValue)) {
      // This text node doesn't match the regex.
      return false;
    }
    const parent = node.parentElement;
    if (!parent) {
      // We can't examine the parent tag name or classes for exclusions.
      // Accept the node.
      return true;
    }
    if (parent.tagName == 'a') {
      // The parent is already a link!
      return false;
    }
    if (
      direct_parent_excluded_classes.some((cls) =>
        parent.classList.contains(cls)
      )
    ) {
      // This parent is explicitly excluded.
      return false;
    }
    return true;
  };
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    (node) =>
      admit(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  );
  // We must store the replacements in a list because we can't mutate the DOM
  // while walking.
  const replacements = [];
  for (let node; (node = walker.nextNode()); ) {
    if (!node.nodeValue) {
      continue;
    }
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    const text = node.nodeValue;
    regex.lastIndex = 0;
    for (let match; (match = regex.exec(text)) !== null; ) {
      const query = match[0];
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index))
      );
      const link = document.createElement('span');
      link.classList.add(...classes);
      link.onclick = () => {
        window_open(url + query);
      };
      link.textContent = query;
      fragment.appendChild(link);
      lastIndex = match.index + query.length;
    }
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    replacements.push([node, fragment]);
  }
  replacements.forEach(([node, fragment]) => {
    node.replaceWith(fragment);
  });
}
