/** Package html defines DOM manipulation helpers. */
import * as css from './css.js';
import * as log from './logger.js';

/**
 * Creates an anchor element with the specified href and children.
 *
 * An href that doesn't start with '#' is treated as external: the link opens
 * in a new tab and carries `rel="noopener noreferrer"`. Same-page anchors
 * (`#...`) get neither.
 *
 * @param href - The URL that the hyperlink points to.
 * @param children - The children nodes or strings to append to the anchor.
 * @returns The created HTMLAnchorElement.
 */
export function anchor(
  href: string,
  ...children: (Node | string)[]
): HTMLAnchorElement {
  const a: HTMLAnchorElement = document.createElement('a');
  a.href = href;
  if (!href.startsWith('#')) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  a.append(...children);
  return a;
}

/**
 * @param children
 * @returns
 */
export function span(...children: (Node | string)[]): HTMLSpanElement {
  const s: HTMLSpanElement = document.createElement('span');
  s.append(...children);
  return s;
}

/**
 *
 * @param content
 * @param flag
 * @returns
 */
export function maybeI(content: Node | string, flag?: boolean): Node | string {
  if (!flag) {
    return content;
  }
  const i: HTMLElement = document.createElement('i');
  i.append(content);
  return i;
}

/**
 * Wraps the children of an element with an anchor tag.
 *
 * @param el - The element whose children should be linkified.
 * @param href - The URL that the hyperlink points to.
 * @param classes - Additional CSS classes to add to the anchor.
 *
 * TODO: (#0): Use this method more widely.
 */
