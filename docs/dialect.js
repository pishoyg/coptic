/** Package dialect defines dialect handling logic. */
import * as str from './str.js';
import * as logger from './logger.js';
const SEPARATOR = ',';
export var CLS;
(function (CLS) {
  CLS['BORDER_DIALECT_LETTER'] = 'border-dialect-letter';
  CLS['SIGLUM'] = 'siglum';
})(CLS || (CLS = {}));
export var Article;
(function (Article) {
  Article['SAHIDIC'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2029/rec/2';
  Article['AKHMIMIC'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1962/rec/1';
  Article['LYCOPOLITAN'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2026/rec/1';
  Article['BOHAIRIC'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2011/rec/2';
  Article['FAYYUMIC'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1989/rec/2';
  Article['OLD_COPTIC'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2027/rec/2';
  Article['NAG_HAMMADI'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1418/rec/2';
  Article['MESOKEMIC'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1996/rec/2';
  Article['PROTO_THEBAN'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/1984/rec/1';
  // A generic article!
  Article['DIALECTS'] =
    'https://ccdl.claremont.edu/digital/collection/cce/id/2015/rec/6';
  // Not Coptic dialects, but added for completion.
  Article['ENGLISH'] = 'https://en.wikipedia.org/wiki/English_language';
  Article['GREEK'] = 'https://en.wikipedia.org/wiki/Koine_Greek';
})(Article || (Article = {}));
/**
 */
export class Dialect {
  code;
  name;
  article;
  key;
  /**
   * @param code - Recognizable dialect code, suitable for display.
   * @param name - Full dialect name.
   * @param article - URL to an article about that dialect.
   * @param key - Single-character dialect key.
   * NOTE: You should provide a dialect key if the dialect has a
   * double-character code. If it's single-character, the code can be used as a
   * key.
   */
  constructor(code, name, article, key) {
    this.code = code;
    this.name = name;
    this.article = article;
    this.key = key ?? code;
    logger.ensure(this.key.length === 1);
  }
  /**
   * @returns
   */
  checkbox() {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = this.code;
    return checkbox;
  }
  /**
   * @returns - The name of the dialect, potentially containing anchors to
   * articles about the dialect.
   */
  *anchoredName() {
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
  title() {
    return ['(', this.siglum(), ') ', ...this.anchoredName()];
  }
  /**
   * @returns An element containing a prettified dialect code.
   */
  siglum() {
    const siglum = document.createElement('span');
    siglum.classList.add(CLS.SIGLUM);
    const first = this.code[0],
      second = this.code[1];
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
 * Manager represents a dialect manager.
 * @template C The type of the dialect, which must be a string or a subtype
 * of string (like a string literal type).
 */
export class Manager {
  key;
  /**
   * @param key - Name of the local storage key used to store the set of
   * active dialects.
   */
  constructor(key) {
    this.key = key;
  }
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
  active() {
    const d = localStorage.getItem(this.key);
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
    return d.split(SEPARATOR);
  }
  /**
   * Sets the current list of active dialects.
   * @param dialects - The list of dialects to set as active.
   */
  setActive(dialects) {
    localStorage.setItem(this.key, dialects.join(SEPARATOR));
  }
  /**
   * Sets the list of active dialects to [].
   * NOTE: We intentionally use the empty list, instead of deleting the local
   * storage variable, in order to distinguish between cases when:
   * 1. Dialect highlighting was previously used and then reset.
   * 2. Dialect highlighting was never used.
   */
  reset() {
    this.setActive([]);
  }
  /**
   * Toggles the active state of a single dialect.
   * @param dialect - The dialect to toggle.
   */
  toggle(dialect) {
    const active = new Set(this.active() ?? []);
    if (active.has(dialect)) {
      active.delete(dialect);
    } else {
      active.add(dialect);
    }
    this.setActive(Array.from(active));
  }
}
