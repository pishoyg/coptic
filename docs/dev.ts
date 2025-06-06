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

/**
 * @returns Whether developer mode is active.
 */
export function get(): boolean {
  return localStorage.getItem(DEV) === ON;
}

/**
 * @param value - New value for developer mode.
 */
export function set(value: boolean) {
  localStorage.setItem(DEV, value ? ON : OFF);
}

/**
 */
export function reset(): void {
  set(false);
}

/**
 * Toggle developer mode.
 */
export function toggle() {
  set(!get());
}
