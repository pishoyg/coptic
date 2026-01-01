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
 * WORD_START uses a lookbehind expression to match a position NOT preceded
 * by a letter, mark, or number. This acts an assertion that matches the start
 * of a word.
 *
 * Normally, such a regex would also include the Connector_Punctuation class.
 * However, as of the time of writing, no characters in this class are used in
 * our repo.
 * Same below!
 */
export const WORD_START = /(?<![\p{Letter}\p{Mark}\p{Number}])/u;

/**
 * WORD_END uses a lookahead expression to match a position NOT followed
 * by a letter, mark, or number. This acts an assertion that matches the end
 * of a word.
 */
export const WORD_END = /(?![\p{Letter}\p{Mark}\p{Number}])/u;

/*
 * NO_LETTER_BEFORE matches a position NOT preceded by a letter or a mark.
 */
export const NO_LETTER_BEFORE = /(?<![\p{Letter}\p{Mark}])/u;

/*
 * NO_LETTER_AFTER matches a position NOT preceded by a letter or a mark.
 */
export const NO_LETTER_AFTER = /(?![\p{Letter}\p{Mark}])/u;

/**
 *
 * @param regex
 * @returns
 */
export function grouped(regex: string): string {
  return `(?:${regex})`;
}

/**
 * Wrap the given regex in Unicode-aware boundary expressions.
 *
 * @param regex
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
  regex: string,
  group = false,
  digitIsBoundary = false
): string {
  if (group) {
    regex = grouped(regex);
  }
  if (digitIsBoundary) {
    return `${NO_LETTER_BEFORE.source}${regex}${NO_LETTER_AFTER.source}`;
  }
  return `${WORD_START.source}${regex}${WORD_END.source}`;
}

/**
 * Escape all the special characters in the string, in order to search for raw
 * matches.
 * @param query
 * @returns
 */
export function escape(query: string): string {
  // TODO: (#0) Use `RegExp.escape` when it's more widely available:
  // eslint-disable-next-line max-len
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
