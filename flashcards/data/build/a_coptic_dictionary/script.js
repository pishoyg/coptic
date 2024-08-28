'use strict';
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
const DIALECT_CODE_TO_CLASS = (function () {
  const codeToClass = new Map();
  DIALECTS.forEach((cls) => {
    var _a;
    const code = (_a = document.querySelector(`.${CLS_DIALECT}.${cls}`)) === null || _a === void 0 ? void 0 : _a.innerHTML;
    if (code === undefined) {
      return;
    }
    codeToClass.set(code, cls);
  });
  return codeToClass;
}());
function get_url_or_local(param, default_value = null) {
  var _a, _b;
  return (_b = (_a = (new URLSearchParams(window.location.search)).get(param)) !== null && _a !== void 0 ? _a : localStorage.getItem(param)) !== null && _b !== void 0 ? _b : default_value;
}
function window_open(url) {
  window.open(url, '_blank', 'noopener,noreferrer').focus();
}
function set_url_and_local(param, value) {
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
function moveElement(el, tag, attrs) {
  var _a;
  const copy = document.createElement(tag);
  copy.innerHTML = el.innerHTML;
  Array.from(el.attributes).forEach((att) => {
    copy.setAttribute(att.name, att.value);
  });
  Object.entries(attrs).forEach(([key, value]) => {
    copy.setAttribute(key, value);
  });
  (_a = el.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(copy, el);
}
Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE), (el) => {
  el.classList.add(CLS_LINK);
  el.onclick = () => {
    let pageNumber = el.innerHTML;
    const lastChar = pageNumber.substr(pageNumber.length - 1);
    if (lastChar === 'a' || lastChar === 'b') {
      pageNumber = pageNumber.slice(0, -1);
    }
    document.getElementById(`crum${pageNumber}`).scrollIntoView();
  };
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE_EXTERNAL), (el) => {
  el.classList.add(CLS_LINK);
  el.onclick = () => {
    window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`);
  };
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_DAWOUD_PAGE_EXTERNAL), (el) => {
  el.classList.add(CLS_LINK);
  el.onclick = () => {
    window_open('https://coptic-treasures.com/book/coptic-dictionary-moawad-abd-al-nour/');
  };
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_CRUM_PAGE_IMG), (el) => {
  el.classList.add(CLS_LINK);
  el.onclick = () => {
    window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`);
  };
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_EXPLANATORY), (el) => {
  const alt = el.getAttribute('alt');
  if (!alt.startsWith('http')) {
    return;
  }
  el.classList.add(CLS_LINK);
  el.onclick = () => { window_open(alt); };
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_COPTIC), (el) => {
  el.classList.add(CLS_HOVER_LINK);
  el.onclick = () => {
    window_open(`https://coptic-dictionary.org/results.cgi?quick_search=${el.innerHTML}`);
  };
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_GREEK), (el) => {
  el.classList.add(CLS_LINK);
  el.classList.add(CLS_LIGHT);
  el.onclick = () => {
    window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
  };
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_DAWOUD_PAGE), (el) => {
  el.classList.add(CLS_LINK);
  el.onclick = () => {
    document.getElementById(`dawoud${el.innerHTML.slice(0, -1)}`).scrollIntoView();
  };
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_DRV_KEY), (el) => {
  el.classList.add(CLS_SMALL, CLS_LIGHT, CLS_ITALIC, CLS_HOVER_LINK);
  moveElement(el, 'a', { 'href': `#drv${el.innerHTML}` });
});
Array.prototype.forEach.call(document.getElementsByClassName(CLS_EXPLANATORY_KEY), (el) => {
  el.classList.add(CLS_HOVER_LINK);
  moveElement(el, 'a', { 'href': `#explanatory${el.innerHTML}` });
});
function getActiveDialectClassesInCurrentPage() {
  const d = get_url_or_local('d');
  if (d === null) {
    return null;
  }
  if (d === '') {
    return new Set();
  }
  return new Set(d.split(',').filter((d) => DIALECT_CODE_TO_CLASS.has(d)).map((d) => DIALECT_CODE_TO_CLASS.get(d)));
}
function toggleDialect(code) {
  let d = get_url_or_local('d');
  if (d === null) {
    d = '';
  }
  const dd = new Set(d.split(','));
  if (dd.has(code)) {
    dd.delete(code);
  }
  else {
    dd.add(code);
  }
  d = Array.from(dd).join(',');
  set_url_and_local('d', d);
}
function dialect() {
  const active = getActiveDialectClassesInCurrentPage();
  function dialected(el) {
    return DIALECTS.some((d) => el.classList.contains(d));
  }
  document.querySelectorAll(`.${CLS_DIALECT_PARENTHESIS},.${CLS_DIALECT_COMMA},.${CLS_SPELLING_COMMA},.${CLS_TYPE}`).forEach((el) => {
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
    set_url_and_local('dev', devState() === 'true' ? 'false' : 'true');
    dev();
  };
});
dev();
function reset() {
  localStorage.clear();
  const url = new URL(window.location.href);
  url.search = '';
  window.history.pushState('', '', url.toString());
  dev();
  dialect();
}
Array.prototype.forEach.call(document.getElementsByClassName(CLS_RESET), (el) => {
  el.classList.add(CLS_LINK);
  el.onclick = reset;
});
