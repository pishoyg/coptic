/** Package dev defines developer-mode logic. */
import * as high from './highlight.js';
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
var CLS;
(function (CLS) {
  // DEV is a class that would be present on the <body> tag if developer mode is
  // enabled.

  CLS['DEV'] = 'dev';
})(CLS || (CLS = {}));
/**
 * @returns Whether developer mode is active.
 */
export function get() {
  return localStorage.getItem(DEV) === ON;
}
/**
 *
 */
class Styler {
  /**
   *
   */
  update() {
    if (get()) {
      document.body.classList.add(CLS.DEV);
    } else {
      document.body.classList.remove(CLS.DEV);
    }
  }
}
/**
 *
 */
export class Highlighter extends high.Highlighter {
  /**
   *
   */
  constructor() {
    super(new Styler());
  }
  /**
   *
   */
  reset() {
    this.set(false);
    this.update();
  }
  /**
   *
   */
  toggle() {
    this.set(!get());
    this.update();
  }
  /**
   * @param value - New value for developer mode.
   */
  set(value) {
    if (value) {
      localStorage.setItem(DEV, ON);
    } else {
      localStorage.setItem(DEV, OFF);
    }
  }
}
/**
 * If running in Playwright or developer mode, execute the given function.
 * Otherwise, do nothing and return undefined.
 *
 * @param f
 * @returns
 *
 */
export function play(f) {
  return window.isPlaywright || get() ? f() : undefined;
}
