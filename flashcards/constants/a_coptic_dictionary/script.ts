function suppress(func: () => void): void {
  try {
    func();
  } catch (err) {
    console.log(err);
  }
}

function get_url_or_local(
  param: string,
  default_value: string | null = null): string | null {
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

function set_url_and_local(param: string, value: string): void {
  localStorage.setItem(param, value);
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  window.history.pushState("", "", url.toString());
}

function reset(): void {
  localStorage.clear();
  const url = new URL(window.location.href);
  url.search = '';
  location.replace(url.toString());
}

// Handle 'reset' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('reset'),
  (btn: HTMLElement): void => {
    btn.classList.add('link');
    btn.onclick = reset;
  });

// Handle 'crum-page' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('crum-page'),
  (btn: HTMLElement): void => {
    btn.classList.add('link');
    btn.onclick = (): void => {
      document.getElementById(
        `crum${btn.innerHTML.slice(0, -1)}`)?.scrollIntoView();
    };
  });

// Handle 'crum-page-external' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('crum-page-external'),
  (btn: HTMLElement): void => {
    btn.classList.add('link');
    btn.onclick = (): void => {
      window.open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${btn.innerHTML}`, '_blank')?.focus();
    };
  });

// Handle 'coptic' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('coptic'),
  (btn: HTMLElement): void => {
    btn.classList.add('hover-link');
    btn.onclick = (): void => {
      window.open(
        `https://coptic-dictionary.org/results.cgi?quick_search=${btn.innerHTML}`,
        '_blank')?.focus();
    };
  });

// Handle 'greek' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('greek'),
  (btn: HTMLElement): void => {
    btn.classList.add('link');
    btn.classList.add('light');
    btn.onclick = (): void => {
      window.open(
        `https://logeion.uchicago.edu/${btn.innerHTML}`, '_blank')?.focus();
    };
  });

// Handle 'dawoud-page' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('dawoud-page'),
  (btn: HTMLElement): void => {
    btn.classList.add('link');
    btn.onclick = (): void => {
      document.getElementById(
        `dawoud${btn.innerHTML.slice(0, -1)}`)?.scrollIntoView();
    };
  });

// Handle the `drv-key` class.
Array.prototype.forEach.call(
  document.getElementsByClassName('drv-key'),
  (btn: HTMLElement): void => {
    btn.classList.add('small', 'light', 'italic');
  });

// Handle the 'dialect' class.
suppress(() => {
  const dialects: string[] = [
    'S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'],
    dialectStyle = new Map<string, string>();
  dialects.forEach((d: string) => { dialectStyle.set(d, ''); });
  function toggle(d: string): void {
    dialectStyle.set(d, dialectStyle.get(d) == '' ? 'heavy' : '');
  }
  function shouldHeavy(el: Element): boolean {
    return dialects.some((d: string) =>
      dialectStyle.get(d) == 'heavy'
      && el.classList.contains(d));
  }
  function dialected(el: Element): boolean {
    return dialects.some((d: string) => el.classList.contains(d));
  }
  function dialect(d: string): void {
    document.querySelectorAll(
      '.dialect-parenthesis,.dialect-comma,.spelling-comma,.type').forEach(
      (el) => {
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

    const query: string = dialects.filter(
      (d) => dialectStyle.get(d) == 'heavy').join(',');
    set_url_and_local("d", query);
  }
  Array.prototype.forEach.call(
    document.getElementsByClassName('dialect'),
    (btn) => {
      btn.classList.add('hover-link');
      btn.onclick = () => { dialect(btn.innerHTML); };
    });
  const d: string | null = get_url_or_local('d');
  if (d != null) {
    d.split(',').forEach(dialect);
  }
});

// Handle 'developer' and 'dev' classes.
function opposite(value: string | null): string {
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

function dev(value: string | null = null): void {
  document.querySelectorAll('.dev').forEach((el) => {
    if (value == 'true') {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }
  });
  if (value == null) {
    return;
  }
  set_url_and_local("dev", value);
}

Array.prototype.forEach.call(
  document.getElementsByClassName('developer'),
  (btn: HTMLElement): void => {
    btn.classList.add('link');
    btn.onclick = () => { dev(opposite(get_url_or_local("dev"))); };
  });

dev(get_url_or_local("dev"));
