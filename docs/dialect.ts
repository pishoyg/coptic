const SEPARATOR = ',';

/**
 * Manager represents a dialect manager.
 * @template T The type of the dialect, which must be a string or a subtype
 * of string (like a string literal type).
 */
export class Manager<T extends string> {
  /**
   * @param key - Name of the local storage key used to store the set of
   * active dialects.
   */
  constructor(private readonly key: string) {}

  /**
   * @returns The list of active dialects.
   * If dialect highlighting has never been configured, it returns undefined.
   * If previously selected dialects have been deselected, it returns an empty
   * array.
   *
   * NOTE: The local storage variable distinguishes between the two following
   * values:
   * - null: Dialect highlighting has never been configured. This results in
   *   a response of `undefined`.
   * - the empty string: Dialect highlighting was previously configured, and now
   *   all dialects are disabled. This results in a response of an empty array.
   */
  active(): T[] | undefined {
    const d: string | null = localStorage.getItem(this.key);
    if (d === null) {
      // Dialect highlighting has never been configured.
      return undefined;
    }
    if (d === '') {
      // Dialect highlighting was previously configured, and now all dialects
      // are disabled.
      // (This corner case needs special handling because splitting the empty
      // string otherwise returns [''].)
      return [];
    }
    // We can safely cast here because the class only ever stores values of type
    // T.
    return d.split(SEPARATOR) as T[];
  }

  /**
   * Sets the current list of active dialects.
   * @param dialects - The list of dialects to set as active.
   */
  setActive(dialects: T[]): void {
    localStorage.setItem(this.key, dialects.join(SEPARATOR));
  }

  /**
   * Sets the list of active dialects to [].
   * NOTE: We intentionally use the empty list, instead of deleting the local
   * storage variable, in order to distinguish between cases when:
   * 1. Dialect highlighting was previously used and then reset.
   * 2. Dialect highlighting was never used.
   */
  reset(): void {
    this.setActive([]);
  }

  /**
   * Toggles the active state of a single dialect.
   * @param dialect - The dialect to toggle.
   */
  toggle(dialect: T): void {
    const active = new Set<T>(this.active() ?? []);

    if (active.has(dialect)) {
      active.delete(dialect);
    } else {
      active.add(dialect);
    }

    this.setActive(Array.from(active));
  }
}
