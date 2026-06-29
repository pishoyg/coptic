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
 * It prevents matching a position between two word characters, but any position
 * where one character on either side is a non-word character passes the
 * assertion.
 * It's intended as a Unicode-aware alternative to `\b`, which matches word
 * boundaries but doesn't support Unicode characters.
 * Although, unlike `\b`, our assertion matches positions between two non-word
 * characters - a weakness deemed acceptable in our repository.
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
 * on either side. In other words, it prevents matches between two characters
 * that are both a letter or a mark.
 *
 * See ASSERT_NON_WORD for more info.
 */
export const ASSERT_NON_LETTER =
  /(?:(?<![\p{Letter}\p{Mark}])|(?![\p{Letter}\p{Mark}]))/u;

/**
 * ASSERT_NON_NUMBER matches a position that neighbors a non-number on either
 * side. In other words, it prevents matches between two numbers.
 *
 * See ASSERT_NON_WORD for more info.
 */
export const ASSERT_NON_NUMBER = /(?:(?<!\p{Number})|(?!\p{Number}))/u;

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
 * @param digitIsBoundary - If true, letters and digits are bounded
 * independently: a letter↔digit transition counts as a boundary (so `abc123`
 * is treated as two adjacent words), while digit↔digit and letter↔letter
 * positions do not. If false (the default), letters, marks, and digits are
 * all treated as word characters, matching the usual `\b` semantics.
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
    return `${ASSERT_NON_NUMBER.source}${ASSERT_NON_LETTER.source}${re}${ASSERT_NON_LETTER.source}${ASSERT_NON_NUMBER.source}`;
  }
  return `${ASSERT_NON_WORD.source}${re}${ASSERT_NON_WORD.source}`;
}

/**
 * @param node
 * @param overrides - A map from CSS selector queries to replacement text.
 * If an element matches a query, its subtree is skipped and the corresponding
 * text is yielded in its place. Defaults to dropping `<del>` tags, but the
 * caller is free to override the behavior.
 * @returns
 */
export function textContent(
  node: Node,
  overrides: Record<string, string> = { del: '' }
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

  for (const [query, text] of Object.entries(overrides)) {
    if ((node as Element).matches(query)) {
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
 * @returns
 */
export function regex(keys: string[], bound = true): string {
  dev.play(() => {
    // Log a warning about duplicate keys.
    keys = keys.sort();
    for (const [idx, key] of keys.entries()) {
      if (keys[idx - 1] === key) {
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
    .map((key: string): string => RegExp.escape(key))
    .join('|');
  return bound
    ? // Group and bound.
      bounded(expression, true /* group */)
    : // Only group the regexes.
      grouped(expression);
}

/**
 * Join path segments with a single slash, collapsing adjacent slashes.
 *
 * NOTE: This is intended as a utility for file paths. For URLs, use `URL`.
 *
 * @param parts - Path segments to concatenate.
 * @returns The joined path.
 */
export function joinPaths(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}
