'use strict';
// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.

// NOTE: The use of classes as constants starting with CLS_ is a remnant of an
// old restriction that was introduced to support class obfuscation. The
// restriction has been lifted, and the enforcing pre-commit has been removed.
// Whether or not to retain this convention can be decided later.
const CLS_CRUM_PAGE = 'crum-page';
const CLS_CRUM_PAGE_EXTERNAL = 'crum-page-external';
const CLS_DAWOUD_PAGE_IMG = 'dawoud-page-img';
const CLS_CRUM_PAGE_IMG = 'crum-page-img';
const CLS_EXPLANATORY = 'explanatory';
const CLS_COPTIC = 'coptic';
const CLS_GREEK = 'greek';
const CLS_DAWOUD_PAGE = 'dawoud-page';
const CLS_DRV_KEY = 'drv-key';
const CLS_EXPLANATORY_KEY = 'explanatory-key';
const CLS_DIALECT = 'dialect';
const CLS_DEV = 'dev';
const CLS_DEVELOPER = 'developer';
const CLS_RESET = 'reset';
const CLS_HEAVY = 'heavy';
const CLS_HOVER_LINK = 'hover-link';
const CLS_ITALIC = 'italic';
const CLS_LIGHT = 'light';
const CLS_LINK = 'link';
const CLS_SMALL = 'small';
const CLS_VERY_LIGHT = 'very-light';
const CLS_DIALECT_PARENTHESIS = 'dialect-parenthesis';
const CLS_DIALECT_COMMA = 'dialect-comma';
const CLS_SPELLING_COMMA = 'spelling-comma';
const CLS_TYPE = 'type';
const CLS_SPELLING = 'spelling';

// The following classes represent the dialects.
type Dialect = 'S' | 'Sa' | 'Sf' | 'A' | 'sA' | 'B' | 'F' | 'Fb' | 'O' | 'NH';
const CLS_S: Dialect = 'S';
const CLS_Sa: Dialect = 'Sa';
const CLS_Sf: Dialect = 'Sf';
const CLS_A: Dialect = 'A';
const CLS_sA: Dialect = 'sA';
const CLS_B: Dialect = 'B';
const CLS_F: Dialect = 'F';
const CLS_Fb: Dialect = 'Fb';
const CLS_O: Dialect = 'O';
const CLS_NH: Dialect = 'NH';

const DIALECTS: readonly Dialect[] = [
  CLS_S, CLS_Sa, CLS_Sf, CLS_A, CLS_sA, CLS_B, CLS_F, CLS_Fb, CLS_O, CLS_NH,
];

/*
 * Dialect classes are to be found in:
 * 1. HTML classes
 * 2. JavaScript classes
 *
 * Dialect codes are to be found in:
 * 1. Dialect Elements' inner HTML
 * 2. The `d` parameter (which will be set using #1)
 *
 * For example, consider the following HTML:
 * ```
 * <span class="dialect cls_B">B</span>
 * ```
 *
 * The class is "cls_B". The code is "B". The code will be used to set the
 * parameter `d`. The class will be used in JavaScript.
 * Thus, expect the following line to live in your JavaScript:
 * ```
 * const CLS_B: Dialect = "cls_B";
 * ```
 *
 * We also use this HTML span to construct a mapping between dialect codes
 * and classes.
 * The mapping is restricted to the dialects that are present in a given
 * page, and that's OK. On a given page, we have no need for the dialects
 * that are absent from the page! Makes sense, eh?
 *
 * It is the classes that are used for internal processing, and it is the
 * codes that are presented to the user. This way, the `d` parameter has a
 * "pretty" value, and is persistent.
 *
 * As for the classes, we can obfuscate them as we like!
 */

const DIALECT_CODE_TO_CLASS: Map<string, Dialect> = (
  function(): Map<string, Dialect> {
    const codeToClass: Map<string, Dialect> = new Map<string, Dialect>();
    DIALECTS.forEach((cls) => {
      const code: string | undefined = document.querySelector(
        `.${CLS_DIALECT}.${cls}`)?.innerHTML;
      if (code === undefined) {
        return;
      }
      codeToClass.set(code, cls);
    });
    return codeToClass;
  }());

function get_url_or_local(
  param: string,
  default_value: string | null = null): string | null {
  return (new URLSearchParams(window.location.search)).get(param)
    ?? localStorage.getItem(param)
    ?? default_value;
}

function window_open(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')!.focus();
}

function set_url_and_local(param: string, value: string | null): void {
  if (value === null) {
    localStorage.removeItem(param);
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    url.search = decodeURIComponent(url.search);
    window.history.pushState('', '', url.toString());
    return;
  }
  localStorage.setItem(param, value);
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  url.search = decodeURIComponent(url.search);
  window.history.pushState('', '', url.toString());
}

function moveElement(
  el: HTMLElement, tag: string, attrs: Record<string, string>): void {
  const copy = document.createElement(tag);
  copy.innerHTML = el.innerHTML;
  Array.from(el.attributes).forEach((att: Attr): void => {
    copy.setAttribute(att.name, att.value);
  });
  Object.entries(attrs).forEach(([key, value]: [string, string]): void => {
    copy.setAttribute(key, value);
  });
  el.parentNode?.replaceChild(copy, el);
}

// Handle CLS_CRUM_PAGE class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_CRUM_PAGE),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = (): void => {
      let pageNumber: string = el.innerHTML;
      const lastChar = pageNumber.substr(pageNumber.length - 1);
      if (lastChar === 'a' || lastChar === 'b') {
        pageNumber = pageNumber.slice(0, -1);
      }
      document.getElementById(`crum${pageNumber}`)!.scrollIntoView();
    };
  });

