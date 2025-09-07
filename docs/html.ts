/** Package html defines DOM manipulation helpers. */
import * as browser from './browser.js';
import * as logger from './logger.js';
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
    logger.warn(`Converting ${el.tagName} tag to <a> tag!`);
  }
  moveElement(el, 'a', { href: target });
}

/**
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
  const walker: TreeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    (node: Node): number => {
      if (!node.nodeValue || !regex.test(node.nodeValue)) {
        // This node doesn't contain a matching text.
        return NodeFilter.FILTER_REJECT;
      }
      if (
        excludedClasses.length &&
        node.parentElement?.closest(css.classQuery(...excludedClasses))
      ) {
        // This node is excluded.
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement?.closest('a')) {
        // This node is already a link.
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
    linkifyTextAux(node, regex, url, classes);
  });
}

/**
 *
 * @param node
 * @param regex
 * @param url
 * @param classes
 */
function linkifyTextAux(
  node: Text,
  regex: RegExp,
  url: (match: RegExpExecArray) => string | null,
  classes: string[]
): void {
  const text: string = node.nodeValue!;
  regex.lastIndex = 0;

  let lastIndex = 0;
  const fragment: DocumentFragment = document.createDocumentFragment();

  for (let match: RegExpExecArray | null; (match = regex.exec(text)); ) {
    const query: string = match[0];

    // preceding plain text
    if (match.index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index))
      );
    }

    const targetUrl = url(match);

    if (targetUrl) {
      const link = document.createElement('span');
      link.classList.add(...classes);
      link.textContent = query;
      link.addEventListener('click', () => {
        browser.open(targetUrl);
      });
      fragment.appendChild(link);
    } else {
      // keep unmatched text as-is
      fragment.appendChild(document.createTextNode(query));
    }

    lastIndex = match.index + query.length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
  node.replaceWith(fragment);
}
