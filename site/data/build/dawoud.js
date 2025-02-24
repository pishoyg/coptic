'use strict';
const _HOME = '/';
const _CRUM = '/crum/';
const MIN_PAGE_NUM = 0;
const MAX_PAGE_NUM = 1060;
const image = document.getElementById('scroll-dawoud-image');
const nextButton = document.getElementById('next');
const prevButton = document.getElementById('prev');
const resetButton = document.getElementById('reset');
class Scroller {
  constructor() {
    this.initEventListeners();
    this.update(this.getPageParam());
  }
  getPageParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    return page ? parseInt(page) : MIN_PAGE_NUM;
  }
  update(page) {
    if (page < MIN_PAGE_NUM) {
      page = MIN_PAGE_NUM;
    }
    if (page > MAX_PAGE_NUM) {
      page = MAX_PAGE_NUM;
    }
    this.updatePageParam(page);
    this.updateDisplay(page);
  }
  updatePageParam(newPage) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url.toString());
  }
  updateDisplay(page) {
    image.src = `${page.toString()}.jpg`;
    image.alt = page.toString();
    if (page === MIN_PAGE_NUM) {
      prevButton?.classList.add('disabled');
    } else {
      prevButton?.classList.remove('disabled');
    }
    if (page === MAX_PAGE_NUM) {
      nextButton?.classList.add('disabled');
    } else {
      nextButton?.classList.remove('disabled');
    }
  }
  incrementPage() {
    this.update(this.getPageParam() + 1);
  }
  decrementPage() {
    this.update(this.getPageParam() - 1);
  }
  handleKeyDown(event) {
    if (event.code === 'KeyN') {
      this.incrementPage();
    } else if (event.code === 'KeyP') {
      this.decrementPage();
    } else if (event.code === 'KeyH' && event.shiftKey) {
      window.open(_HOME, '_blank', 'noopener,noreferrer')?.focus();
    } else if (event.code === 'KeyX' && event.shiftKey) {
      window.open(_CRUM, '_blank', 'noopener,noreferrer')?.focus();
    }
  }
  initEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    nextButton?.addEventListener('click', this.incrementPage.bind(this));
    prevButton?.addEventListener('click', this.decrementPage.bind(this));
  }
}
class ZoomableImage {
  constructor() {
    this.scale = 1;
    this.startX = 0;
    this.startY = 0;
    this.originX = 0;
    this.originY = 0;
    this.isDragging = false;
    this.initEventListeners();
  }
  initEventListeners() {
    document.addEventListener('wheel', this.handleZoom.bind(this), {
      passive: false,
    });
    image.addEventListener('mousedown', this.startDragging.bind(this));
    document.addEventListener('mousemove', this.dragImage.bind(this));
    document.addEventListener('mouseup', this.stopDragging.bind(this));
    resetButton?.addEventListener('click', this.reset.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  handleZoom(e) {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = 0.1;
    if (e.deltaY < 0) {
      this.scale += zoomFactor;
    } else if (e.deltaY > 0 && this.scale > 0.2) {
      this.scale -= zoomFactor;
    }
    this.updateTransform();
  }
  startDragging(e) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.startX = e.clientX - this.originX;
    this.startY = e.clientY - this.originY;
    image.style.cursor = 'grabbing';
  }
  dragImage(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.isDragging) {
      return;
    }
    this.originX = e.clientX - this.startX;
    this.originY = e.clientY - this.startY;
    this.updateTransform();
  }
  stopDragging(e) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    image.style.cursor = 'grab';
  }
  reset() {
    this.scale = 1;
    this.originX = 0;
    this.originY = 0;
    this.updateTransform();
  }
  updateTransform() {
    image.style.transform = `scale(${this.scale.toString()}) translate(${this.originX.toString()}px, ${this.originY.toString()}px)`;
  }
  handleKeyDown(e) {
    if (e.code === 'KeyR') {
      this.reset();
    }
  }
}
function dawoudMain() {
  new Scroller();
  new ZoomableImage();
}
dawoudMain();
