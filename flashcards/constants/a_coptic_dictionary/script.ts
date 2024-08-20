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
  return (new URLSearchParams(window.location.search)).get(param)
    ?? localStorage.getItem(param)
    ?? default_value;
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
type Dialect = 'S'| 'Sa'| 'Sf'| 'A'| 'sA'| 'B'| 'F'| 'Fb'| 'O'| 'NH';
type DialectState = "" | "heavy";
suppress(() => {
  const dialects: Dialect[] = [
    'S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'],
    dialectStyle = new Map<Dialect, DialectState>();
  dialects.forEach((d: Dialect) => { dialectStyle.set(d, ''); });
  function toggle(d: Dialect): void {
    dialectStyle.set(d, dialectStyle.get(d) == '' ? 'heavy' : '');
  }
  function shouldHeavy(el: Element): boolean {
    return dialects.some((d: Dialect) =>
      dialectStyle.get(d) == 'heavy'
      && el.classList.contains(d));
  }
  function dialected(el: Element): boolean {
    return dialects.some((d: Dialect) => el.classList.contains(d));
  }
  function dialect(d: Dialect): void {
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
    d.split(',').map((d) => d as Dialect).forEach(dialect);
  }
});

// Handle 'developer' and 'dev' classes.
type DevState = "true" | "false" | null;

function opposite(value: DevState): DevState {
  return (value == "true") ? "false" : "true";
}

function dev(value: DevState): void {
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
    btn.onclick = () => { dev(opposite(get_url_or_local("dev") as DevState)); };
  });

dev(get_url_or_local("dev") as DevState);
