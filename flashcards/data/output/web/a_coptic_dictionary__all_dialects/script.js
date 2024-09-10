'use strict';
window.addEventListener('load', () => {
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
  const CLS_S = 'S';
  const CLS_Sa = 'Sa';
  const CLS_Sf = 'Sf';
  const CLS_A = 'A';
  const CLS_sA = 'sA';
  const CLS_B = 'B';
  const CLS_F = 'F';
  const CLS_Fb = 'Fb';
  const CLS_O = 'O';
  const CLS_NH = 'NH';
  const DIALECTS = [
    CLS_S, CLS_Sa, CLS_Sf, CLS_A, CLS_sA, CLS_B, CLS_F, CLS_Fb, CLS_O, CLS_NH,
  ];
  function get_url_or_local(param, default_value = null) {
    return (new URLSearchParams(window.location.search)).get(param)
        ?? localStorage.getItem(param)
        ?? default_value;
  }
  function window_open(url) {
    window.open(url, '_blank', 'noopener,noreferrer').focus();
  }
  function set_url_and_local(param, value) {
    localStorage.setItem(param, value);
    const url = new URL(window.location.href);
    url.searchParams.set(param, value);
    url.search = decodeURIComponent(url.search);
    window.history.replaceState('', '', url.toString());
  }
  function moveElement(el, tag, attrs) {
    const copy = document.createElement(tag);
    copy.innerHTML = el.innerHTML;
    Array.from(el.attributes).forEach((att) => {
      copy.setAttribute(att.name, att.value);
    });
    Object.entries(attrs).forEach(([key, value]) => {
      copy.setAttribute(key, value);
    });
    el.parentNode?.replaceChild(copy, el);
  }
  // Handle CLS_CRUM_PAGE class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE), (el) => {
    el.classList.add(CLS_LINK);
    let pageNumber = el.innerHTML;
    const lastChar = pageNumber.substr(pageNumber.length - 1);
    if (lastChar === 'a' || lastChar === 'b') {
      pageNumber = pageNumber.slice(0, -1);
    }
    moveElement(el, 'a', { 'href': `#crum${pageNumber}` });
  });
  // Handle CLS_CRUM_PAGE_EXTERNAL class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE_EXTERNAL), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`);
    };
  });
  // Handle CLS_DAWOUD_PAGE_EXTERNAL class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DAWOUD_PAGE_IMG), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      window_open('https://coptic-treasures.com/book/coptic-dictionary-moawad-abd-al-nour/');
    };
  });
  // Handle CLS_CRUM_PAGE_IMG class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE_IMG), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`);
    };
  });
  // Handle CLS_EXPLANATORY class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_EXPLANATORY), (el) => {
    const alt = el.getAttribute('alt');
    if (!alt.startsWith('http')) {
      return;
    }
    el.classList.add(CLS_LINK);
    el.onclick = () => { window_open(alt); };
  });
  // Handle CLS_COPTIC class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_COPTIC), (el) => {
    el.classList.add(CLS_HOVER_LINK);
    el.onclick = () => {
      window_open(`https://coptic-dictionary.org/results.cgi?quick_search=${el.innerHTML}`);
    };
  });
  // Handle CLS_GREEK class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_GREEK), (el) => {
    el.classList.add(CLS_LINK);
    el.classList.add(CLS_LIGHT);
    el.onclick = () => {
      window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
    };
  });
  // Handle CLS_DAWOUD_PAGE class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DAWOUD_PAGE), (el) => {
    el.classList.add(CLS_LINK);
    moveElement(el, 'a', { 'href': `#dawoud${el.innerHTML.slice(0, -1)}` });
  });
  // Handle CLS_DRV_KEY class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DRV_KEY), (el) => {
    el.classList.add(CLS_SMALL, CLS_LIGHT, CLS_ITALIC, CLS_HOVER_LINK);
    moveElement(el, 'a', { 'href': `#drv${el.innerHTML}` });
  });
  // Handle CLS_EXPLANATORY_KEY class.
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_EXPLANATORY_KEY), (el) => {
    el.classList.add(CLS_HOVER_LINK);
    moveElement(el, 'a', { 'href': `#explanatory${el.innerHTML}` });
  });
  // Handle CLS_DIALECT class.
  function getActiveDialectClassesInCurrentPage() {
    const d = get_url_or_local('d');
    return d === null
      ? null
      : d === ''
        ? new Set()
        : new Set(d.split(',').map((d) => d));
  }
  function toggleDialect(code) {
    const cur = get_url_or_local('d');
    const dd = new Set(cur ? cur.split(',') : []);
    if (dd.has(code)) {
      dd.delete(code);
    }
    else {
      dd.add(code);
    }
    set_url_and_local('d', Array.from(dd).join(','));
  }
  /* Update the display based on the value of the `d` parameter.
 */
  function dialect() {
    const active = getActiveDialectClassesInCurrentPage();
    function dialected(el) {
      return DIALECTS.some((d) => el.classList.contains(d));
    }
    document.querySelectorAll([
      CLS_DIALECT_PARENTHESIS,
      CLS_DIALECT_COMMA,
      CLS_SPELLING_COMMA,
      CLS_TYPE,
    ].map((cls) => '.' + cls).join(',')).forEach((el) => {
      if (active === null) {
        el.classList.remove(CLS_VERY_LIGHT);
      }
      else {
        el.classList.add(CLS_VERY_LIGHT);
      }
    });
    document.querySelectorAll(`.${CLS_DIALECT},.${CLS_SPELLING}`).forEach((el) => {
      if (!dialected(el)) {
        return;
      }
      if (active === null) {
        el.classList.remove(CLS_VERY_LIGHT);
        el.classList.remove(CLS_HEAVY);
        return;
      }
      if (Array.from(active).some((d) => el.classList.contains(d))) {
        el.classList.remove(CLS_VERY_LIGHT);
        el.classList.add(CLS_HEAVY);
      }
      else {
        el.classList.remove(CLS_HEAVY);
        el.classList.add(CLS_VERY_LIGHT);
      }
    });
  }
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DIALECT), (el) => {
    el.classList.add(CLS_HOVER_LINK);
    el.onclick = () => {
      toggleDialect(el.innerHTML);
      dialect();
    };
  });
  dialect();
  function devState() {
    return get_url_or_local('dev');
  }
  function dev() {
    const state = devState();
    Array.prototype.forEach.call(document.getElementsByClassName(CLS_DEV), (el) => {
      if (state === 'true') {
        el.removeAttribute('hidden');
      }
      else {
        el.setAttribute('hidden', '');
      }
    });
  }
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_DEVELOPER), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = () => {
      localStorage.setItem('dev', devState() === 'true' ? 'false' : 'true');
      dev();
    };
  });
  dev();
  // Handle CLS_RESET class.
  function reset() {
    localStorage.clear();
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState('', '', url.toString());
    dev();
    dialect();
  }
  Array.prototype.forEach.call(document.getElementsByClassName(CLS_RESET), (el) => {
    el.classList.add(CLS_LINK);
    el.onclick = reset;
  });
});
