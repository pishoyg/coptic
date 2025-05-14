/**
 *
 */
export function browser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
/**
 *
 */
export function node() {
  return !browser();
}
