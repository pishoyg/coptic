/** Package collapse defines logic to control collapsible elements. */
import * as log from './logger.js';
import * as browser from './browser.js';

const enum CLS {
  // COLLAPSE is the class of elements that, when clicked, trigger a collapse
  // effect in their next element sibling.
  COLLAPSE = 'collapse',
  // COLLAPSIBLE is the class of elements that collapse and expand.
  COLLAPSIBLE = 'collapsible',
  IS_OPEN = 'is-open',
}

type Param = 'true' | 'false';

/**
 * Collapsible represents an element that can collapse, becoming visible /
 * invisible as needed.
 */
export class Collapsible {
  /**
   *
   * @param collapse
   * @param collapsible
   * @param param - An optional name of a URL search parameter that controls
   * whether this collapsible should be visible or not upon page load.
   * NOTE: If no parameter is specified, then the collapsible state is entirely
   * determined by clicks on the `collapse` element.
   * If a parameter is specified, then the state is determined by the parameter,
   * defaulting to expansion if the parameter is absent.
   */
  public constructor(
    private readonly collapse: HTMLElement,
    private readonly collapsible: HTMLElement,
    private readonly param?: string
  ) {
    log.ensure(
      this.collapse.classList.contains(CLS.COLLAPSE),
      'A collapse element must have the',
      CLS.COLLAPSE,
      'class!'
    );
    log.ensure(
      this.collapsible.classList.contains(CLS.COLLAPSIBLE),
      'A collapsible element must have the',
      CLS.COLLAPSIBLE,
      'class!'
    );
    this.collapse.addEventListener('click', this.toggle.bind(this));
    // The constructor is called when the page is first loaded. The parameter,
    // if present, instructs us as to whether we should expand or collapse the
    // collapsible.
    if (!this.param) {
      // If this collapsible is not parameter-controlled, there is nothing to
      // do.
      return;
    }

    // This collapsible is controlled by a parameter.
    const val: Param | null = browser.getParam(this.param) as Param | null;
    if (val === null || val === 'true') {
      this.show();
    } else {
      // val === 'false'
      this.hide();
    }
  }

  /**
   * @returns
   */
  private visible(): boolean {
    return this.collapse.classList.contains(CLS.IS_OPEN);
  }

  /**
   *
   */
  private show(): void {
    if (!this.visible()) this.toggle();
  }

  /**
   *
   */
  private hide(): void {
    if (this.visible()) this.toggle();
  }

  /**
   *
   * @param overflow
   */
  private setOverflow(overflow: 'hidden' | 'visible'): void {
    // We must set the overflow property of the collapsible and all direct
    // children.
    // See the CSS for details.
    [
      this.collapsible,
      ...(Array.from(this.collapsible.children) as HTMLElement[]),
    ].forEach((element: HTMLElement): void => {
      element.style.overflow = overflow;
    });
  }

  /**
   *
   * @param val
   */
  private setParam(val: Param): void {
    if (!this.param) {
      // There is no param!
      return;
    }
    // The absence of the parameter is equivalent to the parameter being set to
    // 'true', so we just remove the parameter in this case.
    browser.setParam(this.param, val === 'true' ? undefined : val);
  }

  /**
   *
   */
  public toggle(): void {
    // Toggle classes. CSS takes care of resizing.
    this.collapse.classList.toggle(CLS.IS_OPEN);
    this.collapsible.classList.toggle(CLS.IS_OPEN);
    // We need to adjust overflow in TypeScript.
    // The reason we can't have hidden overflow is that they hide tooltips,
    // which normally render outside the collapsible.
    // During the transition, the overflow is always hidden.
    this.setOverflow('hidden');
    if (this.visible()) {
      this.setParam('true');
    } else {
      this.setParam('false');
      // The overflow property doesn't need to change.
      return;
    }

    // If we are opening the element, we make overflow visible, but we do this
    // when the transition completes. Otherwise, the overflow might show before
    // the element is fully visible.
    // Listen for the transition to finish.
    this.collapsible.addEventListener(
      'transitionend',
      (): void => {
        if (!this.visible()) {
          return;
        }
        this.setOverflow('visible');
      },
      { once: true }
    );
  }
}

/**
 *
 * @param collapseID
 * @param collapsibleID
 * @param param
 * @returns
 */
export function fromIDs(
  collapseID: string,
  collapsibleID: string,
  param?: string
): Collapsible {
  return new Collapsible(
    document.getElementById(collapseID)!,
    document.getElementById(collapsibleID)!,
    param
  );
}
