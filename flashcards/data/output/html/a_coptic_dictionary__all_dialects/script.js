
window.addEventListener('load', () => { 'use strict';
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
    el.getAttributeNames().forEach((attr) => {
      copy.setAttribute(attr, el.getAttribute(attr));
    });
    for (const [key, value] of Object.entries(attrs)) {
      copy.setAttribute(key, value);
    }
    (_a = el.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(copy, el);
  }
  Array.prototype.forEach.call(document.getElementsByClassName('crum-page'), (el) => {
    el.classList.add('link');
    el.onclick = () => {
      let pageNumber = el.innerHTML;
      const lastChar = pageNumber.substr(pageNumber.length - 1);
      if (lastChar === 'a' || lastChar === 'b') {
        pageNumber = pageNumber.slice(0, -1);
      }
      document.getElementById(`crum${pageNumber}`).scrollIntoView();
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('crum-page-external'), (el) => {
    el.classList.add('link');
    el.onclick = () => {
      window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`);
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('crum-page-img'), (el) => {
    el.classList.add('link');
    el.onclick = () => {
      window_open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`);
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('explanatory'), (el) => {
    const alt = el.getAttribute('alt');
    if (!alt.startsWith('http')) {
      return;
    }
    el.classList.add('link');
    el.onclick = () => { window_open(alt); };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('coptic'), (el) => {
    el.classList.add('hover-link');
    el.onclick = () => {
      window_open(`https://coptic-dictionary.org/results.cgi?quick_search=${el.innerHTML}`);
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('greek'), (el) => {
    el.classList.add('link');
    el.classList.add('light');
    el.onclick = () => {
      window_open(`https://logeion.uchicago.edu/${el.innerHTML}`);
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('dawoud-page'), (el) => {
    el.classList.add('link');
    el.onclick = () => {
      document.getElementById(`dawoud${el.innerHTML.slice(0, -1)}`).scrollIntoView();
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('drv-key'), (el) => {
    el.classList.add('small', 'light', 'italic', 'hover-link');
    moveElement(el, 'a', { 'href': `#drv${el.innerHTML}` });
  });
  Array.prototype.forEach.call(document.getElementsByClassName('explanatory-key'), (el) => {
    el.classList.add('hover-link');
    moveElement(el, 'a', { 'href': `#explanatory${el.innerHTML}` });
  });
  function DIALECTS() {
    return ['S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'];
  }
  function activeDialects() {
    const d = get_url_or_local('d');
    if (d === null) {
      return null;
    }
    if (d === '') {
      return new Set();
    }
    return new Set(d.split(',').map((d) => d));
  }
  function dialect() {
    const active = activeDialects();
    function dialected(el) {
      return DIALECTS().some((d) => el.classList.contains(d));
    }
    document.querySelectorAll('.dialect-parenthesis,.dialect-comma,.spelling-comma,.type').forEach((el) => {
      if (active === null) {
        el.classList.remove('very-light');
      }
      else {
        el.classList.add('very-light');
      }
    });
    document.querySelectorAll('.dialect,.spelling').forEach((el) => {
      if (!dialected(el)) {
        return;
      }
      if (active === null) {
        el.classList.remove('very-light');
        el.classList.remove('heavy');
        return;
      }
      if (Array.from(active).some((d) => el.classList.contains(d))) {
        el.classList.remove('very-light');
        el.classList.add('heavy');
      }
      else {
        el.classList.remove('heavy');
        el.classList.add('very-light');
      }
    });
  }
  Array.prototype.forEach.call(document.getElementsByClassName('dialect'), (el) => {
    el.classList.add('hover-link');
    el.onclick = () => {
      const dClasses = DIALECTS().filter((d) => el.classList.contains(d));
      if (dClasses.length !== 1) {
        return;
      }
      const d = dClasses[0];
      if (!d) {
        return;
      }
      let active = activeDialects();
      if (active === null) {
        active = new Set();
      }
      if (active.has(d)) {
        active.delete(d);
      }
      else {
        active.add(d);
      }
      set_url_and_local('d', Array.from(active).join(','));
      dialect();
    };
  });
  dialect();
  function devState() {
    return get_url_or_local('dev');
  }
  function dev() {
    const state = devState();
    Array.prototype.forEach.call(document.getElementsByClassName('dev'), (el) => {
      if (state === 'true') {
        el.removeAttribute('hidden');
      }
      else {
        el.setAttribute('hidden', '');
      }
    });
  }
  Array.prototype.forEach.call(document.getElementsByClassName('developer'), (el) => {
    el.classList.add('link');
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
  Array.prototype.forEach.call(document.getElementsByClassName('reset'), (el) => {
    el.classList.add('link');
    el.onclick = reset;
  });
});
