import * as log from '../logger.js';

/**
 * WHITELIST is a list of known tokens that look like references but are not
 * actually references. We ignore them in the warning below.
 */
const WHITELIST: Set<string> = new Set<string>([
  'Alexandria',
  'Arabic',
  'But',
  'Coptic',
  'Father',
  'Georgian',
  'I',
  'Jesus',
  'Meaning',
  'Or',
  'Pbow',
  'Pous',
  'Seems',
  'Settle',
  'So',
  'Solomon',
  'Victor',
]);

/**
 * Log warnings for all capital letters in the Wiki text that haven't been
 * marked.
 * In Crum's text, Capital letters are mainly used for abbreviations of
 * dialects, and biblical and non-biblical references—all of which we try to
 * detect. An unmarked text containing a capital letter may therefore be an
 * abbreviation that we failed to parse.
 * This method yields a lot of false positives, but we retain it in the meantime
 * while we sharpen our parser.
 *
 * TODO: (#522) Delete this function once your logic is more mature.
 *
 * @param root
 * @param exclude
 */
export function warnPotentiallyMissingReferences(
  root: HTMLElement,
  exclude: string
): void {
  const walker: TreeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    (node: Node): number => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).matches(exclude)
          ? // If this element matches the exclude selector, FILTER_REJECT
            // tells TreeWalker to discard this node AND its children.
            NodeFilter.FILTER_REJECT
          : // If it's a normal element, we don't want to yield the element
            // itself, but we DO want to visit its children.
            NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  );

  while (walker.nextNode()) {
    const text: Text = walker.currentNode as Text;
    // Find all words containing an upper-case letter.
    const words: string[] | undefined = text.nodeValue
      ?.match(/(?=\p{L}*\p{Lu})[\p{Script=Latin}\p{M}]+/gu)
      ?.filter((token: string): boolean => !WHITELIST.has(token));
    if (!words?.length) {
      continue;
    }
    log.warn(
      'Possibly unmarked abbreviations:',
      ...words
        // Insert a comma after each word.
        .flatMap((entry: string, index: number): string[] =>
          index < words.length - 1 ? [entry, ','] : [entry]
        ),
      'in',
      text.nodeValue
    );
  }
}
