'use strict';
// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.

// NOTE: All our classes must be defined as constants, in order to facilitate
// obfuscation of the HTML and CSS.
// NOTE: Be careful to only use those constants in contexts where they are
// intended as HTML classes. If a constant (e.g. a query parameter) happens to
// bear a name that is similar to the class name, use the bare constant.
const CLS_CRUM_PAGE = 'crum-page';
const CLS_CRUM_PAGE_EXTERNAL = 'crum-page-external';
const CLS_DAWOUD_PAGE_EXTERNAL = 'dawoud-page-external';
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

function querySelectorAll(...classes: string[]): NodeListOf<Element> {
  return document.querySelectorAll(classes.map((c) => '.' + c).join(','));
}

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

function moveElement(el: HTMLElement, tag: string, attrs: Record<string, string>): void {
  const copy = document.createElement(tag);
  copy.innerHTML = el.innerHTML;
  el.getAttributeNames().forEach((attr) => {
    copy.setAttribute(attr, el.getAttribute(attr)!);
  });
  for (const [key, value] of Object.entries(attrs)) {
    copy.setAttribute(key, value);
  }
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
  document.getElementsByClassName(CLS_DAWOUD_PAGE_EXTERNAL),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = (): void => {
      window_open(
        'https://coptic-treasures.com/book/coptic-dictionary-moawad-abd-al-nour/');
    };
  });

// Handle CLS_CRUM_PAGE_IMG class.
Array.prototype.forEach.call(
  document.getElementsByClassName(CLS_CRUM_PAGE_IMG),
  (el: HTMLElement): void => {
    el.classList.add(CLS_LINK);
    el.onclick = (): void => {
      window_open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`);
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
// NOTE: We, unfortunately, can not obfuscate the dialect classes, because
// they are used as parameters.
type Dialect = 'S' | 'Sa' | 'Sf' | 'A' | 'sA' | 'B' | 'F' | 'Fb' | 'O' | 'NH';
const DIALECTS: readonly Dialect[] = ['S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'];

function activeDialects(): Set<Dialect> | null {
  const d = get_url_or_local('d');
  if (d === null) {
    return null;
  }
  if (d === '') {
    return new Set();
  }
  return new Set(d.split(',').map((d) => d as Dialect));
}

/* Update the display based on the value of the `d` parameter.
 */
function dialect(): void {
  const active: Set<Dialect> | null = activeDialects();
  function dialected(el: Element): boolean {
    return DIALECTS.some((d: Dialect) => el.classList.contains(d));
  }
  querySelectorAll(CLS_DIALECT_PARENTHESIS, CLS_DIALECT_COMMA, CLS_SPELLING_COMMA, CLS_TYPE).forEach(
    (el: Element) => {
      if (active === null) {
        el.classList.remove(CLS_VERY_LIGHT);
      } else {
        el.classList.add(CLS_VERY_LIGHT);
      }
    });
  querySelectorAll(CLS_DIALECT, CLS_SPELLING).forEach((el: Element) => {
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
      const dClasses: readonly Dialect[] = DIALECTS.filter(
        (d) => el.classList.contains(d));
      if (dClasses.length !== 1) {
        // This is unexpected!
        return;
      }
      const d: Dialect | undefined = dClasses[0];
      if (!d) {
        return;
      }
      let active = activeDialects();
      if (active === null) {
        active = new Set<Dialect>();
      }
      if (active.has(d)) {
        active.delete(d);
      } else {
        active.add(d);
      }
      set_url_and_local('d', Array.from(active).join(','));
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
