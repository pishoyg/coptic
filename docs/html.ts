/** Package html defines DOM manipulation helpers. */
import * as css from './css.js';

/**
 *
 * @param href
 * @param external
 * @param {...any} children
 * @returns
 */
export function anchor(
  href: string,
  external?: boolean,
  ...children: (Node | string)[]
): HTMLAnchorElement {
  const a: HTMLAnchorElement = document.createElement('a');
  a.href = href;
  if (external ?? !href.startsWith('#')) {
    a.target = '_blank';
  }
  a.append(...children);
  return a;
}

/**
 *
 * @param el
 * @param href
 * @param external
 * @param {...any} classes
 *
 * TODO: (#0): Use this method more widely.
 */
export function linkify(
  el: HTMLElement,
  href: string,
  external?: boolean,
  ...classes: string[]
): void {
  const a: HTMLAnchorElement = anchor(href, external, ...el.childNodes);
  a.classList.add(...classes);
  el.append(a);
}

/**
 *
 * @param node
 * @param regex
 * @param replaceMatch
 * @returns
 */
export function replaceNode(
  node: Text,
  regex: RegExp,
  replaceMatch: (
    match: RegExpExecArray,
    node: Text,
    remainder: string,
    preceding: string,
    index: number
  ) => { replacement?: (Node | string)[]; remainder?: string }
): void {
  if (!node.nodeValue) {
    return;
  }

  let text: string = node.nodeValue;
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
    const preceding: string = text.slice(0, match.index);
    fragment.append(preceding);

    // The remainder is the text following the current match.
    const remainder: string = text.slice(match.index + match[0].length);

    // Call the replacer function to get the replacement and the new
    // remainder.
    const result = replaceMatch(
      match,
      node,
      remainder,
      preceding,
      node.nodeValue.length - text.length + match.index
    );

    // If a custom replacement is provided, insert it. Otherwise, insert the
    // original text.
    fragment.append(...(result.replacement ?? [match[0]]));

    // The string to search next is the remainder, which could've potentially
    // been overridden by the replacer.
    text = result.remainder ?? remainder;
  }

  // Normalize the fragment. Get rid of empty text nodes, and merge
  // consecutive text nodes.
  fragment.normalize();
  node.replaceWith(fragment);
}

/**
 *
 * @param root
 * @param exclude
 * @returns
 */
function* linkifyWalk(root: Node, exclude?: string): Generator<Text> {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return exclude && (node as Element).matches(exclude)
            ? // If this element matches the exclude selector, FILTER_REJECT
              // tells TreeWalker to discard this node AND its children.
              NodeFilter.FILTER_REJECT
            : // If it's a normal element, we don't want to yield the element
              // itself, but we DO want to visit its children.
              NodeFilter.FILTER_SKIP;
        }

        return node.nodeType === Node.TEXT_NODE
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
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
  Array.from(linkifyWalk(root, css.classQuery(...excludedClasses))).forEach(
    (node: Text): void => {
      replaceNode(
        node,
        regex,
        (match: RegExpExecArray): { replacement?: (Node | string)[] } => {
          const targetUrl: string | null = url(match);
          if (!targetUrl) {
            // This text doesn't have a URL. No replacements needed!
            return {};
          }

          // Create a link.
          const a = anchor(targetUrl, true, match[0]);
          a.classList.add(...classes);
          return { replacement: [a] };
        }
      );
    }
  );
}

/**
 * Squash space in text nodes.
 * Such normalization is often necessary for text search logic to work
 * correctly.
 *
 * NOTE:
 * 1. We intentionally refrain from normalizing the tree[1] because we expect
 * our HTML to be tree-normalized already.
 * 2. We also refrain from NFD-normalizing the text content [2], because our
 * pipelines generate NFD-normalized HTML.
 * 3. We don't expect our HTML to have comments or fragments. Only text and
 * element nodes are expected to be present.
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

/**
 *
 * @param html
 * @returns
 */
export function parse(html: string): NodeListOf<ChildNode> {
  return new DOMParser().parseFromString(html, 'text/html').body.childNodes;
}
