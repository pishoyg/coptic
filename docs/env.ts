/** Package env defines environment helpers. */

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
