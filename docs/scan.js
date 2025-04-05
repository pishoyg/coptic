// NOTE: We assume the existence of the following elements:
const image = document.getElementById('scan');
const nextButton = document.getElementById('next');
const prevButton = document.getElementById('prev');
const resetButton = document.getElementById('reset');
export class Scroller {
  offset;
  ext;
  start;
  end;
  constructor(
    start,
    end,
    offset = 0,
    // TODO: Clean this mess. There is point of making the extension a function
    // of the page number!
    ext
  ) {
    this.offset = offset;
    this.ext = ext;
    this.start = start - this.offset;
    this.end = end - this.offset;
    this.initEventListeners();
    this.update(this.getPageParam());
  }
  getPageParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    return page ? parseInt(page) : 1;
  }
  update(page) {
    if (page < this.start) {
      page = this.start;
    }
    if (page > this.end) {
      page = this.end;
    }
    this.updatePageParam(page);
    this.updateDisplay(page);
    resetButton?.click();
  }
  updatePageParam(newPage) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.replaceState({}, '', url.toString());
  }
  updateDisplay(page) {
    const stem = page + this.offset;
    image.src = `${stem.toString()}.${typeof this.ext === 'function' ? this.ext(stem) : this.ext}`;
    image.alt = page.toString();
    if (page === this.start) {
      prevButton?.classList.add('disabled');
    } else {
      prevButton?.classList.remove('disabled');
    }
    if (page === this.end) {
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
    }
  }
  initEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    nextButton?.addEventListener('click', this.incrementPage.bind(this));
    prevButton?.addEventListener('click', this.decrementPage.bind(this));
  }
}
export class ZoomerDragger {
  scale = 1;
  startX = 0;
  startY = 0;
  originX = 0;
  originY = 0;
  isDragging = false;
  constructor() {
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
