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
    logger.warn(`Converting ${el.tagName} tag to <a> tag!`);
  }
  moveElement(el, 'a', { href: target });
}

/**
 * Normalize and search the text of all nodes under the given root. For each
 * substring (of the normalized text) matching the given regex, use the replace
 * method to construct a replacement, and insert it into the tree.
 *
 * NOTE: We search one node at a time. A string that matches the regex, but
 * lives over two neighboring nodes, won't yield a match!
 * We normalize the following:
 * - The text (adopting a standard notation for diacritics, and removing
 *   superfluous space that doesn't render in the HTML).
 * - The return trees (even if the replace method yields an unnormalized tree,
 *   we will normalize it).
 * However, we do NOT normalize the input tree. Consider calling
 * `root.normalize()` prior to invoking this method.
 *
 * @param root - Root of the tree to process.
 * @param regex - Regex to search for in the text nodes of the tree.
 * @param replace - A method to construct a fragment from a regex match
 * obtained with the regex above. Return null if no replacement is required.
 * @param excludeClosestQuery - An optional query specifying if any subtrees of
 * the given root should be excluded.
 */
export function replaceText(
  root: Node,
  regex: RegExp,
  replace: (match: RegExpExecArray) => (Node | string)[] | null,
  excludeClosestQuery?: string
): void {
  const walker: TreeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    (node: Node): number => {
      node.nodeValue = orth
        .normalize(node.nodeValue ?? '')
        .replace(/\s+/g, ' ');
      if (!node.nodeValue.match(regex)) {
        // This node doesn't contain a matching text.
        return NodeFilter.FILTER_REJECT;
      }
      if (
        excludeClosestQuery &&
        node.parentElement?.closest(excludeClosestQuery)
      ) {
        // This node is excluded.
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  );

  // We can't replace nodes on the fly, as this could corrupt the walker.
  // Instead, we store all nodes that need replacement, and then process them
  // afterwards.
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  nodes.forEach((node: Text): void => {
    const text: string = node.nodeValue!;
    let lastIndex = 0;
    const fragment: DocumentFragment = document.createDocumentFragment();

    regex.lastIndex = 0;
    for (let match: RegExpExecArray | null; (match = regex.exec(text)); ) {
      // Add preceding plain text.
      if (match.index > lastIndex) {
        fragment.append(text.slice(lastIndex, match.index));
      }

      fragment.append(...(replace(match) ?? [match[0]]));
      lastIndex = match.index + match[0].length;
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
export function linkifyText(
  root: Node,
  regex: RegExp,
  url: (match: RegExpExecArray) => string | null,
  classes: string[],
  excludedClasses: string[] = []
): void {
  replaceText(
    root,
    regex,
    (match: RegExpExecArray): (Node | string)[] | null => {
      const targetUrl = url(match);
      if (!targetUrl) {
        // This text doesn't have a URL. Return the original text.
        return null;
      }

      // Create a link.
      const link = document.createElement('span');
      link.classList.add(...classes);
      link.innerText = match[0];
      link.addEventListener('click', () => {
        browser.open(targetUrl);
      });
      return [link];
    },
    css.classQuery(...excludedClasses)
  );
}
