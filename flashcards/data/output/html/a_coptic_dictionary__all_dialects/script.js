
window.addEventListener("load", function() {"use strict";
  function suppress(func) {
    try {
      func();
    }
    catch (err) {
      console.log(err);
    }
  }
  function get_url_or_local(param, default_value = null) {
    var _a, _b;
    return (_b = (_a = (new URLSearchParams(window.location.search)).get(param)) !== null && _a !== void 0 ? _a : localStorage.getItem(param)) !== null && _b !== void 0 ? _b : default_value;
  }
  function set_url_and_local(param, value) {
    localStorage.setItem(param, value);
    const url = new URL(window.location.href);
    url.searchParams.set(param, value);
    window.history.pushState("", "", url.toString());
  }
  function reset() {
    localStorage.clear();
    const url = new URL(window.location.href);
    url.search = '';
    location.replace(url.toString());
  }
  Array.prototype.forEach.call(document.getElementsByClassName('reset'), (btn) => {
    btn.classList.add('link');
    btn.onclick = reset;
  });
  Array.prototype.forEach.call(document.getElementsByClassName('crum-page'), (btn) => {
    btn.classList.add('link');
    btn.onclick = () => {
      var _a;
      (_a = document.getElementById(`crum${btn.innerHTML.slice(0, -1)}`)) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('crum-page-external'), (btn) => {
    btn.classList.add('link');
    btn.onclick = () => {
      var _a;
      (_a = window.open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${btn.innerHTML}`, '_blank')) === null || _a === void 0 ? void 0 : _a.focus();
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('coptic'), (btn) => {
    btn.classList.add('hover-link');
    btn.onclick = () => {
      var _a;
      (_a = window.open(`https://coptic-dictionary.org/results.cgi?quick_search=${btn.innerHTML}`, '_blank')) === null || _a === void 0 ? void 0 : _a.focus();
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('greek'), (btn) => {
    btn.classList.add('link');
    btn.classList.add('light');
    btn.onclick = () => {
      var _a;
      (_a = window.open(`https://logeion.uchicago.edu/${btn.innerHTML}`, '_blank')) === null || _a === void 0 ? void 0 : _a.focus();
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('dawoud-page'), (btn) => {
    btn.classList.add('link');
    btn.onclick = () => {
      var _a;
      (_a = document.getElementById(`dawoud${btn.innerHTML.slice(0, -1)}`)) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
    };
  });
  Array.prototype.forEach.call(document.getElementsByClassName('drv-key'), (btn) => {
    btn.classList.add('small', 'light', 'italic');
  });
  suppress(() => {
    const dialects = [
        'S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'
      ], dialectStyle = new Map();
    dialects.forEach((d) => { dialectStyle.set(d, ''); });
    function toggle(d) {
      dialectStyle.set(d, dialectStyle.get(d) == '' ? 'heavy' : '');
    }
    function shouldHeavy(el) {
      return dialects.some((d) => dialectStyle.get(d) == 'heavy'
            && el.classList.contains(d));
    }
    function dialected(el) {
      return dialects.some((d) => el.classList.contains(d));
    }
    function dialect(d) {
      document.querySelectorAll('.dialect-parenthesis,.dialect-comma,.spelling-comma,.type').forEach((el) => {
        el.classList.add('very-light');
      });
      toggle(d);
      document.querySelectorAll('.dialect,.spelling').forEach((el) => {
        if (!dialected(el)) {
          return;
        }
        if (shouldHeavy(el)) {
          el.classList.remove('very-light');
          el.classList.add('heavy');
        }
        else {
          el.classList.remove('heavy');
          el.classList.add('very-light');
        }
      });
      const query = dialects.filter((d) => dialectStyle.get(d) == 'heavy').join(',');
      set_url_and_local("d", query);
    }
    Array.prototype.forEach.call(document.getElementsByClassName('dialect'), (btn) => {
      btn.classList.add('hover-link');
      btn.onclick = () => { dialect(btn.innerHTML); };
    });
    const d = get_url_or_local('d');
    if (d != null) {
      d.split(',').map((d) => d).forEach(dialect);
    }
  });
  function opposite(value) {
    return (value == "true") ? "false" : "true";
  }
  function dev(value) {
    document.querySelectorAll('.dev').forEach((el) => {
      if (value == 'true') {
        el.removeAttribute('hidden');
      }
      else {
        el.setAttribute('hidden', '');
      }
    });
    if (value == null) {
      return;
    }
    set_url_and_local("dev", value);
  }
  Array.prototype.forEach.call(document.getElementsByClassName('developer'), (btn) => {
    btn.classList.add('link');
    btn.onclick = () => { dev(opposite(get_url_or_local("dev"))); };
  });
  dev(get_url_or_local("dev"));
});
