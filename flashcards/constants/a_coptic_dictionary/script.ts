function get_url_or_local(
  param: string,
  default_value: string | null = null): string | null {
  return (new URLSearchParams(window.location.search)).get(param)
    ?? localStorage.getItem(param)
    ?? default_value;
}

function set_url_and_local(param: string, value: string | null): void {
  if (value == null) {
    localStorage.removeItem(param);
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.pushState('', '', url.toString());
    return;
  }
  localStorage.setItem(param, value);
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  window.history.pushState('', '', url.toString());
}

function reset(): void {
  localStorage.clear();
  const url = new URL(window.location.href);
  url.search = '';
  window.history.pushState('', '', url.toString());
  dev();
  dialect();
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
      let pageNumber: string = btn.innerHTML;
      const lastChar = pageNumber.substr(pageNumber.length - 1);
      if (lastChar == 'a' || lastChar == 'b') {
        pageNumber = pageNumber.slice(0, -1);
      }
      document.getElementById(`crum${pageNumber}`)?.scrollIntoView();
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

// Handle 'crum-page-img' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('crum-page-img'),
  (btn: HTMLElement): void => {
    btn.classList.add('link');
    btn.onclick = (): void => {
      window.open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${btn.getAttribute('alt')}`, '_blank')?.focus();
    };
  });

// Handle 'crum-page-img' class.
Array.prototype.forEach.call(
  document.getElementsByClassName('explanatory'),
  (btn: HTMLElement): void => {
    const alt = btn.getAttribute('alt');
    if (!alt) {
      return;
    }
    if (!alt.startsWith('http')) {
      return;
    }
    btn.classList.add('link');
    btn.onclick = (): void => {
      window.open(alt, '_blank')?.focus();
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
type Dialect = 'S' | 'Sa' | 'Sf' | 'A' | 'sA' | 'B' | 'F' | 'Fb' | 'O' | 'NH';
function activeDialects(): Set<Dialect> | null {
  const d = get_url_or_local('d');
  if (d == null) {
    return null;
  }
  return new Set(d.split(',').map((d) => d as Dialect));
}

/* Update the display based on the value of the `d` parameter.
 */
function dialect(): void {
  const dialects: readonly Dialect[] = [
    'S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'];
  const active: Set<Dialect> | null = activeDialects();
  function dialected(el: Element): boolean {
    return dialects.some((d: Dialect) => el.classList.contains(d));
  }
  document.querySelectorAll(
    '.dialect-parenthesis,.dialect-comma,.spelling-comma,.type').forEach(
    (el) => {
      if (active == null) {
        el.classList.remove('very-light');
      } else {
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
    if (Array.from(active).some((d: Dialect) => el.classList.contains(d))) {
      el.classList.remove('very-light');
      el.classList.add('heavy');
    } else {
      el.classList.remove('heavy');
      el.classList.add('very-light');
    }
  });
}

Array.prototype.forEach.call(
  document.getElementsByClassName('dialect'),
  (btn) => {
    btn.classList.add('hover-link');
    btn.onclick = () => {
      const d: Dialect = btn.innerHTML;
      let active = activeDialects();
      if (active == null) {
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

// Handle 'developer' and 'dev' classes.
type DevState = 'true' | 'false' | null;
function devState(): DevState {
  return get_url_or_local('dev') as DevState;
}

function dev(): void {
  const state = devState();
  document.querySelectorAll('.dev').forEach((el) => {
    if (state == 'true') {
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden', '');
    }
  });
}

Array.prototype.forEach.call(
  document.getElementsByClassName('developer'),
  (btn: HTMLElement): void => {
    btn.classList.add('link');
    btn.onclick = () => {
      set_url_and_local('dev', devState() == 'true' ? 'false' : 'true');
      dev();
    };
  });

dev();
