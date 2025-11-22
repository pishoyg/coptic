/** Package collapse defines logic to control collapsible elements. */
import * as log from './logger.js';
import * as browser from './browser.js';
var CLS;
(function (CLS) {
  // COLLAPSE is the class of elements that, when clicked, trigger a collapse
  // effect in their next element sibling.
  CLS['COLLAPSE'] = 'collapse';
  // COLLAPSIBLE is the class of elements that collapse and expand.
  CLS['COLLAPSIBLE'] = 'collapsible';
  CLS['IS_OPEN'] = 'is-open';
})(CLS || (CLS = {}));
/**
 * Collapsible represents an element that can collapse, becoming visible /
 * invisible as needed.
 */
export class Collapsible {
  collapse;
  collapsible;
  param;
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
  constructor(collapse, collapsible, param) {
    this.collapse = collapse;
    this.collapsible = collapsible;
    this.param = param;
    log.ensure(
      this.collapse.classList.contains('collapse' /* CLS.COLLAPSE */),
      'A collapse element must have the',
      'collapse' /* CLS.COLLAPSE */,
      'class!'
    );
    log.ensure(
      this.collapsible.classList.contains('collapsible' /* CLS.COLLAPSIBLE */),
      'A collapsible element must have the',
      'collapsible' /* CLS.COLLAPSIBLE */,
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
    const val = new URL(window.location.href).searchParams.get(this.param);
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
  visible() {
    return this.collapse.classList.contains('is-open' /* CLS.IS_OPEN */);
  }
  /**
   *
   */
  show() {
    if (!this.visible()) this.toggle();
  }
  /**
   *
   */
  hide() {
    if (this.visible()) this.toggle();
  }
  /**
   *
   * @param overflow
   */
  setOverflow(overflow) {
    // We must set the overflow property of the collapsible and all direct
    // children.
    // See the CSS for details.
    [this.collapsible, ...Array.from(this.collapsible.children)].forEach(
      (element) => {
        element.style.overflow = overflow;
      }
    );
  }
  /**
   *
   * @param val
   */
  setParam(val) {
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
  toggle() {
    // Toggle classes. CSS takes care of resizing.
    this.collapse.classList.toggle('is-open' /* CLS.IS_OPEN */);
    this.collapsible.classList.toggle('is-open' /* CLS.IS_OPEN */);
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
      () => {
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
export function fromIDs(collapseID, collapsibleID, param) {
  return new Collapsible(
    document.getElementById(collapseID),
    document.getElementById(collapsibleID),
    param
  );
}
