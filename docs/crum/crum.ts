/**
 * Package crum defines Crum note handlers.
 *
 * TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
 * possible. NOTE: The associated issue is closed. Judge whether it should be
 * reopened, or if we should create a new issue, or just delete this TODO.
 */

import * as iam from '../iam.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as highlight from './highlight.js';
import * as d from './dialect.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
import * as header from '../header.js';
import * as logger from '../logger.js';

const COPTIC_RE = /[Ⲁ-ⲱϢ-ϯⳈⳉ]+/giu;
const GREEK_RE = /[Α-Ωα-ω]+/giu;
const ENGLISH_RE = /[A-Za-z]+/giu;

/**
 *
 * @param elem
 * @param highlighter
 */
export function handleAll(
  elem: HTMLElement,
  highlighter: highlight.Highlighter
): void {
  handleCategories(elem);
  handleRootType(elem);
  handleCrumPage(elem);
  handleCrumPageExternal(elem);
  handleDawoudPageExternal(elem);
  handleDawoudPageImg(elem);
  handleCrumPageImg(elem);
  handleExplanatory(elem);
  handleDawoudPage(elem);
  handleDrvKey(elem);
  handleExplanatoryKey(elem);
  handleSisterKey(elem);
  handleSisterView(elem);
  handleDialect(elem, highlighter);
  handleDeveloper(elem, highlighter);
  insertCrumAbbreviationsLink();
  handleAnkiNavigation(elem);
  addCopticLookups(elem);
  addGreekLookups(elem);
  addEnglishLookups(elem);
}

/**
 *
 * @param elem
 */
export function handleCategories(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.CATEGORIES}`).forEach((el) => {
    el.innerHTML = el.innerHTML
      .trim()
      .split(',')
      .map((s) => s.trim())
      .map(
        (s) =>
          `<a class="${ccls.HOVER_LINK}" href="${paths.LEXICON}/${s}.html" target="_blank">${s}</a>`
      )
      .join(', ');
  });
}

/**
 *
 * @param elem
 */
export function handleRootType(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.ROOT_TYPE}`).forEach((el) => {
    const type: string | undefined = el.querySelector('b')?.innerHTML;
    if (!type) {
      logger.error('Unable to infer the root type for element!', el);
      return;
    }
    el.innerHTML = `(<a class="${ccls.HOVER_LINK}" href="${paths.LEXICON}/${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
  });
}

/**
 *
 * @param elem
 */
export function handleCrumPage(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerHTML)}`);
  });
}

/**
 *
 * @param elem
 */
export function handleCrumPageExternal(elem: HTMLElement): void {
  elem
    .querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE_EXTERNAL}`)
    .forEach((el) => {
      el.classList.add(ccls.LINK);
      el.addEventListener('click', () => {
        browser.open(`${paths.CRUM_SCAN_PREFIX}${el.innerHTML}`);
      });
    });
}

/**
 *
 * @param elem
 */
export function handleDawoudPageExternal(elem: HTMLElement): void {
  elem
    .querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE_EXTERNAL}`)
    .forEach((el) => {
      el.classList.add(ccls.LINK);
      el.addEventListener('click', () => {
        browser.open(`${paths.DAWOUD}?page=${el.innerHTML}`);
      });
    });
}

/**
 *
 * @param elem
 */
export function handleDawoudPageImg(elem: HTMLElement): void {
  elem
    .querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE_IMG}`)
    .forEach((el) => {
      const img = el.children[0] as HTMLElement;
      img.classList.add(ccls.LINK);
      img.addEventListener('click', () => {
        browser.open(`${paths.DAWOUD}?page=${img.getAttribute('alt')!}`);
      });
    });
}

/**
 *
 * @param elem
 */
export function handleCrumPageImg(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.CRUM_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0] as HTMLElement;
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.CRUM_SCAN_PREFIX}${img.getAttribute('alt')!}`);
    });
  });
}

/**
 *
 * @param elem
 */
export function handleExplanatory(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY}`).forEach((el) => {
    const img = el.children[0] as HTMLElement;
    const alt = img.getAttribute('alt')!;
    if (!alt.startsWith('http')) return;
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(alt);
    });
  });
}

/**
 *
 * @param elem
 */
export function handleDawoudPage(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.DAWOUD_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerHTML)}`);
  });
}

/**
 *
 * @param elem
 */
