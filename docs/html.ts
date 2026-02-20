/** Package html defines DOM manipulation helpers. */
import * as css from './css.js';

/**
 * Creates an anchor element with the specified href and children.
 *
 * @param href - The URL that the hyperlink points to.
 * @param external - Whether the link should open in a new tab. Defaults to true
 * if the href doesn't start with '#'.
 * @param children - The children nodes or strings to append to the anchor.
 * @returns The created HTMLAnchorElement.
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
 * Wraps the children of an element with an anchor tag.
 *
 * @param el - The element whose children should be linkified.
 * @param href - The URL that the hyperlink points to.
 * @param external - Whether the link should open in a new tab.
 * @param classes - Additional CSS classes to add to the anchor.
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
 * Replaces text content within a single Text node based on a regex.
 *
 * @param node - The Text node to process.
 * @param regex - The regular expression to search for.
 * @param replaceMatch - A callback function that takes the match and returns an
 * array of Nodes or strings to replace it with.
 */
export function replaceNode(
  node: Text,
  regex: RegExp,
  replaceMatch: (match: RegExpExecArray) => (Node | string)[] | undefined
): void {
  if (!node.nodeValue) {
    return;
  }

  let text: string = node.nodeValue;
  const fragment: DocumentFragment = document.createDocumentFragment();

  // Loop as long as there is text to process.
  while (text) {
    regex.lastIndex = 0; // Reset regex state for searching the new text.
    const match: RegExpExecArray | null = regex.exec(text);

    if (!match) {
      // No more matches in the current text. Append the rest and stop.
      fragment.append(text);
      break;
    }

    fragment.append(
      // Add the plain text that precedes the match.
      text.slice(0, match.index),
      // If a custom replacement is provided, insert it. Otherwise, insert the
      // original text.
      ...(replaceMatch(match) ?? [match[0]])
    );

    // The string to search next is the remainder.
    text = text.slice(match.index + match[0].length);
  }

  // Normalize the fragment. Get rid of empty text nodes, and merge
  // consecutive text nodes.
  fragment.normalize();
  node.replaceWith(fragment);
}

/**
 *
 */
export class Chain {
  /**
   *
   * @param nodes
   */
  public constructor(public readonly nodes: Node[]) {}

  /**
   * Generates slices of nodes corresponding to the range [start, end) in the
   * concatenated text.
   *
   * @param start - The start index in the concatenated text.
   * @param end - The end index in the concatenated text.
   * @yields The sliced nodes.
   */
  public *substring(start: number, end: number): Generator<Node> {
    if (end <= start) {
      return;
    }

    let currentPos = 0;
    for (const node of this.nodes) {
      const text = node.textContent ?? '';
      const nodeStart = currentPos;
      const nodeEnd = currentPos + text.length;
      currentPos = nodeEnd;

      if (nodeEnd <= start) {
        continue;
      }
      if (nodeStart >= end) {
        break;
      }

      // TODO: (#0) Could we consider an alternative solution that doesn't
      // involve cloning?
      const clone = node.cloneNode(false);
      clone.textContent = text.substring(
        Math.max(nodeStart, start) - nodeStart,
        Math.min(nodeEnd, end) - nodeStart
      );
      yield clone;
    }
  }

  /**
   * @returns
   */
  public text(): string {
    return this.nodes.map((n: Node): string => n.textContent ?? '').join('');
  }

  /**
   *
   * @param fragment
   */
  public replace(fragment: DocumentFragment): void {
    this.nodes[0]!.parentNode!.insertBefore(fragment, this.nodes[0]!);
    this.nodes.forEach((n) => {
      (n as ChildNode).remove();
    });
  }
}

/**
 * Context provided to the replacer function in replaceNodes.
 */
export class ReplaceNodesContext {
  /**
   * @param chain
   * @param match
   * @param fragment
   * @param index
   * @param remainder
   * @param preceding
   */
  public constructor(
    /** The nodes in the chain being processed. */
    private readonly chain: Chain,

    /** The current match. */
    public readonly match: RegExpExecArray,

    /** The document fragment where the replacement is being built.
     * This should contain the replacements for the chain prefix that precedes
     * the current match, but not (yet) the match itself or the remainder.
     */
    private readonly fragment: DocumentFragment,

    /** The 0-based index of the match in the concatenated text.
     */
    private readonly index: number,

    /** The text remaining after the current match. */
    public readonly remainder: string,

    /** The text preceding the current match. */
    public readonly preceding: string
  ) {}

  /**
   * Generates the nodes corresponding to a piece of the concatenated text,
   * starting at the current match.
   * Thus, `this.substring(this.match[0].length)` should generate nodes that
   * correspond precisely to the current match.
   *
   * @param length - The length of the text to consume.
   * @param offset - Optional offset from the start of the current match.
   * @returns A generator containing the sliced nodes.
   */
  public *substring(length: number, offset = 0): Generator<Node> {
    const start = this.index + offset;
    yield* this.chain.substring(start, start + length);
  }

