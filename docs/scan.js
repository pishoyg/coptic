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
  landingPage;
  // TODO: The parameters are unnecessarily complicated. Consider getting rid of
  // offsets and variable extensions altogether. They are complicating things.
  constructor(
    // Integer basename of the first image file.
    start,
    // Integer basename of the last image file.
    end,
    // The offset mainly concerns itself with the behavior of the page
    // parameter. It allows you to export a parameter value to your end users
    // that doesn't necessarily match the file names on the server.
    offset = 0,
    // File extensions. If it's page-dependent, pass a function that returns the
    // extension given the page number (the parameter passed being the basename,
    // rather than the page parameter (which accounts for the offset)).
    ext,
    // Default value for the page parameter (with the offset accounted for).
    landingPage = 1
  ) {
    this.offset = offset;
    this.ext = ext;
    this.start = start - this.offset;
    this.end = end - this.offset;
    this.landingPage = landingPage;
    this.initEventListeners();
    this.update(this.getPageParam());
  }
  getPageParam() {
    const urlParams = new URLSearchParams(window.location.search);
    let page = urlParams.get('page');
    if (!page) {
      return this.landingPage;
    }
    if (['a', 'b'].some((c) => page?.endsWith(c))) {
      page = page.slice(0, page.length - 1);
    }
    try {
      return parseInt(page);
    } catch {
      return this.landingPage;
    }
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
