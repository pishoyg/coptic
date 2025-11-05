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

enum CLS {
  // DEV is a class that would be present on the <body> tag if developer mode is
  // enabled.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  DEV = 'dev',
}

/**
 * @returns Whether developer mode is active.
 */
export function get(): boolean {
  return localStorage.getItem(DEV) === ON;
}

/**
 *
 */
class Styler implements high.Styler {
  /**
   *
   */
  public update(): void {
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
  public constructor() {
    super(new Styler());
  }

  /**
   *
   */
  public override reset(): void {
    this.set(false);
    this.update();
  }

  /**
   *
   */
  public toggle(): void {
    this.set(!get());
    this.update();
  }

  /**
   * @param value - New value for developer mode.
   */
  private set(value: boolean): void {
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
export function play<T>(f: () => T): T | undefined {
  return window.isPlaywright || get() ? f() : undefined;
}
