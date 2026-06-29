/* Main function for a Bible chapter. */

import * as high from './highlight.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as tool from '../tooltip.js';
import * as clip from '../clip.js';
import * as cls from './cls.js';
import * as dial from './dialect.js';
import type * as ddial from '../dialect.js';
import * as css from '../css.js';
import * as log from '../logger.js';

enum ID {
  TRAY = 'tray',
}

const DATA_SOURCES = 'sources';

enum CLS {
  VERSE_LINK = 'verse-link',
  LANGUAGE_COPY = 'language-copy',
  VERSES = 'verses',
  SOURCES = 'sources',
  CITATION = 'citation',
}

const BIBLIOGRAPHY = 'bibliography.json';
interface Resource {
  variants: string[];
  url?: string;
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
 */
function addCellCopies(): void {
  document
    .querySelectorAll<HTMLTableCellElement>(css.c(cls.LANGUAGE))
    .forEach((td: HTMLTableCellElement): void => {
      // Capture the cell text now: the row link is prepended afterwards, so a
      // lazy read at click time would leak the link emoji into the copy.
      const text: string = td.textContent.trim();
      if (!text) {
        return;
      }
      td.appendChild(clip.copyButton(() => text, [CLS.LANGUAGE_COPY]));
    });
}

/**
 * Prepend an anchor link to every cell of each verse row. Clicking it navigates
 * to the row (via the row's `id`) and copies the full URL with the fragment.
 *
 * The link lives in every cell, rather than just the first, so that it stays
 * reachable when a column is hidden. Deselecting a dialect hides an entire
 * column, which would otherwise take a link anchored to a single cell with it.
 * Each cell carries its own identical link, so at least one is always visible.
 */
function addRowLinks(): void {
  document
    .querySelectorAll<HTMLTableRowElement>(`.${cls.VERSE}[id]`)
    .forEach((tr: HTMLTableRowElement): void => {
      tr.querySelectorAll('td').forEach((td: HTMLTableCellElement): void => {
        td.prepend(clip.fragmentLink(`#${tr.id}`, [CLS.VERSE_LINK]));
      });
    });
}

/**
 *
 */
async function handleSources(): Promise<void> {
  const resources: Resource[] = (await fetch(BIBLIOGRAPHY).then(
    (raw: Response) => raw.json()
  )) as Resource[];

  const hyperlink = (source: string): (Node | string)[] => {
    for (const resource of resources) {
      for (const variant of resource.variants) {
        if (!source.startsWith(variant)) {
          continue;
        }

        // Found it!
        // TODO: (#730) Do your best to store URLs for all resources.
        const title: HTMLElement = resource.url
          ? html.anchor(resource.url, variant)
          : html.span(variant);
        title.classList.add(CLS.CITATION);
        const remainder: string = source.slice(variant.length);
        return [title, remainder];
      }
    }
    log.error('Unable to find a resource for', source);
    return [source];
  };

  document
    .querySelector(`.${CLS.VERSES}`)!
    .querySelector('thead')!
    .querySelectorAll('th')
    .forEach((th: HTMLTableCellElement): void => {
      const sources: string[] = JSON.parse(
        th.dataset[DATA_SOURCES]!
      ) as string[];
      if (!sources.length) {
        return;
      }
      const ul: HTMLUListElement = document.createElement('ul');
      ul.classList.add(CLS.SOURCES);
      for (const source of sources) {
        const li = document.createElement('li');
        li.append(...hyperlink(source));
        ul.append(li);
      }
      tool.addTooltip(th, [ul]);
    });
}

/**
 * @returns
 */
/**
 *
 */
async function main(): Promise<void> {
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
  if (manager.inactive()?.length) {
    holder.click();
  }

  await handleSources();
}

await main();
