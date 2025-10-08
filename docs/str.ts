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
 * BOUNDARY_START uses a lookbehind expression to match a position NOT preceded
 * by a letter, mark, number, or connector punctuation mark.
 * In other words, it's a Unicode-aware version of `\b` (though only at the
 * beginning of a word).
 */
export const BOUNDARY_START =
  /(?<![\p{Letter}\p{Mark}\p{Number}\p{Connector_Punctuation}])/u;

/**
 * BOUNDARY_END uses a lookahead expression to match a position NOT followed
 * by a letter, mark, number, or connector punctuation mark.
 * In other words, it's a Unicode-aware version of `\b` (though only at the end
 * of a word).
 */
export const BOUNDARY_END =
  /(?![\p{Letter}\p{Mark}\p{Number}\p{Connector_Punctuation}])/u;

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
 * @returns
 */
export function bounded(regex: string, group = false): string {
  if (group) {
    regex = `(?:${regex})`;
  }
  return `${BOUNDARY_START.source}${regex}${BOUNDARY_END.source}`;
}
