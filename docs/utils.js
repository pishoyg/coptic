export function developerMode() {
  return localStorage.getItem('dev') == 'true';
}
export function time(name) {
  if (developerMode()) {
    console.time(name);
  }
}
export function timeEnd(name) {
  if (developerMode()) {
    console.timeEnd(name);
  }
}
export function getLinkHref(rel) {
  const linkElement = document.querySelector(`link[rel="${rel}"]`);
  return linkElement instanceof HTMLLinkElement ? linkElement.href : null;
}
export function openLinkHref(rel, target = '_self') {
  const href = getLinkHref(rel);
  if (href) {
    window.open(href, target);
  }
}
export function openNextLink() {
  openLinkHref('next');
}
export function openPrevLink() {
  openLinkHref('prev');
}
export function openSearchLink() {
  openLinkHref('search', '_blank');
}
