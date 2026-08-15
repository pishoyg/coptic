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
 * @returns Whether this is a development environment, rather than a plain user
 * session. Errors should be loud, and sanity checks should run, in all three:
 *
 * - A Playwright-controlled browser (E2E tests), which sets
 *   `navigator.webdriver`.
 * - Node, or a Node-compatible runtime, where the Node artifacts run browser
 *   code under a headless DOM (see
 *   `dictionary/marcion_sourceforge_net/wiki.ts`).
 * - Developer mode (see `get`).
 *
 * NOTE: Neither the DOM globals nor `navigator` identify the Node runtime.
 * jsdom installs `window`, `document`, and `localStorage`, and Node defines
 * `navigator`, without `webdriver`.
 */
export function dev(): boolean {
  return (
    (typeof navigator !== 'undefined' && navigator.webdriver) ||
    (typeof process !== 'undefined' &&
      typeof process.versions.node === 'string') ||
    get()
  );
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
   * @param isActive - See `high.Highlighter`.
   */
  public constructor(isActive?: () => boolean) {
    super(new Styler(), isActive);
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
 * If this is a development environment (see `dev`), execute the given
 * function. Otherwise, do nothing and return undefined.
 *
 * @param f
 * @returns
 *
 */
export function play<T>(f: () => T): T | undefined {
  return dev() ? f() : undefined;
}