// Handle CLS_CRUM_PAGE_EXTERNAL class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_CRUM_PAGE_EXTERNAL),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = (): void => {
      window_open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`);
    };
  });

// Handle CLS_DAWOUD_PAGE_EXTERNAL class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_DAWOUD_PAGE_IMG),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = (): void => {
      window_open(
        'https://coptic-treasures.com/book/coptic-dictionary-moawad-abd-al-nour/',
      );
    };
  });

// Handle CLS_CRUM_PAGE_IMG class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_CRUM_PAGE_IMG),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = (): void => {
      window_open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')!}`);
    };
  });

// Handle CLS_EXPLANATORY class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_EXPLANATORY),
  (el: HTMLElement): void => {
    const alt = el.getAttribute('alt')!;
    if (!alt.startsWith('http')) {
      return;
    }
    el.classList.add(CLS_LINK);
    el.onclick = (): void => { window_open(alt); };
  });

// Handle CLS_COPTIC class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_COPTIC),
  (el: HTMLElement): void => {
    el.classList.add(CLS_HOVER_LINK);
    el.onclick = (): void => {
      window_open(
        `https://coptic-dictionary.org/results.cgi?quick_search=${el.innerHTML}`);
    };
  });

// Handle CLS_GREEK class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_GREEK),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.classList.add(CLS_LIGHT);
    el.onclick = (): void => {
      window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
    };
  });

// Handle CLS_DAWOUD_PAGE class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_DAWOUD_PAGE),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = (): void => {
      document.getElementById(
        `dawoud${el.innerHTML.slice(0, -1)}`)!.scrollIntoView();
    };
  });

// Handle CLS_DRV_KEY class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_DRV_KEY),
  (el: HTMLElement): void => {
    el.classList.add(CLS_SMALL, CLS_LIGHT, CLS_ITALIC, CLS_HOVER_LINK);
    moveElement(el, 'a', { 'href': `#drv${el.innerHTML}` });
  });

// Handle CLS_EXPLANATORY_KEY class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_EXPLANATORY_KEY),
  (el: HTMLElement): void => {
    el.classList.add(CLS_HOVER_LINK);
    moveElement(el, 'a', { 'href': `#explanatory${el.innerHTML}` });
  });

// Handle CLS_DIALECT class.
function getActiveDialectClassesInCurrentPage(): Set<Dialect> | null {
  const d = get_url_or_local('d');
  if (d === null) {
    return null;
  }
  if (d === '') {
    return new Set();
  }
  return new Set<Dialect>(
    d.split(',').filter(
      (d: string): boolean => DIALECT_CODE_TO_CLASS.has(d)).map(
      (d: string): Dialect => DIALECT_CODE_TO_CLASS.get(d)!)
  );
}

function toggleDialect(code: string): void {
  const cur: string | null = get_url_or_local('d');
  const dd = new Set<string>(cur ? cur.split(',') : []);
  if (dd.has(code)) {
    dd.delete(code);
  } else {
    dd.add(code);
  }
  set_url_and_local('d', Array.from(dd).join(','));
}

/* Update the display based on the value of the `d` parameter.
 */
function dialect(): void {
  const active: Set<Dialect> | null = getActiveDialectClassesInCurrentPage();
  function dialected(el: Element): boolean {
    return DIALECTS.some((d: Dialect) => el.classList.contains(d));
  }
  document.querySelectorAll(
    [
      CLS_DIALECT_PARENTHESIS,
      CLS_DIALECT_COMMA,
      CLS_SPELLING_COMMA,
      CLS_TYPE,
    ].map((cls) => '.' + cls).join(',')).forEach(
    (el: Element) => {
      if (active === null) {
        el.classList.remove(CLS_VERY_LIGHT);
      } else {
        el.classList.add(CLS_VERY_LIGHT);
      }
    });
  document.querySelectorAll(`.${CLS_DIALECT},.${CLS_SPELLING}`).forEach(
    (el: Element) => {
      if (!dialected(el)) {
        return;
      }
      if (active === null) {
        el.classList.remove(CLS_VERY_LIGHT);
        el.classList.remove(CLS_HEAVY);
        return;
      }
      if (Array.from(active).some((d: Dialect) => el.classList.contains(d))) {
        el.classList.remove(CLS_VERY_LIGHT);
        el.classList.add(CLS_HEAVY);
      } else {
        el.classList.remove(CLS_HEAVY);
        el.classList.add(CLS_VERY_LIGHT);
      }
    });
}

Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_DIALECT),
  (el: HTMLElement) => {
    el.classList.add(CLS_HOVER_LINK);
    el.onclick = () => {
      toggleDialect(el.innerHTML);
      dialect();
    };
  });

dialect();

// Handle CLS_DEVELOPER and CLS_DEV classes.
type DevState = 'true' | 'false' | null;
function devState(): DevState {
  return get_url_or_local('dev') as DevState;
}

function dev(): void {
  const state = devState();
  Array.prototype.forEach.call(
    document.getElementsByClassName(CLS_DEV),
    (el: HTMLElement) => {
      if (state === 'true') {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
}

Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_DEVELOPER),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      set_url_and_local('dev', devState() === 'true' ? 'false' : 'true');
      dev();
    };
  });

dev();

// Handle CLS_RESET class.
function reset(): void {
  localStorage.clear();
  const url = new URL(window.location.href);
  url.search = '';
  window.history.pushState('', '', url.toString());
  dev();
  dialect();
}

Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_RESET),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = reset;
  });
