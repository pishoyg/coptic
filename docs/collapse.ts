/** Package collapse defines logic to control collapsible elements. */
import * as log from './logger.js';

enum CLS {
  // COLLAPSE is the class of elements that, when clicked, trigger a collapse
  // effect in their next element sibling.
  COLLAPSE = 'collapse',
  // COLLAPSIBLE is the class of elements that collapse and expand.
  COLLAPSIBLE = 'collapsible',
  // COLLAPSE_ARROW is the class of the optional arrow in the collapse element.
  COLLAPSE_ARROW = 'collapse-arrow',
}

/** COLLAPSISBLE_TRANSITION_MS is the transition time of a collapsible's
 * max-height property. It is defined in CSS. */
const COLLAPSISBLE_TRANSITION_MS = 500;

/** COLLAPSISBLE_TRANSITION_WAIT is the percentage of transition time that we
 * wait before updating certain display elements. See usage below.
 */
const COLLAPSISBLE_TRANSITION_WAIT = 0.65;

/**
 * Collapsible represents an element that can collapse, becoming visible /
 * invisible as needed.
 * NOTE: This must be used with corresponding classes defined in the CSS. See
 * below and see the CSS for more details.
 */
class Collapsible {
  private arrow?: HTMLSpanElement | undefined;

  private observer: ResizeObserver;

  /**
   *
   * @param collapsible
   * @param collapse
   */
  public constructor(
    private readonly collapsible: HTMLElement,
    collapse: HTMLElement
  ) {
    // A click on the collapse element toggles the collapsible.
    collapse.addEventListener('click', this.toggle.bind(this));

    this.arrow =
      collapse.querySelector<HTMLSpanElement>(`.${CLS.COLLAPSE_ARROW}`) ??
      undefined;

    // Create an observer to adjust the height whenever the element gains or
    // loses children.
    this.observer = new ResizeObserver(() => {
      this.set();
    });

    this.observer.observe(this.collapsible);
  }

  /**
   * Disconnects the observer to prevent memory leaks when the element is
   * removed from the DOM.
   * As of now, we don't add or remove any collapsible elements from the DOM, so
   * this method doesn't need to be called anywhere.
   */
  public disconnectObserver(): void {
    this.observer.disconnect();
  }

  /**
   * @returns The current visible height. This should return the empty string if
   * the element is currently hidden, thus you can use `!!this.get()` to test
   * whether the element is visible.
   */
  private get(): string {
    return this.collapsible.style.maxHeight;
  }

  /**
   * @returns
   */
  private visible(): boolean {
    return !!this.get();
  }

  /**
   * @param maxHeight
   */
  private set(maxHeight?: string): void {
    maxHeight ??= this.visible() ? this.scrollHeight() : '';
    if (this.collapsible.style.maxHeight === maxHeight) {
      return;
    }
    // Adjusting the height happens in two occasions:
    // - When the element visibility is toggled.
    // - When the element size changes (this is invoked by the observer).
    // If the element is being made invisible, its overflow should be hidden.
    // However, for visible elements, overflow should be visible. A collapsible
    // could have, for example, tooltip children, which render outside of its
    // borders. So it's important for overflow to be normally visible, in order
    // for such tooltips to render properly.
    // However, when the element gains new content, we want the overflow to
    // continue to be hidden until the height transition completes, otherwise
    // the overflow will show while the height is still adjusting.
    // We always hide overflow, adjust the height, then show overflow.
    this.collapsible.style.overflow = 'hidden';

    // Adjust the maximum height:
    this.collapsible.style.maxHeight = maxHeight;
    if (!this.visible()) {
      // The overflow property doesn't need to change.
      return;
    }

    setTimeout(() => {
      this.collapsible.style.overflow = 'visible';
    }, COLLAPSISBLE_TRANSITION_MS);
  }

  /**
   * @returns
   */
  private scrollHeight(): string {
    return `${this.collapsible.scrollHeight.toString()}px`;
  }

  /**
   * Toggle the display of the collapsible.
   */
  public toggle(): void {
    if (!this.visible()) {
      // The element is hidden and about to become visible.
      this.set(this.scrollHeight());
      // Update the arrow immediately.
      this.updateArrow();
      return;
    }

    // The element is visible and about to get hidden.
    this.set('');
    // Update the arrow during the transition.
    setTimeout(
      this.updateArrow.bind(this),
      COLLAPSISBLE_TRANSITION_MS * COLLAPSISBLE_TRANSITION_WAIT
    );
  }

  /**
   * Updates the arrow indicator element if available.
   */
  private updateArrow(): void {
    if (!this.arrow) {
      return;
    }
    this.arrow.textContent = `${this.get() ? '▾' : '▸'} `;
  }
}

/**
 * addListenersForSiblings initializes pairs of `collapse` and `collapsible`
 * elements in the page, such that clicking a `collapse` element collapses the
 * `collapsible`.
 * NOTE:
 * - Collapse (clickable) elements have the class `collapse`.
 * - Collapsible elements have the class `collapsible`.
 * - The `collapsible` elements are the siblings immediately following
 *   collapse` elements.
 * See the related CSS.
 *
 * @param toggleUponLoad - If true, toggle once after loading.
 */
export function addEventListenersForSiblings(toggleUponLoad = false): void {
  document
    .querySelectorAll<HTMLElement>(`.${CLS.COLLAPSE}`)
    .forEach((collapse: HTMLElement): void => {
      const collapsible: HTMLElement =
        collapse.nextElementSibling as HTMLElement;
      log.ensure(
        collapsible.classList.contains(CLS.COLLAPSIBLE),
        'A .collapse must be followed by a .collapsible!'
      );
      const col = new Collapsible(collapsible, collapse);
      if (toggleUponLoad) {
        col.toggle();
      }
    });
}
