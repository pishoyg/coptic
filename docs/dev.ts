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

export enum CLS {
  // TODO: (#241) Abandon the `dev` class, as this forces users
  // to modify HTML if they want to designate a certain element as
  // developer-mode-only. Instead, users should be able to turn the behavior on
  // and off for given elements through the TypeScript.

  // DEV is the class of developer-mode elements, which should only show in
  // developer mode.
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
 * @param value - New value for developer mode.
 */
export function set(value: boolean): void {
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
export function toggle(): void {
  set(!get());
}

type Visibility = 'block' | 'none';

/**
 * @returns
 */
function display(): Visibility {
  return get() ? 'block' : 'none';
}

/**
 *
 * @param el
 */
function modify(el: HTMLElement): void {
  el.style.display = display();
}

/**
 *
 */
export abstract class Highlighter extends high.Highlighter {
  abstract query(): string;

  /**
   * @returns
   */
  private rule(): string {
    return `${this.query()} { display: ${display()} }`;
  }

  /**
   *
   */
  constructor() {
    super(
      iam.amI('anki')
        ? new high.ElementStyler(() => this.query(), modify)
        : new high.CSSStyler(() => this.rule())
    );
  }

  /**
   *
   */
  override reset(): void {
    reset();
    this.update();
  }

  /**
   *
   */
  toggle(): void {
    set(!get());
    this.update();
  }
}
