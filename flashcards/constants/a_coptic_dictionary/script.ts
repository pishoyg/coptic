function suppress(func: Function) {
  try {
    func();
  } catch (err) {
  }
}

function get_url_or_local(param: string, default_value: string | null = null) {
  const urlSearch = new URLSearchParams(window.location.search);
  if (urlSearch.has(param)) {
    return urlSearch.get(param);
  }
  const value = localStorage.getItem(param);
  if (value != null) {
    return value;
  }
  return default_value;
}

function set_url_and_local(param: string, value: string) {
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

// Handle 'reset' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('reset'),
  function(btn) {
    btn.classList.add('link');
    btn.onclick = reset;
  });

// Handle 'crum-page' class.
var els = document.getElementsByClassName('crum-page');
Array.prototype.forEach.call(els, function(btn) {
  btn.classList.add('link');
  btn.onclick = () => {
    document.getElementById('crum' + btn.innerHTML.slice(0, -1))!.scrollIntoView();
  };
});

// Handle 'crum-page-external' class.
var els = document.getElementsByClassName('crum-page-external');
Array.prototype.forEach.call(els, function(btn) {
  btn.classList.add('link');
  btn.onclick = () => {
    window.open(
      'https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID='
      + btn.innerHTML, '_blank')!.focus();
  };
});

// Handle 'coptic' class.
var els = document.getElementsByClassName('coptic');
Array.prototype.forEach.call(els, function(btn) {
  btn.classList.add('hover-link');
  btn.onclick = () => {
    window.open(
      'https://coptic-dictionary.org/results.cgi?quick_search='
      + btn.innerHTML, '_blank')!.focus();
  };
});

// Handle 'greek' class.
var els = document.getElementsByClassName('greek');
Array.prototype.forEach.call(els, function(btn) {
  btn.classList.add('link');
  btn.classList.add('light');
  btn.onclick = () => {
    window.open(
      'https://logeion.uchicago.edu/'
      + btn.innerHTML, '_blank')!.focus();
  };
});

// Handle 'dawoud-page' class.
var els = document.getElementsByClassName('dawoud-page');
Array.prototype.forEach.call(els, function(btn) {
  btn.classList.add('link');
  btn.onclick = () => {
    document.getElementById('dawoud' + btn.innerHTML.slice(0, -1))!.scrollIntoView();
  };
});

// Handle the `drv-key` class.
Array.prototype.forEach.call(
  document.getElementsByClassName('drv-key'),
  function(btn) {
    btn.classList.add('small', 'light', 'italic');
  });

// Handle the 'dialect' class.
suppress(() => {
  const dialects = ['S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'];
  const dialectStyle = new Map();
  dialects.forEach((d) => { dialectStyle.set(d, ''); });
  function toggle(d: string) {
    dialectStyle.set(d, dialectStyle.get(d) == '' ? 'heavy' : '');
  }
  function shouldHeavy(el: Element) {
    return dialects.some((d) => {
      return dialectStyle.get(d) == 'heavy' && el.classList.contains(d);
    });
  }
  function dialected(el: Element) {
    return dialects.some((d) => {
      return el.classList.contains(d);
    });
  }
  function dialect(d: string) {
    document.querySelectorAll(
      '.dialect-parenthesis,.dialect-comma,.spelling-comma,.type').forEach((el) => {
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
      } else {
        el.classList.remove('heavy');
        el.classList.add('very-light');
      }
    });

    const query = dialects.filter((d) => {
      return dialectStyle.get(d) == 'heavy';
    }).join(',');
    set_url_and_local("d", query);
  }
  var els = document.getElementsByClassName('dialect');
  Array.prototype.forEach.call(els, (btn) => {
    btn.classList.add('hover-link');
    btn.onclick = () => { dialect(btn.innerHTML); };
  });
  const d = get_url_or_local('d');
  if (d != null) {
    d.split(',').forEach(dialect);
  }
});

// Handle 'developer' and 'dev' classes.
function opposite(value: string | null) {
  if (value == 'true') {
    return 'false';
  }
  if (value == 'false') {
    return 'true';
  }
  if (!value) {
    return 'true';
  }
  return 'false';
}

function dev(value: string | null = null) {
  document.querySelectorAll('.dev').forEach((el) => {
    if (value == 'true') {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }
  });
  if (value != null) {
    set_url_and_local("dev", value);
    ;
  }
}

Array.prototype.forEach.call(
  document.getElementsByClassName('developer'),
  function(btn) {
    btn.classList.add('link');
    btn.onclick = () => {dev(opposite(get_url_or_local("dev")));};
  });

dev(get_url_or_local("dev"));
