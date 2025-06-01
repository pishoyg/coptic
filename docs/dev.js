/**
 * VAR is the name of the local storage variable holding the status of the
 * developer mode.
 *
 * This is the source of truth for developer mode.
 * Updating the developer mode status should happen by updating this local
 * storage variable.
 */
const DEV = 'dev';
/**
 * ON holds the value that the local storage variable should be set to when
 * developer mode is on.
 */
const ON = 'true';
/**
 * @returns Whether developer mode is active.
 */
export function get() {
  return localStorage.getItem(DEV) === ON;
}
/**
 * @param value - New value for developer mode.
 */
export function set(value) {
  if (value) {
    localStorage.setItem(DEV, ON);
  } else {
    localStorage.removeItem(DEV);
  }
}
/**
 * Toggle developer mode.
 */
export function toggle() {
  set(!get());
}
