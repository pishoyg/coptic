import * as log from '../logger.js';
import * as dev from '../dev.js';
import * as css from '../css.js';
import * as cls from './cls.js';
/**
 * WHITELIST is a list of known tokens that look like references but are not
 * actually references. We ignore them in the warning below.
 */
const WHITELIST = new Set([
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
 * TODO: (#419) Delete this function once your logic is more mature.
 *
 * @param root
 */
export function warnPotentiallyMissingReferences(root) {
  if (!dev.get()) {
    return;
  }
  const query = css.classQuery(
    cls.BULLET,
    cls.ANNOTATION,
    cls.DIALECT,
    cls.REFERENCE,
    cls.BIBLE
  );
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    (node) => {
      if (!node.nodeValue) {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement?.closest(query)) {
        // This node is excluded.
        return NodeFilter.FILTER_REJECT;
      }
      if (!/[A-Z]/gu.test(node.nodeValue)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  );
  while (walker.nextNode()) {
    const text = walker.currentNode;
    // Find all words containing an upper-case letter.
    const words = text.nodeValue
      ?.match(/(?=\p{L}*\p{Lu})[\p{L}\p{M}]+/gu)
      ?.filter((token) => !WHITELIST.has(token));
    if (!words?.length) {
      continue;
    }
    log.warn(
      'Possibly unmarked abbreviations:',
      ...words
        // Insert a comma after each word.
        .flatMap((entry, index) =>
          index < words.length - 1 ? [entry, ','] : [entry]
        ),
      'in',
      text.nodeValue
    );
  }
}
