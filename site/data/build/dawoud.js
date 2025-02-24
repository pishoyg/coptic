'use strict';
const _HOME = '/';
const _CRUM = '/crum/';
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1060;
const next = document.getElementById('next');
const prev = document.getElementById('prev');
const imageElement = document.getElementById('scroll-dawoud-image');
function getPageParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page');
  return page ? parseInt(page) : MIN_PAGE_NUM;
}
function update(page) {
  if (page < MIN_PAGE_NUM) {
    page = MIN_PAGE_NUM;
  }
  if (page > MAX_PAGE_NUM) {
    page = MAX_PAGE_NUM;
  }
  updatePageParam(page);
  updateDisplay(page);
}
function updatePageParam(newPage) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', newPage.toString());
  window.history.pushState({}, '', url.toString());
}
function updateDisplay(page) {
  imageElement.src = `${page.toString()}.jpg`;
  imageElement.alt = page.toString();
  if (page === MIN_PAGE_NUM) {
    prev?.classList.add('disabled');
  } else {
    prev?.classList.remove('disabled');
  }
  if (page === MAX_PAGE_NUM) {
    next?.classList.add('disabled');
  } else {
    next?.classList.remove('disabled');
  }
}
function incrementPage() {
  update(getPageParam() + 1);
}
function decrementPage() {
  update(getPageParam() - 1);
}
function handleKeyDown(event) {
  if (event.code === 'KeyN') {
    incrementPage();
  } else if (event.code === 'KeyP') {
    decrementPage();
  } else if (event.code === 'KeyH' && event.shiftKey) {
    window.open(_HOME, '_blank', 'noopener,noreferrer')?.focus();
  } else if (event.code === 'KeyX' && event.shiftKey) {
    window.open(_CRUM, '_blank', 'noopener,noreferrer')?.focus();
  }
}
function dawoudMain() {
  document.addEventListener('keydown', handleKeyDown);
  next?.addEventListener('click', incrementPage);
  prev?.addEventListener('click', decrementPage);
  update(getPageParam());
}
dawoudMain();
