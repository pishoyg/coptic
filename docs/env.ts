/** Package env defines environment helpers.
 *
 * TODO: (#457) Delete this package. Mixed Node.js-or-browser code should be
 * completely gotten rid of. Node.js code is currently only used for validation,
 * but this is now possible in browser code thanks to the introduction of
 * Playwright tests.
 * */

/**
 * @returns Whether the code is running in the Browser.
 */
export function browser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * @returns Whether the code is running in a Node.js environment.
 */
export function node(): boolean {
  return !browser();
}
