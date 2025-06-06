/**
 * @returns Whether the code is running in the Browser.
 */
export function browser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
/**
 * @returns Whether the code is running in a Node.js environment.
 */
export function node() {
  return !browser();
}
