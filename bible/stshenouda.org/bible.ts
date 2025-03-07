function getRelHref(rel: string): string | null {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}

function openRelHref(rel: string): void {
  const href = getRelHref(rel);
  if (href) {
    window.open(href, '_self');
  }
}

function BibleMain() {
  document
    .querySelectorAll<HTMLElement>('.collapse')
    .forEach((collapse: HTMLElement): void => {
      collapse.addEventListener('click', function () {
        // TODO: Remove the dependency on the HTML structure.
        const collapsible = collapse.nextElementSibling! as HTMLElement;
        collapsible.style.maxHeight = collapsible.style.maxHeight
          ? ''
          : collapsible.scrollHeight.toString() + 'px';
      });
    });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'n') {
      openRelHref('next');
    } else if (event.key === 'p') {
      openRelHref('prev');
    }
  });
}

BibleMain();
