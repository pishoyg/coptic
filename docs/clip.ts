/**
 * Package clip defines small clickable affordances that copy something to the
 * clipboard.
 */

import * as browser from './browser.js';
import * as tool from './tooltip.js';
import * as iam from './iam.js';
import * as cls from './cls.js';

const COPY_GLYPH = '📃';
const LINK_GLYPH = '🔗';

// Both affordances render as small text.
const SMALL: string[] = [cls.SMALL_TEXT];

/**
 * Build a 📃 button that copies text to the clipboard when clicked.
 *
 * @param text - Produces the text to yank. Evaluated lazily on each click, so
 *   callers that mutate the source element afterwards (e.g. by prepending a
 *   link) must capture the text in the closure instead.
 * @param classes - Classes to add to the button, driving its positioning and
 *   hover visibility.
 * @returns
 */
export function copyButton(
  text: () => string,
  classes: string[]
): HTMLSpanElement {
  const copy: HTMLSpanElement = document.createElement('span');
  copy.classList.add(...classes);
  copy.textContent = COPY_GLYPH;
  copy.addEventListener('click', (): void => {
    browser.yank(text());
  });
  tool.addTooltip(copy, ['copy'], SMALL);
  return copy;
}

/**
 * Build a 🔗 anchor pointing at a page fragment. Clicking it navigates to the
 * fragment (via the `href`) and, unless we're on Anki, copies the absolute URL
 * bearing that fragment to the clipboard — handy for sharing a link to a
 * specific row.
 *
 * @param frag - The fragment, including the leading '#'.
 * @param classes - Classes to add to the anchor, driving its positioning and
 *   hover visibility.
 * @returns
 */
export function fragmentLink(
  frag: string,
  classes: string[] = []
): HTMLAnchorElement {
  const a: HTMLAnchorElement = document.createElement('a');
  a.href = frag;
  a.textContent = LINK_GLYPH;
  a.classList.add(...classes);
  if (iam.amI('card')) {
    // `window.location.href` is meaningless on Anki.
    // A previous comment mentioned that yanking is problematic, though this may
    // not be true.
    return a;
  }
  tool.addTooltip(a, ['copy link'], SMALL);
  a.addEventListener('click', (): void => {
    const url: URL = new URL(window.location.href);
    url.hash = frag;
    browser.yank(url.toString());
  });
  return a;
}