  /**
   * Yields nodes preceding the current match, starting from the last node
   * appended to the fragment, then continuing to the siblings preceding the
   * first node of the chain.
   *
   * @yields The preceding nodes.
   */
  public *matchPreviousSiblings(): Generator<Node> {
    for (
      let curr: Node | null =
        this.fragment.lastChild ?? this.chain.nodes[0]!.previousSibling;
      curr;
      curr =
        curr.previousSibling ??
        (curr.parentNode === this.fragment
          ? this.chain.nodes[0]!.previousSibling
          : null)
    ) {
      yield curr;
    }
  }

  /**
   * @returns The next sibling of the last node in the chain, if it exists.
   */
  public get chainNextSibling(): Node | undefined | null {
    return this.chain.nodes[this.chain.nodes.length - 1]?.nextSibling;
  }
}

/**
 * Result returned by the replacer function in replaceNodes.
 */
export interface ReplaceNodesResult {
  /** Optional array of nodes or strings to replace the match with. */
  replacement?: (Node | string)[];
  /**
   * Optional offset from the end of the current match. If omitted, searching
   * continues after the match.
   */
  munch?: number | undefined;
}

// TODO: (#0) Write a more elegant implementation of `replaceNodes`:
// - Replace the `substring` method of the `Chain` class with a `prefix` method
//   that always chops off a prefix of the chain.
// - Get rid of the `munch` return parameter, and have the chain / context keep
//   track of the length of string munched from the remainder.
// - Have the context object update itself on each munch, instead of creating a
//   new context object each time.
// - Since the chain will get distorted, keep a reference to the previousSibling
//   of the first node, and the nextSibling of the last node, so we can
//   implement the methods that use them.
// - Avoid cloning nodes whenever possible.

/**
 * Replaces text content across a chain of contiguous nodes (Text or Element).
 * This is useful when the text to be replaced spans multiple nodes.
 *
 * The function concatenates the text content of all nodes, searches for
 * matches, and then reconstructs the DOM by cloning nodes and applying
 * replacements.
 *
 * @param chain - A chain representing a list of contiguous sibling nodes.
 * @param regex - The regular expression to search for.
 * @param replaceMatch - A callback function that handles matches.
 */
export function replaceNodes(
  chain: Chain,
  regex: RegExp,
  replaceMatch: (context: ReplaceNodesContext) => ReplaceNodesResult
): void {
  const fragment: DocumentFragment = document.createDocumentFragment();

  for (let cursor = 0, remainder: string = chain.text(); remainder; ) {
    regex.lastIndex = 0;
    const match = regex.exec(remainder);
    if (!match) {
      fragment.append(...chain.substring(cursor, cursor + remainder.length));
      break;
    }

    const matchStart = cursor + match.index;
    const matchEnd = matchStart + match[0].length;
    fragment.append(...chain.substring(cursor, matchStart));

    const preceding = remainder.slice(0, match.index);
    remainder = remainder.slice(match.index + match[0].length);
    const result = replaceMatch(
      new ReplaceNodesContext(
        chain,
        match,
        fragment,
        matchStart,
        remainder,
        preceding
      )
    );

    fragment.append(
      ...(result.replacement ?? chain.substring(matchStart, matchEnd))
    );

    cursor = matchEnd + (result.munch ?? 0);
    remainder = remainder.slice(result.munch ?? 0);
  }

  fragment.normalize();
  chain.replace(fragment);
}

/**
 * Walks the tree and yields all Text nodes that are not excluded.
 *
 * @param root - The root node to start the walk from.
 * @param exclude - A CSS selector for elements to exclude from the walk.
 * @yields Text nodes found during the walk.
 */
function* linkifyWalk(root: Node, exclude?: string): Generator<Text> {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    (node: Node): number => {
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
 *
 * You can excluded certain subtrees of the given tree by providing a list of
 * classes which should be excluded. This excludes entire subtrees, not just
 * individual elements.
 *
 * @param root - The root node to search within.
 * @param regex - The regular expression to search for.
 * @param url - A function that constructs a URL from a match.
 * @param classes - Additional CSS classes to add to the created links.
 * @param excludedClasses - A list of CSS classes for subtrees to exclude.
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
        (match: RegExpExecArray): (Node | string)[] | undefined => {
          const targetUrl: string | null = url(match);
          if (!targetUrl) {
            // This text doesn't have a URL. No replacements needed!
            return undefined;
          }

          // Create a link.
          const a = anchor(targetUrl, true, match[0]);
          a.classList.add(...classes);
          return [a];
        }
      );
    }
  );
}

/**
 * Squash space in text nodes within the given root.
 * Such normalization is often necessary for text search logic to work
 * correctly.
 *
 * NOTE:
 * 1. We intentionally refrain from normalizing the tree because we expect
 * our HTML to be tree-normalized already.
 * 2. We also refrain from NFD-normalizing the text content, because our
 * pipelines generate NFD-normalized HTML.
 * 3. We don't expect our HTML to have comments or fragments. Only text and
 * element nodes are expected to be present.
 *
 * @param root - The root element to normalize. Defaults to document.body.
 */
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
 * Parses an HTML string into a NodeList of child nodes.
 *
 * @param html - The HTML string to parse.
 * @returns A NodeList containing the parsed child nodes.
 */
export function parse(html: string): NodeListOf<ChildNode> {
  return new DOMParser().parseFromString(html, 'text/html').body.childNodes;
}
