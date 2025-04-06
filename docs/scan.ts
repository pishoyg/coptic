// NOTE: We assume the existence of the following elements:
const image = document.getElementById('scan') as HTMLImageElement;
const nextButton = document.getElementById('next');
const prevButton = document.getElementById('prev');
const resetButton = document.getElementById('reset');

export class Scroller {
  private readonly start: number;
  private readonly end: number;
  private readonly landingPage: number;
  // TODO: The parameters are unnecessarily complicated. Consider getting rid of
  // offsets and variable extensions altogether. They are complicating things.
  constructor(
    // Integer basename of the first image file.
    start: number,
    // Integer basename of the last image file.
    end: number,
    // The offset mainly concerns itself with the behavior of the page
    // parameter. It allows you to export a parameter value to your end users
    // that doesn't necessarily match the file names on the server.
    private readonly offset = 0,
    // File extensions. If it's page-dependent, pass a function that returns the
    // extension given the page number (the parameter passed being the basename,
    // rather than the page parameter (which accounts for the offset)).
    private readonly ext: string | ((page: number) => string),
    // Default value for the page parameter (with the offset accounted for).
    landingPage = 1
  ) {
    this.start = start - this.offset;
    this.end = end - this.offset;
    this.landingPage = landingPage;

    this.initEventListeners();
    this.update(this.getPageParam());
  }

  private getPageParam(): number {
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

  public update(page: number): void {
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

  private updatePageParam(newPage: number): void {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.replaceState({}, '', url.toString());
  }

  private updateDisplay(page: number): void {
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

  private incrementPage(): void {
    this.update(this.getPageParam() + 1);
  }

  private decrementPage(): void {
    this.update(this.getPageParam() - 1);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'KeyN') {
      this.incrementPage();
    } else if (event.code === 'KeyP') {
      this.decrementPage();
    }
  }
  private initEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    nextButton?.addEventListener('click', this.incrementPage.bind(this));
    prevButton?.addEventListener('click', this.decrementPage.bind(this));
  }
}

export class ZoomerDragger {
  private scale = 1;
  private startX = 0;
  private startY = 0;
  private originX = 0;
  private originY = 0;
  private isDragging = false;

  constructor() {
    this.initEventListeners();
  }

  private initEventListeners(): void {
    document.addEventListener('wheel', this.handleZoom.bind(this), {
      passive: false,
    });

    image.addEventListener('mousedown', this.startDragging.bind(this));
    document.addEventListener('mousemove', this.dragImage.bind(this));
    document.addEventListener('mouseup', this.stopDragging.bind(this));
    resetButton?.addEventListener('click', this.reset.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleZoom(e: WheelEvent): void {
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

  private startDragging(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.startX = e.clientX - this.originX;
    this.startY = e.clientY - this.originY;
    image.style.cursor = 'grabbing';
  }

  private dragImage(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (!this.isDragging) {
      return;
    }

    this.originX = e.clientX - this.startX;
    this.originY = e.clientY - this.startY;

    this.updateTransform();
  }

  private stopDragging(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    image.style.cursor = 'grab';
  }

  private reset(): void {
    this.scale = 1;
    this.originX = 0;
    this.originY = 0;
    this.updateTransform();
  }

  private updateTransform(): void {
    image.style.transform = `scale(${this.scale.toString()}) translate(${this.originX.toString()}px, ${this.originY.toString()}px)`;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyR') {
      this.reset();
    }
  }
}
