/** Package dev defines developer-mode logic. */
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
const ON = 'ON';
const OFF = 'OFF';
export var CLS;
(function (CLS) {
  // TODO: (#241) Abandon the `dev` and `no-dev` classes, as this forces users
  // to modify HTML if they want to designate a certain element as
  // developer-mode-only. Instead, users should be able to turn the behavior on
  // and off for given elements through the TypeScript.
  // DEV is the class of developer-mode elements, which should only show in
  // developer mode.
  CLS['DEV'] = 'dev';
  // NO_DEV is the class of elements that are hidden in developer mode.
  CLS['NO_DEV'] = 'no-dev';
})(CLS || (CLS = {}));
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
  localStorage.setItem(DEV, value ? ON : OFF);
}
/**
 */
export function reset() {
  set(false);
}
/**
 * Toggle developer mode.
 */
export function toggle() {
  set(!get());
}
