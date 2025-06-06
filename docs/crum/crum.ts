// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.

import * as iam from '../iam.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
import * as highlight from './highlight.js';
import * as d from './dialect.js';

const COPTIC_RE = /[Ⲁ-ⲱϢ-ϯⳈⳉ]+/giu;
const GREEK_RE = /[Α-Ωα-ω]+/giu;
const ENGLISH_RE = /[A-Za-z]+/giu;

const GREEK_LOOKUP_URL_PREFIX = 'https://logeion.uchicago.edu/';

const ABBREVIATIONS_PAGE =
  'https://coptic.wiki/crum/?section=list_of_abbreviations';

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
  elem.querySelectorAll<HTMLElement>('.categories').forEach((el) => {
    el.innerHTML = el.innerHTML
      .trim()
      .split(',')
      .map((s) => s.trim())
      .map(
        (s) =>
          `<a class="hover-link" href="${paths.LEXICON}/${s}.html" target="_blank">${s}</a>`
      )
      .join(', ');
  });
}

/**
 *
 * @param elem
 */
export function handleRootType(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>('.root-type').forEach((el) => {
    const type = el.getElementsByTagName('b')[0]?.innerHTML;
    if (!type) {
      console.error('Unable to infer the root type for element!', el);
      return;
    }
    el.innerHTML = `(<a class="hover-link" href="${paths.LEXICON}/${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
  });
}

/**
 *
 * @param elem
 */
export function handleCrumPage(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>('.crum-page').forEach((el) => {
    el.classList.add('link');
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerHTML)}`);
  });
}

/**
 *
 * @param elem
 */
export function handleCrumPageExternal(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>('.crum-page-external').forEach((el) => {
    el.classList.add('link');
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
  elem.querySelectorAll<HTMLElement>('.dawoud-page-external').forEach((el) => {
    el.classList.add('link');
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
  elem.querySelectorAll<HTMLElement>('.dawoud-page-img').forEach((el) => {
    const img = el.children[0] as HTMLElement;
    img.classList.add('link');
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
  elem.querySelectorAll<HTMLElement>('.crum-page-img').forEach((el) => {
    const img = el.children[0] as HTMLElement;
    img.classList.add('link');
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
  elem.querySelectorAll<HTMLElement>('.explanatory').forEach((el) => {
    const img = el.children[0] as HTMLElement;
    const alt = img.getAttribute('alt')!;
    if (!alt.startsWith('http')) return;
    img.classList.add('link');
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
  elem.querySelectorAll<HTMLElement>('.dawoud-page').forEach((el) => {
    el.classList.add('link');
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerHTML)}`);
  });
}

/**
 *
 * @param elem
 */
export function handleDrvKey(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>('.drv-key').forEach((el) => {
    el.classList.add('small', 'light', 'italic', 'hover-link');
    html.makeSpanLinkToAnchor(el, `#drv${el.innerHTML}`);
  });
}

/**
 *
 * @param elem
 */
export function handleExplanatoryKey(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>('.explanatory-key').forEach((el) => {
    el.classList.add('hover-link');
    html.makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
  });
}

/**
 *
 * @param elem
 */
export function handleSisterKey(elem: HTMLElement) {
  elem.querySelectorAll<HTMLElement>('.sister-key').forEach((el) => {
    el.classList.add('hover-link');
    html.makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
  });
}

/**
 *
 * @param elem
 */
export function handleSisterView(elem: HTMLElement) {
  elem
    .querySelectorAll<HTMLElement>('.sisters-table, .index-table')
    .forEach((table) => {
      let counter = 1;
      Array.from(table.getElementsByTagName('tr')).forEach((el) => {
        const td = el.querySelector('.sister-view');
        if (!td) {
          console.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        td.innerHTML =
          `<span class="sister-index">${counter.toString()}. </span>` +
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
  elem.querySelectorAll<HTMLElement>('.dialect').forEach((el) => {
    el.classList.add('hover-link');
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
  elem.querySelectorAll<HTMLElement>('.developer').forEach((el) => {
    el.classList.add('link');
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
  anchor.classList.add('abbreviations');
  anchor.target = '_blank';
  crumElement?.insertBefore(anchor, crumElement.firstChild);
}

/**
 *
 * @param elem
 */
export function handleAnkiNavigation(elem: HTMLElement) {
  if (!iam.amI('anki')) return;
  elem.querySelectorAll<HTMLElement>('.navigate').forEach((e) => {
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
    ['hover-link'],
    ['type', 'title']
  );
}

/**
 *
 * @param elem
 */
export function addGreekLookups(elem: HTMLElement) {
  html.linkifyText(elem, GREEK_RE, GREEK_LOOKUP_URL_PREFIX, ['link', 'light']);
}

/**
 *
 * @param elem
 */
export function addEnglishLookups(elem: HTMLElement) {
  elem.querySelectorAll('.meaning').forEach((el) => {
    html.linkifyText(el, ENGLISH_RE, paths.LOOKUP_URL_PREFIX, ['hover-link']);
  });
}
