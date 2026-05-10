/** Package dev defines developer-mode logic. */
import * as high from './highlight.js';

/**
 * VAR is the name of the local storage variable holding the status of the
 * developer mode.
 *
 * This is the source of truth for developer mode.
 * Updating the developer mode status should happen by updating this local
 * storage variable.
 *
 * When set, the value is the millisecond timestamp at which developer mode
 * was enabled. Developer mode automatically expires after EXPIRY_MS.
 */
const DEV = 'dev';

/**
 * EXPIRY_MS is how long developer mode stays active after being enabled.
 */
/* eslint-disable-next-line no-magic-numbers */
const EXPIRY_MS = 12 * 60 * 60 * 1000;

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
  return Date.now() - Number(localStorage.getItem(DEV)) < EXPIRY_MS;
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
      localStorage.setItem(DEV, Date.now().toString());
    } else {
      localStorage.removeItem(DEV);
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
