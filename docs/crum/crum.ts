// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.

import * as iam from '../iam.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as highlight from './highlight.js';
import * as d from './dialect.js';

const COPTIC_RE = /[Ⲁ-ⲱϢ-ϯⳈⳉ]+/giu;
const GREEK_RE = /[Α-Ωα-ω]+/giu;
const ENGLISH_RE = /[A-Za-z]+/giu;

const GREEK_LOOKUP_URL_PREFIX = 'https://logeion.uchicago.edu/';

const ABBREVIATIONS_PAGE =
  'https://coptic.wiki/crum/?section=list_of_abbreviations';

enum CLS {
  ABBREVIATIONS = 'abbreviations',
  CATEGORIES = 'categories',
  CRUM_PAGE = 'crum-page',
  CRUM_PAGE_EXTERNAL = 'crum-page-external',
  CRUM_PAGE_IMG = 'crum-page-img',
  DAWOUD_PAGE = 'dawoud-page',
  DAWOUD_PAGE_EXTERNAL = 'dawoud-page-external',
  DAWOUD_PAGE_IMG = 'dawoud-page-img',
  DEVELOPER = 'developer',
  DIALECT = 'dialect',
  DRV_KEY = 'drv-key',
  EXPLANATORY = 'explanatory',
  EXPLANATORY_KEY = 'explanatory-key',
  HOVER_LINK = 'hover-link',
  INDEX_TABLE = 'index-table',
  ITALIC = 'italic',
  LIGHT = 'light',
  LINK = 'link',
  MEANING = 'meaning',
  NAVIGATE = 'navigate',
  ROOT_TYPE = 'root-type',
  SISTERS_TABLE = 'sisters-table',
  SISTER_INDEX = 'sister-index',
  SISTER_KEY = 'sister-key',
  SISTER_VIEW = 'sister-view',
  SMALL = 'small',
  TITLE = 'title',
  TYPE = 'type',
}

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
export function handleCategories(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.CATEGORIES}`).forEach((el) => {
    el.innerHTML = el.innerHTML
      .trim()
      .split(',')
      .map((s) => s.trim())
      .map(
        (s) =>
          `<a class="${CLS.HOVER_LINK}" href="${paths.LEXICON}/${s}.html" target="_blank">${s}</a>`
      )
      .join(', ');
  });
}

/**
 *
 * @param elem
 */
export function handleRootType(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.ROOT_TYPE}`).forEach((el) => {
    const type: string | undefined = el.querySelector('b')?.innerHTML;
    if (!type) {
      console.error('Unable to infer the root type for element!', el);
      return;
    }
    el.innerHTML = `(<a class="${CLS.HOVER_LINK}" href="${paths.LEXICON}/${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
  });
}

/**
 *
 * @param elem
 */
export function handleCrumPage(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.CRUM_PAGE}`).forEach((el) => {
    el.classList.add(CLS.LINK);
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerHTML)}`);
  });
}

/**
 *
 * @param elem
 */
export function handleCrumPageExternal(elem: HTMLElement) {
  elem
    .querySelectorAll<HTMLElement>(`.${CLS.CRUM_PAGE_EXTERNAL}`)
    .forEach((el) => {
      el.classList.add(CLS.LINK);
      el.addEventListener('click', () => {
        browser.open(
          `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`
        );
      });
    });
}

/**
 *
 * @param elem
 */
export function handleDawoudPageExternal(elem: HTMLElement) {
  elem
    .querySelectorAll<HTMLElement>(`.${CLS.DAWOUD_PAGE_EXTERNAL}`)
    .forEach((el) => {
      el.classList.add(CLS.LINK);
      el.addEventListener('click', () => {
        browser.open(`${paths.DAWOUD}?page=${el.innerHTML}`);
      });
    });
}

/**
 *
 * @param elem
 */
export function handleDawoudPageImg(elem: HTMLElement) {
  elem
    .querySelectorAll<HTMLElement>(`.${CLS.DAWOUD_PAGE_IMG}`)
    .forEach((el) => {
      const img = el.children[0] as HTMLElement;
      img.classList.add(CLS.LINK);
      img.addEventListener('click', () => {
        browser.open(`${paths.DAWOUD}?page=${img.getAttribute('alt')!}`);
      });
    });
}

/**
 *
 * @param elem
 */
export function handleCrumPageImg(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.CRUM_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0] as HTMLElement;
    img.classList.add(CLS.LINK);
    img.addEventListener('click', () => {
      browser.open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${img.getAttribute('alt')!}`
      );
    });
  });
}

