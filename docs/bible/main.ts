/* Main function for a Bible chapter. */

import * as high from './highlight.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as tool from '../tooltip.js';
import * as cls from './cls.js';
import * as dial from './dialect.js';
import type * as ddial from '../dialect.js';
import * as css from '../css.js';
import * as ccls from '../cls.js';

enum ID {
  TRAY = 'tray',
}

enum CLS {
  VERSE_LINK = 'verse-link',
  LANGUAGE_COPY = 'language-copy',
}

/**
 * Add Bible event listeners.
 * TODO: (#349) Use proper shortcuts with a help panel.
 * @param highlighter
 */
function addEventListeners(highlighter: high.Highlighter): void {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
      case 'n':
        browser.openNextLink();
        break;
      case 'p':
        browser.openPrevLink();
        break;
      case 'X':
        browser.openSearchLink();
        break;
      case 'r':
        highlighter.reset();
        browser.removeFragment();
        break;
      default:
      // For any other key, do nothing.
    }
  });
}

/**
 * Append a copy button to each language cell.
 * TODO: (#588) Share the copy-button pattern (icon + yank handler + tooltip)
 * with `addEntryCopyShortcuts` in `crum/wiki.ts`.
 */
function addCellCopies(): void {
  document
    .querySelectorAll<HTMLTableCellElement>(css.c(cls.LANGUAGE))
    .forEach((td: HTMLTableCellElement): void => {
      const text: string = td.textContent.trim();
      if (!text) {
        return;
      }
      const copy: HTMLSpanElement = document.createElement('span');
      copy.classList.add(CLS.LANGUAGE_COPY);
      copy.textContent = '📃';
      copy.addEventListener('click', (): void => {
        browser.yank(text);
      });
      tool.addTooltip(copy, ['copy'], [ccls.SMALL_TEXT]);
      td.appendChild(copy);
    });
}

/**
 * Prepend an anchor link to each verse row. Clicking it navigates to the row
 * (via the row's `id`) and copies the full URL with the fragment.
 * TODO: (#588) Share the row-anchor pattern (🔗 fragment anchor + click-to-yank
 * URL) with the equivalent block in `handleDrvKey` in `crum/crum.ts`.
 */
function addRowLinks(): void {
  document
    .querySelectorAll<HTMLTableRowElement>(`.${cls.VERSE}[id]`)
    .forEach((tr: HTMLTableRowElement): void => {
      const frag = `#${tr.id}`;
      const a: HTMLAnchorElement = document.createElement('a');
      a.classList.add(CLS.VERSE_LINK);
      a.href = frag;
      a.textContent = '🔗';
      a.addEventListener('click', (): void => {
        const url: URL = new URL(window.location.href);
        url.hash = frag;
        browser.yank(url.toString());
      });
      tool.addTooltip(a, ['copy link'], ['small-text']);
      tr.querySelector('td')?.prepend(a);
    });
}

/**
 * @returns
 */
/**
 *
 */
function main(): void {
  // Normalizing the tree is necessary for some of our text search logic to work
  // correctly.
  html.normalize();

  const controls: ddial.Control[] = dial.DIALECTS.map(
    (d: dial.Dialect): ddial.Control => d.control()
  );

  const tray: HTMLDivElement = document.createElement('div');
  tray.append(...controls.map((d: ddial.Control): HTMLLabelElement => d.label));
  const holder: HTMLSpanElement = document.createElement('span');
  holder.textContent = 'Languages ▾';
  holder.id = ID.TRAY;
  holder.classList.add(cls.TRAY);
  tool.addTooltip(holder, [tray], [cls.TRAY], 'click');

  const manager: dial.Manager = new dial.Manager();
  const highlighter: high.Highlighter = new high.Highlighter(
    manager,
    controls.map((d: ddial.Control): HTMLInputElement => d.checkbox)
  );

  addEventListeners(highlighter);

  const title: HTMLElement = document.querySelector(`.${cls.TITLE}`)!;
  title.insertAdjacentElement('afterend', holder);

  // Capture cell text before prepending the row link, so the link emoji
  // does not leak into the copied content.
  addCellCopies();
  addRowLinks();

  // Open the tray on first load only when some dialects on this page are
  // currently hidden — otherwise the toggles have nothing to reveal.
  // Mirrors the "nothing to do" check in `highlight.ts`: if every dialect is
  // selected or none is, no `display: none` rule is emitted, so the page
  // already shows every dialect.
  if (manager.partial()) {
    holder.click();
  }
}

main();
