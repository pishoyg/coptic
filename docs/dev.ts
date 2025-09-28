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
 *
 */
export abstract class Highlighter extends high.Highlighter {
  protected abstract query(): string;

  /**
   * @returns - Current visibility value for developer-mode elements.
   */
  private display(): Visibility {
    return get() ? 'block' : 'none';
  }

  /**
   * @returns
   */
  private rule(): string {
    return `${this.query()} { display: ${this.display()} }`;
  }

  /**
   * @returns
   */
  private op(): [string, (el: HTMLElement) => void] {
    const val: Visibility = this.display();
    return [
      this.query(),
      (el: HTMLElement): void => {
        el.style.display = val;
      },
    ];
  }

  /**
   *
   */
  public constructor() {
    super(
      iam.amI('anki')
        ? new high.ElementStyler(() => [this.op()])
        : new high.CSSStyler(() => this.rule())
    );
  }

  /**
   *
   */
  public override reset(): void {
    reset();
    this.update();
  }

  /**
   *
   */
  public toggle(): void {
    set(!get());
    this.update();
  }
}
