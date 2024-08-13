
window.addEventListener("load", function() {
  // Handle 'crum-page' class.
  var els = document.getElementsByClassName('crum-page');
  Array.prototype.forEach.call(els, function(btn) {
    btn.classList.add('link');
    btn.onclick = () => {
      document.getElementById('crum' + btn.innerHTML.slice(0, -1)).scrollIntoView();
    };
  });

  // Handle 'crum-page-external' class.
  var els = document.getElementsByClassName('crum-page-external');
  Array.prototype.forEach.call(els, function(btn) {
    btn.classList.add('link');
    btn.onclick = () => {
      window.open(
        'https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID='
                + btn.innerHTML, '_blank').focus();
    };
  });

  // Handle 'coptic' class.
  var els = document.getElementsByClassName('coptic');
  Array.prototype.forEach.call(els, function(btn) {
    btn.classList.add('hover-link');
    btn.onclick = () => {
      window.open(
        'https://coptic-dictionary.org/results.cgi?quick_search='
                + btn.innerHTML, '_blank').focus();
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
                + btn.innerHTML, '_blank').focus();
    };
  });

  // Handle 'dawoud-page' class.
  var els = document.getElementsByClassName('dawoud-page');
  Array.prototype.forEach.call(els, function(btn) {
    btn.classList.add('link');
    btn.onclick = () => {
      document.getElementById('dawoud' + btn.innerHTML.slice(0, -1)).scrollIntoView();
    };
  });

  // Handle the 'dialect' class.
  const dialects = ['S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'];
  const dialectStyle = new Map();
  dialects.forEach((d) => { dialectStyle.set(d, ''); });
  function toggle(d) {
    dialectStyle.set(d, dialectStyle.get(d) == '' ? 'heavy' : '');
  }
  function shouldHeavy(el) {
    return dialects.some((d) => {
      return dialectStyle.get(d) == 'heavy' && el.classList.contains(d);
    });
  }
  function dialected(el) {
    return dialects.some((d) => {
      return el.classList.contains(d);
    });
  }
  function dialect(d) {
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
    navigateQuery = "?d=" + dialects.filter((d) => {
      return dialectStyle.get(d) == 'heavy';
    }).join(',');
    function update(href) {
      const url = new URL(href);
      url.searchParams.delete('d');
      return url.toString() + navigateQuery;
    }
    document.querySelectorAll('.navigate').forEach((el) => {
      el.setAttribute('href', update(el.getAttribute('href')));
    });
    window.history.pushState("", "", update(window.location.href));
  }
  var els = document.getElementsByClassName('dialect');
  Array.prototype.forEach.call(els, (btn) => {
    btn.classList.add('hover-link');
    btn.onclick = () => { dialect(btn.innerHTML); };
  });
  d = (new URLSearchParams(window.location.search)).get('d');
  if (d !== undefined) {
    d.split(',').forEach(dialect);
  }
});
