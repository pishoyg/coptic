/** Package html defines DOM manipulation helpers. */
import * as browser from './browser.js';
import * as log from './logger.js';
import * as css from './css.js';

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
    log.warn(`Converting ${el.tagName} tag to <a> tag!`);
  }
  moveElement(el, 'a', { href: target });
}

/**
 * For each text node in the given subtree, for each substring matching the
 * given regex, use the replace method to construct a replacement, and insert it
 * into the tree.
 * We process one match at a time, providing the replacer with both the match
 * and the remainder of the string. You have the option to provide a
 * replacement, but also to override the remainder if needed.
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
 * @param replace - A method to construct a fragment from a regex match.
 * It should return an object containing the `replacement` nodes/strings
 * and a `remainder` string to be searched for subsequent matches.
 * Return an empty object if no special replacement is required.
 * @param exclude - An optional query specifying if any subtrees of
 * the given root should be excluded.
 */
export function replaceText(
  root: Node,
  regex: RegExp,
  replace: (
    match: RegExpExecArray,
    remainder: string,
    nextSibling: ChildNode | null
  ) => { replacement?: Node; remainder?: string },
  exclude?: string
): void {
  // We can't replace nodes on the fly, as this could corrupt the walker.
  // Instead, we capture all nodes that need replacement, and then process them
  // afterwards.
  Array.from(filterNodes(root, regex, exclude)).forEach((node: Text): void => {
    if (exclude && node.parentElement?.closest(exclude)) {
      // Skip this node.
      // While we already accounted for the exclusions when we captured the node
      // array, it's possible that the tree structure has since changed, and
      // that a node that was previously admitted should now be excluded.
      return;
    }

    let text: string = node.nodeValue!;
    const fragment: DocumentFragment = document.createDocumentFragment();

    // Loop as long as there is text to process.
    while (text.length > 0) {
      regex.lastIndex = 0; // Reset regex state for searching the new text.
      const match: RegExpExecArray | null = regex.exec(text);

      if (!match) {
        // No more matches in the current text. Append the rest and stop.
        fragment.append(text);
        break;
      }

      // Add the plain text that precedes the match.
      fragment.append(text.slice(0, match.index));

      // The remainder is the text following the current match.
      const remainder: string = text.slice(match.index + match[0].length);

      // Call the replacer function to get the replacement and the new
      // remainder.
      const result = replace(match, remainder, node.nextSibling);

      // If a custom replacement is provided, insert it. Otherwise, insert the
      // original text.
      fragment.append(result.replacement ?? match[0]);

      // The string to search next is the remainder, which could've potentially
      // been overridden by the replacer.
      text = result.remainder ?? remainder;
    }

    // Normalize the fragment. Get rid of empty text nodes, and merge
    // consecutive text nodes.
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
function* filterNodes(
  root: Node,
  regex: RegExp,
  exclude?: string
): Generator<Text> {
  const walker: TreeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    (node: Node): number => {
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

  while (walker.nextNode()) {
    yield walker.currentNode as Text;
  }
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
    (match: RegExpExecArray): { replacement?: Node } => {
      const targetUrl = url(match);
      if (!targetUrl) {
        // This text doesn't have a URL. Return the original text.
        return {};
      }

      // Create a link.
      const link = document.createElement('span');
      link.classList.add(...classes);
      link.textContent = match[0];
      link.addEventListener('click', () => {
        browser.open(targetUrl);
      });
      return { replacement: link };
    },
    css.classQuery(...excludedClasses)
  );
}

/**
 * Squash space in text nodes.
 * Such normalization is often necessary for text search logic to work
 * correctly.
 *
 * NOTE: We intentionally refrain from normalizing the tree[1] because we expect
 * our HTML to be tree-normalized already.
 * We also refrain from NFD-normalizing the text content [2], because our
 * pipelines generate NFD-normalized HTML.
 *
 * @param root
 * [1] https://developer.mozilla.org/docs/Web/API/Node/normalize
 * [2] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize */ // eslint-disable-line max-len
export function normalize(root: HTMLElement = document.body): void {
  const walker: TreeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT
  );
  while (walker.nextNode()) {
    const node: Node = walker.currentNode;
    if (!node.nodeValue) {
      continue;
    }
    node.nodeValue = node.nodeValue.replace(/\s+/g, ' ');
  }
}