/**
 *
 * @param elem
 */
export function handleExplanatory(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.EXPLANATORY}`).forEach((el) => {
    const img = el.children[0] as HTMLElement;
    const alt = img.getAttribute('alt')!;
    if (!alt.startsWith('http')) return;
    img.classList.add(CLS.LINK);
    img.addEventListener('click', () => {
      browser.open(alt);
    });
  });
}

/**
 *
 * @param elem
 */
export function handleDawoudPage(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.DAWOUD_PAGE}`).forEach((el) => {
    el.classList.add(CLS.LINK);
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerHTML)}`);
  });
}

/**
 *
 * @param elem
 */
export function handleDrvKey(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.DRV_KEY}`).forEach((el) => {
    el.classList.add(CLS.SMALL, CLS.LIGHT, CLS.ITALIC, CLS.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#drv${el.innerHTML}`);
  });
}

/**
 *
 * @param elem
 */
export function handleExplanatoryKey(elem: HTMLElement) {
  elem
    .querySelectorAll<HTMLElement>(`.${CLS.EXPLANATORY_KEY}`)
    .forEach((el) => {
      el.classList.add(CLS.HOVER_LINK);
      html.makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
    });
}

/**
 *
 * @param elem
 */
export function handleSisterKey(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.SISTER_KEY}`).forEach((el) => {
    el.classList.add(CLS.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
  });
}

/**
 *
 * @param elem
 */
export function handleSisterView(elem: HTMLElement) {
  elem
    .querySelectorAll(css.classQuery(CLS.SISTERS_TABLE, CLS.INDEX_TABLE))
    .forEach((table: Element) => {
      let counter = 1;
      table.querySelectorAll('tr').forEach((el: HTMLTableRowElement) => {
        const td: Element | null = el.querySelector(`.${CLS.SISTER_VIEW}`);
        if (!td) {
          console.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        td.innerHTML =
          `<span class="${CLS.SISTER_INDEX}">${counter.toString()}. </span>` +
          td.innerHTML;
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
) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.DIALECT}`).forEach((el) => {
    el.classList.add(CLS.HOVER_LINK);
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
) {
  elem.querySelectorAll<HTMLElement>(`.${CLS.DEVELOPER}`).forEach((el) => {
    el.classList.add(CLS.LINK);
    el.addEventListener('click', highlighter.toggleDev.bind(highlighter));
  });
}

/**
 *
 */
export function insertCrumAbbreviationsLink() {
  const crumElement = document.getElementById('crum');
  const anchor = document.createElement('a');
  anchor.textContent = 'Abbreviations';
  anchor.href = ABBREVIATIONS_PAGE;
  anchor.classList.add(CLS.ABBREVIATIONS);
  anchor.target = '_blank';
  crumElement?.insertBefore(anchor, crumElement.firstChild);
}

/**
 *
 * @param elem
 */
export function handleAnkiNavigation(elem: HTMLElement) {
  if (!iam.amI('anki')) return;
  elem.querySelectorAll<HTMLElement>(`.${CLS.NAVIGATE}`).forEach((e) => {
    if (e.tagName !== 'A' || !e.hasAttribute('href')) {
      console.error(
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
export function addCopticLookups(elem: HTMLElement) {
  html.linkifyText(
    elem,
    COPTIC_RE,
    paths.LOOKUP_URL_PREFIX,
    [CLS.HOVER_LINK],
    [CLS.TYPE, CLS.TYPE]
  );
}

/**
 *
 * @param elem
 */
export function addGreekLookups(elem: HTMLElement) {
  html.linkifyText(elem, GREEK_RE, GREEK_LOOKUP_URL_PREFIX, [
    CLS.LINK,
    CLS.LIGHT,
  ]);
}

/**
 *
 * @param elem
 */
export function addEnglishLookups(elem: HTMLElement) {
  elem.querySelectorAll(`.${CLS.MEANING}`).forEach((el) => {
    html.linkifyText(el, ENGLISH_RE, paths.LOOKUP_URL_PREFIX, [CLS.HOVER_LINK]);
  });
}