export function handleDrvKey(elem: HTMLElement): void {
  elem
    .querySelectorAll<HTMLElement>(`.${cls.DRV_KEY}`)
    .forEach((key: HTMLElement) => {
      const frag = `#drv${key.innerHTML}`;

      const a: HTMLAnchorElement = document.createElement('a');
      a.href = frag;
      a.classList.add(cls.DRV_LINK, ccls.HOVER_LINK);
      a.appendChild(document.createTextNode('🔗'));

      key.parentNode!.insertBefore(a, key);
      a.appendChild(key);

      if (iam.amI('anki')) {
        // Yanking is not straightforward on Anki, for what it seems!
        return;
      }
      a.addEventListener('click', () => {
        const url: URL = new URL(window.location.href);
        url.hash = frag;
        browser.yank(url.toString());
      });
    });
}

/**
 *
 * @param elem
 */
export function handleExplanatoryKey(elem: HTMLElement): void {
  elem
    .querySelectorAll<HTMLElement>(`.${cls.EXPLANATORY_KEY}`)
    .forEach((el) => {
      el.classList.add(ccls.HOVER_LINK);
      html.makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
    });
}

/**
 *
 * @param elem
 */
export function handleSisterKey(elem: HTMLElement): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.SISTER_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
  });
}

/**
 *
 * @param elem
 */
export function handleSisterView(elem: HTMLElement): void {
  elem
    .querySelectorAll(css.classQuery(cls.SISTERS_TABLE, cls.INDEX_TABLE))
    .forEach((table: Element) => {
      let counter = 1;
      table.querySelectorAll('tr').forEach((el: HTMLTableRowElement) => {
        const td: Element | null = el.querySelector(`.${cls.SISTER_VIEW}`);
        if (!td) {
          logger.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        td.innerHTML = `<span class="${cls.SISTER_INDEX}">${counter.toString()}. </span>${
          td.innerHTML
        }`;
        counter++;
      });
    });
}

/**
 *
 * @param elem
 * @param highlighter
 */
export function handleDialect(
  elem: HTMLElement,
  highlighter: highlight.Highlighter
): void {
  elem.querySelectorAll<HTMLElement>(`.${cls.DIALECT}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    el.addEventListener(
      'click',
      highlighter.toggleDialect.bind(highlighter, el.innerHTML as d.DIALECT)
    );
  });
}

/**
 *
 * @param elem
 * @param highlighter
 */
export function handleDeveloper(
  elem: HTMLElement,
  highlighter: highlight.Highlighter
): void {
  elem
    .querySelectorAll<HTMLElement>(`.${header.CLS.DEVELOPER}`)
    .forEach((el) => {
      el.classList.add(ccls.LINK);
      el.addEventListener('click', highlighter.toggleDev.bind(highlighter));
    });
}

/**
 *
 */
export function insertCrumAbbreviationsLink(): void {
  const crumElement = document.getElementById('crum');
  const anchor = document.createElement('a');
  anchor.textContent = 'Abbreviations';
  anchor.href = paths.CRUM_ABBREVIATIONS;
  anchor.classList.add(cls.ABBREVIATIONS);
  anchor.target = '_blank';
  crumElement?.insertBefore(anchor, crumElement.firstChild);
}

/**
 *
 * @param elem
 */
export function handleAnkiNavigation(elem: HTMLElement): void {
  if (!iam.amI('anki')) return;
  elem.querySelectorAll<HTMLElement>(`.${cls.NAVIGATE}`).forEach((e) => {
    if (e.tagName !== 'A' || !e.hasAttribute('href')) {
      logger.error(
        'This "navigate" element is not an <a> tag with an "href" property!',
        e
      );
      return;
    }
    e.setAttribute('href', `${paths.LEXICON}/${e.getAttribute('href')!}`);
  });
}

/**
 *
 * @param elem
 */
export function addCopticLookups(elem: HTMLElement): void {
  html.linkifyText(
    elem,
    COPTIC_RE,
    paths.LOOKUP_URL_PREFIX,
    [ccls.HOVER_LINK],
    [cls.TYPE]
  );
}

/**
 *
 * @param elem
 */
export function addGreekLookups(elem: HTMLElement): void {
  html.linkifyText(elem, GREEK_RE, paths.GREEK_DICT_PREFIX, [
    ccls.LINK,
    cls.LIGHT,
  ]);
}

/**
 *
 * @param elem
 */
export function addEnglishLookups(elem: HTMLElement): void {
  elem.querySelectorAll(`.${cls.MEANING}`).forEach((el) => {
    html.linkifyText(el, ENGLISH_RE, paths.LOOKUP_URL_PREFIX, [
      ccls.HOVER_LINK,
    ]);
  });
}
