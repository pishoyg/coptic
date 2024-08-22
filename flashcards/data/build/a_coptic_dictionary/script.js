"use strict";
function get_url_or_local(param, default_value = null) {
  var _a, _b;
  return (_b = (_a = (new URLSearchParams(window.location.search)).get(param)) !== null && _a !== void 0 ? _a : localStorage.getItem(param)) !== null && _b !== void 0 ? _b : default_value;
}
function set_url_and_local(param, value) {
  if (value == null) {
    localStorage.removeItem(param);
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.pushState("", "", url.toString());
    return;
  }
  localStorage.setItem(param, value);
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  window.history.pushState("", "", url.toString());
}
function reset() {
  localStorage.clear();
  const url = new URL(window.location.href);
  url.search = '';
  window.history.pushState("", "", url.toString());
  dev();
  dialect();
}
Array.prototype.forEach.call(document.getElementsByClassName('reset'), (btn) => {
  btn.classList.add('link');
  btn.onclick = reset;
});
Array.prototype.forEach.call(document.getElementsByClassName('crum-page'), (btn) => {
  btn.classList.add('link');
  btn.onclick = () => {
    var _a;
    let pageNumber = btn.innerHTML;
    const lastChar = pageNumber.substr(pageNumber.length - 1);
    if (lastChar == "a" || lastChar == "b") {
      pageNumber = pageNumber.slice(0, -1);
    }
    (_a = document.getElementById(`crum${pageNumber}`)) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
  };
});
Array.prototype.forEach.call(document.getElementsByClassName('crum-page-external'), (btn) => {
  btn.classList.add('link');
  btn.onclick = () => {
    var _a;
    (_a = window.open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${btn.innerHTML}`, '_blank')) === null || _a === void 0 ? void 0 : _a.focus();
  };
});
Array.prototype.forEach.call(document.getElementsByClassName('crum-page-img'), (btn) => {
  btn.classList.add('link');
  btn.onclick = () => {
    var _a;
    (_a = window.open(`https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${btn.getAttribute("alt")}`, '_blank')) === null || _a === void 0 ? void 0 : _a.focus();
  };
});
Array.prototype.forEach.call(document.getElementsByClassName('explanatory'), (btn) => {
  const alt = btn.getAttribute("alt");
  if (!alt) {
    return;
  }
  if (!alt.startsWith("http")) {
    return;
  }
  btn.classList.add('link');
  btn.onclick = () => {
    var _a;
    (_a = window.open(alt, '_blank')) === null || _a === void 0 ? void 0 : _a.focus();
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
function activeDialects() {
  const d = get_url_or_local("d");
  if (d == null) {
    return null;
  }
  return new Set(d.split(",").map((d) => d));
}
function dialect() {
  const dialects = [
    'S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'
  ];
  const active = activeDialects();
  function dialected(el) {
    return dialects.some((d) => el.classList.contains(d));
  }
  document.querySelectorAll('.dialect-parenthesis,.dialect-comma,.spelling-comma,.type').forEach((el) => {
    if (active == null) {
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
    if (active == null) {
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
Array.prototype.forEach.call(document.getElementsByClassName('dialect'), (btn) => {
  btn.classList.add('hover-link');
  btn.onclick = () => {
    const d = btn.innerHTML;
    let active = activeDialects();
    if (active == null) {
      active = new Set();
    }
    if (active.has(d)) {
      active.delete(d);
    }
    else {
      active.add(d);
    }
    set_url_and_local("d", Array.from(active).join(","));
    dialect();
  };
});
dialect();
function devState() {
  return get_url_or_local("dev");
}
function dev() {
  const state = devState();
  document.querySelectorAll('.dev').forEach((el) => {
    if (state == 'true') {
      el.removeAttribute('hidden');
    }
    else {
      el.setAttribute('hidden', '');
    }
  });
}
Array.prototype.forEach.call(document.getElementsByClassName('developer'), (btn) => {
  btn.classList.add('link');
  btn.onclick = () => {
    set_url_and_local("dev", devState() == "true" ? "false" : "true");
    dev();
  };
});
dev();
