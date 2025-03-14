'use strict';
function getRelHref(rel) {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}
function openRelHref(rel) {
  const href = getRelHref(rel);
  if (href) {
    window.open(href, '_self');
  }
}
function BibleMain() {
  document.querySelectorAll('.collapse').forEach((collapse) => {
    collapse.addEventListener('click', function () {
      // TODO: Remove the dependency on the HTML structure.
      const collapsible = collapse.nextElementSibling;
      collapsible.style.maxHeight = collapsible.style.maxHeight
        ? ''
        : collapsible.scrollHeight.toString() + 'px';
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'n') {
      openRelHref('next');
    } else if (event.key === 'p') {
      openRelHref('prev');
    }
  });
}
BibleMain();
