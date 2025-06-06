/**
 * This package defines generic DOM manipulation utilities.
 */
import * as browser from './browser.js';
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
      link.addEventListener('click', () => {
        browser.open(url + query);
      });
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
