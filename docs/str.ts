import * as log from './logger.js';
import * as dev from './dev.js';
/**
 * Check whether the given text is upper-case.
 * NOTE: If the text doesn't contain any "casable" characters, return true.
 *
 * @param s - string to check
 * @returns - Whether the string is in upper-case.
 */
export function isUpper(s: string): boolean {
  return s.toUpperCase() === s;
}

/**
 * Check whether the given text is lower-case.
 * NOTE: If the text doesn't contain any "casable" characters, return true.
 *
 * @param s - string to check
 * @returns - Whether the string is in lower-case.
 */
export function isLower(s: string): boolean {
  return s.toLowerCase() === s;
}

const DIGITS = /^\d+$/;
/**
 *
 * @param s
 * @returns
 */
export function isDigits(s: string): boolean {
  return DIGITS.test(s);
}

/**
 * @param text
 * @returns
 */
export function toggleCase(text: string): string {
  return Array.from(text)
    .map((ch: string): string =>
      isUpper(ch) ? ch.toLowerCase() : ch.toUpperCase()
    )
    .join('');
}

/**
 * ASSERT_NON_WORD matches a position that neighbors a non-word character on
 * either side.
 * The regex uses negative lookahead and negative lookbehind expressions.
 * It acts as an assertion that matches a word boundary.
 *
 * NOTE: Unlike `\b` (which works fine for non-Unicode characters), this
 * assertion matches a position between two non-word characters – a weakness
 * that is deemed acceptable in our repository.
 *
 * What constitutes a word character? - Letters, marks, and numbers.
 * (Normally, characters in the Connector_Punctuation class would also count as
 * word characters. However, as of the time of writing, no characters in this
 * class are used in our repo.)
 */
export const ASSERT_NON_WORD =
  /(?:(?<![\p{Letter}\p{Mark}\p{Number}])|(?![\p{Letter}\p{Mark}\p{Number}]))/u;

/*
 * ASSERT_NON_LETTER matches a position that neighbors a non-letter or non-mark
 * on either side.
 *
 * See ASSERT_NON_WORD for more info.
 */
export const ASSERT_NON_LETTER =
  /(?:(?<![\p{Letter}\p{Mark}])|(?![\p{Letter}\p{Mark}]))/u;

/**
 *
 * @param re
 * @returns
 */
export function grouped(re: string): string {
  return `(?:${re})`;
}

/**
 * Wrap the given regex in Unicode-aware boundary expressions.
 *
 * @param re
 *
 * @param group - Whether to wrap the given regex in a non-capture group.
 * This is helpful in some situations. For example, consider the regex `a|b`.
 * Surrounding it with boundary expressions on both sides (i.e. creating a regex
 * that looks like `\ba|b\b`) would result in a regex that matches either a
 * left-bounded `a` or a right-bounded `b`. This is rarely the intention.
 * It's more likely that the caller is interested in a regex that matches an `a`
 * or `b` that is both left- and right-bounded. In such a
 * situation, using `(?:a|b)` as the core regex yields the desired behavior.
 * We don't take the liberty to create this group for the caller, so the
 * parameter defaults to false.
 *
 * @param digitIsBoundary - If true, digits are considered word boundaries.
 *
 * @returns
 */
export function bounded(
  re: string,
  group = false,
  digitIsBoundary = false
): string {
  if (group) {
    re = grouped(re);
  }
  if (digitIsBoundary) {
    return `${ASSERT_NON_LETTER.source}${re}${ASSERT_NON_LETTER.source}`;
  }
  return `${ASSERT_NON_WORD.source}${re}${ASSERT_NON_WORD.source}`;
}

/**
 * Escape all the special characters in the string, in order to search for raw
 * matches.
 * @param query
 * @returns
 */
export function escape(query: string): string {
  // TODO: (#0) Use `RegExp.escape` when it's more widely available:

  // [1] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param node
 * @param overrides
 * @returns
 */
export function textContent(
  node: Node,
  overrides: Record<string, string>
): string {
  return [...textContentAux(node, overrides)].join('');
}

/**
 * @param node
 * @param overrides
 * @returns
 */
function* textContentAux(
  node: Node,
  overrides: Record<string, string>
): Generator<string> {
  // If the node is a text node and has content, yield it.
  if (node.nodeType === Node.TEXT_NODE && node.textContent) {
    yield node.textContent;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    // This is a non-text and a non-element node. It may be some other type,
    // such as a comment. Return immediately.
    return;
  }

  for (const [cls, text] of Object.entries(overrides)) {
    if ((node as HTMLElement).classList.contains(cls)) {
      yield text;
      return;
    }
  }

  for (const child of node.childNodes) {
    yield* textContentAux(child, overrides);
  }
}

/**
 * Allegedly, modern JavaScript engines such as V8 use a trie to implement a
 * regex constructed from the disjunction of a large number of strings. Thus,
 * the regex constructed using this method remains performant even if there is a
 * large number of keys.
 *
 * @param keys
 * @param bound
 * @param knownDuplicates
 * @returns
 */
export function regex(
  keys: string[],
  bound = true,
  knownDuplicates?: string[]
): string {
  dev.play(() => {
    // Log a warning about duplicate keys.
    keys = keys.sort();
    for (const [idx, key] of keys.entries()) {
      if (idx && keys[idx - 1] === key && !knownDuplicates?.includes(key)) {
        log.warn('Regex has duplicate keys:', key);
      }
    }
  });

  const expression: string = keys
    // It's important to sort the keys by length, bringing longer keys first.
    // The regex stops whenever a match is encountered, and it processes the
    // matches in order. If a key is a prefix of another key, the longer key
    // should come earlier in the list. Otherwise, the regex could match the
    // prefix and return early.
    .sort((a: string, b: string): number => b.length - a.length)
    .map((key: string): string => escape(key))
    .join('|');
  return bound
    ? // Group and bound.
      bounded(expression, true /* group */)
    : // Only group the regexes.
      grouped(expression);
}
