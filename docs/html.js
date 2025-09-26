/** Package html defines DOM manipulation helpers. */
import * as browser from './browser.js';
import * as logger from './logger.js';
import * as css from './css.js';
import * as orth from './orth.js';
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
    logger.warn(`Converting ${el.tagName} tag to <a> tag!`);
  }
  moveElement(el, 'a', { href: target });
}
/**
 * For each text node in the given subtree, for each substring matching the
 * given regex, use the replace method to construct a replacement, and insert it
 * into the tree.
 *
 * NOTE: Regarding normalization:
 * - We search one node at a time. A string that matches the regex, but
 *   lives over two neighboring nodes, won't yield a match!
 * - We do not normalize the input in any way. This should be done by the
 *   caller.
 * - We will always normalize the output tree[1], even
 *   if the replacer produces an unnormalized tree. We do NOT, however,
 *   normalize the text. The replacer should therefore produce normalized text.
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
 *
 * @param root - Root of the tree to process.
 * @param regex - Regex to search for in the text nodes of the tree.
 * @param replace - A method to construct a fragment from a regex match
 * obtained with the regex above. Return null if no replacement is required.
 * @param exclude - An optional query specifying if any subtrees of
 * the given root should be excluded.
 */
export function replaceText(root, regex, replace, exclude) {
  // We can't replace nodes on the fly, as this could corrupt the walker.
  // Instead, we store all nodes that need replacement, and then process them
  // afterwards.
  const nodes = captureNodes(root, regex, exclude);
  nodes.forEach((node) => {
    if (exclude && node.parentElement?.closest(exclude)) {
      // Skip this node.
      // While we already accounted for the exclusions when we captured the node
      // array, it's possible that the tree structure has since changed, and
      // that the node should be excluded now.
      return;
    }
    const text = node.nodeValue;
    let lastIndex = 0;
    const fragment = document.createDocumentFragment();
    regex.lastIndex = 0;
    for (let match; (match = regex.exec(text)); ) {
      // Add preceding plain text.
      if (match.index > lastIndex) {
        fragment.append(text.slice(lastIndex, match.index));
      }
      lastIndex = match.index + match[0].length;
      const replacement = replace(
        match,
        text.slice(lastIndex),
        node.nextSibling
      ) ?? [match[0]];
      fragment.append(...replacement);
    }
    if (lastIndex < text.length) {
      fragment.append(text.slice(lastIndex));
    }
    // Normalize the fragment. Get rid of empty text node, and merge consecutive
    // text nodes.
    fragment.normalize();
    node.replaceWith(fragment);
  });
}
/**
 *
 * @param root
 * @param regex
 * @param exclude
 * @returns
 */
function captureNodes(root, regex, exclude) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    (node) => {
      if (!node.nodeValue?.match(regex)) {
        // This node doesn't contain a matching text.
        return NodeFilter.FILTER_REJECT;
      }
      if (exclude && node.parentElement?.closest(exclude)) {
        // This node is excluded.
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  );
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  return nodes;
}
/**
 * Search for all pieces of text under the given root that match the given
 * regex. For each match, use the provided method to construct a URL, and insert
 * a link in that piece of text.
 * Add the given list of classes to the link.
 * You can excluded certain subtrees of the given tree by providing a list of
 * classes which should be excluded. This excludes entire subtrees, not just
 * individual elements.
 *
 * @param root
 * @param regex
 * @param url
 * @param classes
 * @param excludedClasses
 */
export function linkifyText(root, regex, url, classes, excludedClasses = []) {
  replaceText(
    root,
    regex,
    (match) => {
      const targetUrl = url(match);
      if (!targetUrl) {
        // This text doesn't have a URL. Return the original text.
        return null;
      }
      // Create a link.
      const link = document.createElement('span');
      link.classList.add(...classes);
      link.textContent = match[0];
      link.addEventListener('click', () => {
        browser.open(targetUrl);
      });
      return [link];
    },
    css.classQuery(...excludedClasses)
  );
}
/**
 * 1. Normalize diacritics into NFD [2].
 * 2. Get rid of all superfluous space.
 * Such normalization is often necessary for text search logic to work
 * correctly.
 *
 * TODO: (#556) Consider having your HTML generation pipelines produce
 * NFD-normalized text in the first place.
 *
 * NOTE: We intentionally refrain from normalizing the tree[1] because we expect
 * our HTML to be tree-normalized already.
 *
 * @param root
 * [1] https://developer.mozilla.org/docs/Web/API/Node/normalize
 * [2] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize */ // eslint-disable-line max-len
export function normalize(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.nodeValue) {
      continue;
    }
    node.nodeValue = orth.normalize(node.nodeValue).replace(/\s+/g, ' ');
  }
}
