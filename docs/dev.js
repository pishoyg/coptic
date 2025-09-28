/** Package dev defines developer-mode logic. */
import * as high from './highlight.js';
import * as iam from './iam.js';
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
  // TODO: (#241) Abandon the `dev` class, as this forces users
  // to modify HTML if they want to designate a certain element as
  // developer-mode-only. Instead, users should be able to turn the behavior on
  // and off for given elements through the TypeScript.
  // DEV is the class of developer-mode elements, which should only show in
  // developer mode.

  CLS['DEV'] = 'dev';
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
/**
 *
 */
export class Highlighter extends high.Highlighter {
  /**
   * @returns - Current visibility value for developer-mode elements.
   */
  display() {
    return get() ? 'block' : 'none';
  }
  /**
   * @returns
   */
  rule() {
    return `${this.query()} { display: ${this.display()} }`;
  }
  /**
   * @returns
   */
  op() {
    const val = this.display();
    return [
      this.query(),
      (el) => {
        el.style.display = val;
      },
    ];
  }
  /**
   *
   */
  constructor() {
    super(
      iam.amI('anki')
        ? new high.ElementStyler(() => [this.op()])
        : new high.CSSStyler(() => this.rule())
    );
  }
  /**
   *
   */
  reset() {
    reset();
    this.update();
  }
  /**
   *
   */
  toggle() {
    set(!get());
    this.update();
  }
}