export function linkify(
  el: HTMLElement,
  href: string,
  ...classes: string[]
): void {
  const a: HTMLAnchorElement = anchor(href, ...el.childNodes);
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
 * Chops the first `offset` text characters off `node`, returning them as a new
 * node. The original `node` is mutated in place to retain the remaining text.
 *
 * The split recurses into nested children, so nodes of arbitrary structure are
 * handled correctly. `offset` must be strictly between zero and the length of
 * `node`'s text content.
 *
 * @param node - The node to split.
 * @param offset - The number of leading text characters to chop off.
 * @returns A new node holding the first `offset` characters of `node`.
 */
function splitPrefix(node: Node, offset: number): Node {
  if (node.nodeType === Node.TEXT_NODE) {
    const text: Text = node as Text;
    const prefix: Text = text.cloneNode(false) as Text;
    prefix.nodeValue = (text.nodeValue ?? '').slice(0, offset);
    text.nodeValue = (text.nodeValue ?? '').slice(offset);
    return prefix;
  }

  // Shallow-clone the node to hold the prefix, then fill it by moving (and, at
  // the boundary, splitting) children off the front of `node`.
  const prefix: Node = node.cloneNode(false);
  let remaining: number = offset;
  while (remaining > 0 && node.firstChild) {
    const child: ChildNode = node.firstChild;
    const childLength: number = (child.textContent ?? '').length;
    if (childLength <= remaining) {
      // The whole child fits in the prefix. `appendChild` detaches it from
      // `node`.
      prefix.appendChild(child);
      remaining -= childLength;
    } else {
      // The child straddles the boundary: split it, keeping its suffix in
      // `node`.
      prefix.appendChild(splitPrefix(child, remaining));
      remaining = 0;
    }
  }
  return prefix;
}

/**
 *
 */
export class Chain {
  // We store the nodes in reverse order to simplify our logic, which needs to
  // pop elements from the front of the array.
  // We use a name that is indicative of the content, to prevent accidental
  // misuse.
  private readonly reversed: Node[];
  private readonly parentNode: Node;
  private readonly previousSibling: Node | null;
  public readonly nextSibling: Node | null;

  /**
   * @param nodes
   */
  public constructor(nodes: Node[]) {
    this.previousSibling = nodes[0]?.previousSibling ?? null;
    this.nextSibling = nodes[nodes.length - 1]?.nextSibling ?? null;
    this.parentNode = nodes[0]!.parentNode!;
    // NOTE: `reverse` mutates the caller's array in place. This is OK for now
    // because the only caller discards the array right after constructing us.
    this.reversed = nodes.reverse();
  }

  /**
   * @returns
   */
  private first(): Node {
    return this.reversed.at(-1)!;
  }

  /**
   * @returns
   */
  private shift(): Node {
    return this.reversed.pop()!;
  }

  /**
   * @returns
   */
  public text(): string {
    return this.reversed
      .map((n: Node): string => n.textContent ?? '')
      .reverse()
      .join('');
  }

  /**
   * Consumes and returns nodes corresponding to the first `length` characters.
   * Modifies the internal `nodes` array.
   *
   * @param length - The length of the text to consume.
   * @returns The consumed nodes.
   */
  public munch(length: number): Node[] {
    const result: Node[] = [];

    while (length) {
      const node: Node = this.first();
      const text: string = node.textContent ?? '';

      if (text.length <= length) {
        // Consume the whole node.
        result.push(this.shift());
        length -= text.length;
        continue;
      }

      // The node holds more text than we need. Chop off its prefix and leave
      // the remainder behind at the front of the chain. `splitPrefix` recurses
      // into nested children, so nodes of arbitrary structure are handled.
      const prefix: Node = splitPrefix(node, length);
      // Keep the DOM consistent: the prefix must precede the remainder.
      (node as ChildNode).before(prefix);
      result.push(prefix);
      // The original `node` stays at this.nodes.first(), now holding only the
      // remaining suffix.
      break;
    }
    return result;
  }

  /**
   *
   * @param fragment
   */
  public replace(fragment: DocumentFragment): void {
    this.parentNode.insertBefore(
      fragment,
      this.previousSibling
        ? this.previousSibling.nextSibling
        : this.parentNode.firstChild
    );
    if (this.reversed.length) {
      log.error('Chain still has nodes:', this.reversed);
    }
  }
}

/**
 * Context provided to the replacer function in replaceNodes.
 */
export class Context {
  // TODO: (#0) The public field can be overwritten by users of the class. Try
  // to grant access through getters only if possible.

  /** The current match. */
  public match!: RegExpExecArray;
  /** The text from the start of the match to the end of the chain. */
  public remainder: string;
  /** The text to the left of the current match. */
  public left = '';
  /**
   * The text to the right of the match, as captured when the match was found.
   * This is a snapshot: it goes stale after any `munch`/`advance`. Use
   * `remainder` once the cursor has moved.
   */
  public right = '';
  private readonly fragment: DocumentFragment =
    document.createDocumentFragment();

  /**
   * @param chain
   */
  public constructor(private readonly chain: Chain) {
    this.remainder = chain.text();
  }

  /**
   * Consumes `length` characters from the chain and appends them to the
   * fragment.
   *
   * @param length
   */
  public advance(length: number): void {
    this.fragment.append(...this.munch(length));
  }

  /**
   * Consumes `length` characters from the chain and returns them as nodes.
   * These nodes are NOT appended to the fragment automatically.
   *
   * @param length
   * @returns
   */
  public munch(length: number): Node[] {
    const nodes: Node[] = this.chain.munch(length);
    this.left += this.remainder.slice(0, length);
    this.remainder = this.remainder.slice(length);
    return nodes;
  }

  /**
   *
   * @param replacement
   */
  public insert(replacement: Node | (Node | string)[]): void {
    this.fragment.append(...[replacement].flat());
  }

  /**
   *
   * @returns
   */
  public get fragmentLastElementChild(): Element | null {
    return this.fragment.lastElementChild;
  }

  /**
   * @returns The next sibling of the last node in the chain, if it exists.
   */
  public get nextSibling(): Node | null {
    return this.chain.nextSibling;
  }

  /**
   *
   * @param regex
   * @param replaceMatch
   */
  public replaceNodes(
    regex: RegExp,
    replaceMatch: (context: Context) => void
  ): void {
    while (this.remainder) {
      const match: RegExpExecArray | null = regex.exec(this.remainder);
      if (!match) {
        // No matches left. Consume the remainder of the chain into the
        // fragment, and break.
        this.advance(this.remainder.length);
        break;
      }

      // Consume the portion prior to the match.
      this.advance(match.index);

      this.match = match;
      this.right = this.remainder.slice(match[0].length);
      const prevRemainder: number = this.remainder.length;
      replaceMatch(this);

      // Prevent an infinite loop. If the replacer hasn't advanced the cursor,
      // skip this match altogether.
      if (prevRemainder === this.remainder.length) {
        this.advance(match[0].length);
      }
    }
    this.fragment.normalize();
    this.chain.replace(this.fragment);
  }
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
  Array.from(linkifyWalk(root, css.disjunction(...excludedClasses))).forEach(
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
          const a = anchor(targetUrl, match[0]);
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
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.childNodes;
}

/**
 *
 * @param node
 * @returns
 */
export function textContent(node: string | Node): string {
  return typeof node === 'string' ? node : (node.textContent ?? '');
}
