/** Package dialect defines dialect handling logic. */
import * as str from './str.js';
import * as log from './logger.js';

const SEPARATOR = ',';

export enum CLS {
  // BORDER_DIALECT_LETTER is the class of the second letter of a border dialect
  // code.
  BORDER_DIALECT_LETTER = 'border-dialect-letter',
  // SIGLUM is the class of a prettified dialect siglum.
  SIGLUM = 'siglum',
}

export enum Article {
  SAHIDIC = 'https://ccdl.claremont.edu/digital/collection/cce/id/2029/rec/2',
  AKHMIMIC = 'https://ccdl.claremont.edu/digital/collection/cce/id/1962/rec/1',
  LYCOPOLITAN = 'https://ccdl.claremont.edu/digital/collection/cce/id/2026/rec/1',
  BOHAIRIC = 'https://ccdl.claremont.edu/digital/collection/cce/id/2011/rec/2',
  FAYYUMIC = 'https://ccdl.claremont.edu/digital/collection/cce/id/1989/rec/2',
  OLD_COPTIC = 'https://ccdl.claremont.edu/digital/collection/cce/id/2027/rec/2',
  NAG_HAMMADI = 'https://ccdl.claremont.edu/digital/collection/cce/id/1418/rec/2',
  MESOKEMIC = 'https://ccdl.claremont.edu/digital/collection/cce/id/1996/rec/2',
  PROTO_THEBAN = 'https://ccdl.claremont.edu/digital/collection/cce/id/1984/rec/1',
  // A generic article!
  DIALECTS = 'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6',
  // Not Coptic dialects, but added for completion.
  ENGLISH = 'https://en.wikipedia.org/wiki/English_language',
  GREEK = 'https://en.wikipedia.org/wiki/Koine_Greek',
}

/**
 */
export class Dialect<C extends string, N extends string, K extends string> {
  readonly key: K;
  /**
   * @param code - Recognizable dialect code, suitable for display, and also for
   * use to control the state of the dialect.
   * @param name - Full dialect name, used for display only.
   * @param article - URL to an article about that dialect.
   * @param key - Single-character dialect key, used for situations where a
   * single-character key must be employed, such as keyboard shortcuts.
   * If the code is already single-character, it can be used as the key.
   */
  constructor(
    readonly code: C,
    readonly name: N,
    readonly article?: Article,
    key?: K
  ) {
    this.key = key ?? (code as unknown as K);
    log.ensure(this.key.length === 1);
  }

  /**
   * @returns
   */
  checkbox(): HTMLInputElement {
    const checkbox: HTMLInputElement = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = this.code; // The code is used for state control.
    return checkbox;
  }

  /**
   * @returns - The name of the dialect, potentially containing anchors to
   * articles about the dialect.
   */
  *anchoredName(): Generator<string | HTMLElement> {
    if (!this.article) {
      yield this.name;
      return;
    }
    const a = document.createElement('a');
    a.href = this.article;
    a.target = '_blank';
    a.textContent = this.name;
    yield a;
  }

  /**
   * @returns An HTML element, whose text content has the following format:
   *   (code) Dialect Name
   * The name bears anchors, if present.
   */
  title(): (Node | string)[] {
    return ['(', this.siglum(), ') ', ...this.anchoredName()];
  }

  /**
   * @returns An element containing a prettified dialect code.
   */
  siglum(): HTMLSpanElement {
    const siglum: HTMLSpanElement = document.createElement('span');
    siglum.classList.add(CLS.SIGLUM);

    const first: string | undefined = this.code[0],
      second: string | undefined = this.code[1];
    if (
      this.code.length === 2 &&
      first &&
      second &&
      str.isUpper(first) &&
      str.isLower(second)
    ) {
      // This is a border dialect siglum.
      const sup = document.createElement('sup');
      sup.classList.add(CLS.BORDER_DIALECT_LETTER);
      sup.textContent = second;
      siglum.append(first, sup);
      return siglum;
    }

    // This is a major dialect siglum.
    siglum.append(this.code);
    return siglum;
  }
}

/**
 * Manager represents a dialect state manager.
 * @template C The type of the dialect codes, which must be a string or a
 * subtype of string. Codes are used as keys in dialect state control.
 */
export class Manager<C extends string> {
  /**
   * @param localKey - Name of the local storage key used to store the set of
   * active dialects.
   */
  constructor(private readonly localKey: string) {}

  /**
   * @returns The list of active dialects codes.
   *
   * If dialect highlighting has never been configured, it returns undefined.
   * If previously selected dialects have been deselected, it returns an empty
   * array.
   */
  active(): C[] | undefined {
    const d: string | null = localStorage.getItem(this.localKey);
    if (d === null) {
      // Dialect highlighting has never been configured.
      return undefined;
    }
    if (d === '') {
      // Dialect highlighting was previously configured, and all dialects have
      // been deselected.
      // (This corner case needs special handling because splitting the empty
      // string otherwise returns [''].)
      return [];
    }
    // Dialect highlighting was previously used, and some dialects are selected.
    return d.split(SEPARATOR) as C[];
  }

  /**
   * Sets the current list of active dialects.
   * @param dialects - The list of dialects to set as active.
   */
  setActive(dialects: C[]): void {
    localStorage.setItem(this.localKey, dialects.join(SEPARATOR));
  }

  /**
   * Deselect all dialects.
   * NOTE: This doesn't "reset". It deselects all dialects. This allows you to
   * distinguish between cases where dialect highlighting was previously used
   * and disabled as opposed to when it was never used before.
   */
  reset(): void {
    this.setActive([]);
  }

  /**
   * Toggles the active state of a single dialect.
   * @param dialect - The dialect to toggle.
   */
  toggle(dialect: C): void {
    const active = new Set<C>(this.active() ?? []);

    if (active.has(dialect)) {
      active.delete(dialect);
    } else {
      active.add(dialect);
    }

    this.setActive(Array.from(active));
  }
}
