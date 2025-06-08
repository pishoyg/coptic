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
import * as cls from './cls.js';
import * as ccls from '../cls.js';
import * as header from '../header.js';
const COPTIC_RE = /[Ⲁ-ⲱϢ-ϯⳈⳉ]+/giu;
const GREEK_RE = /[Α-Ωα-ω]+/giu;
const ENGLISH_RE = /[A-Za-z]+/giu;
/**
 *
 * @param elem
 * @param highlighter
 */
export function handleAll(elem, highlighter) {
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
export function handleCategories(elem) {
  elem.querySelectorAll(`.${cls.CATEGORIES}`).forEach((el) => {
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
export function handleRootType(elem) {
  elem.querySelectorAll(`.${cls.ROOT_TYPE}`).forEach((el) => {
    const type = el.querySelector('b')?.innerHTML;
    if (!type) {
      console.error('Unable to infer the root type for element!', el);
      return;
    }
    el.innerHTML = `(<a class="${ccls.HOVER_LINK}" href="${paths.LEXICON}/${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
  });
}
/**
 *
 * @param elem
 */
export function handleCrumPage(elem) {
  elem.querySelectorAll(`.${cls.CRUM_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerHTML)}`);
  });
}
/**
 *
 * @param elem
 */
export function handleCrumPageExternal(elem) {
  elem.querySelectorAll(`.${cls.CRUM_PAGE_EXTERNAL}`).forEach((el) => {
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
export function handleDawoudPageExternal(elem) {
  elem.querySelectorAll(`.${cls.DAWOUD_PAGE_EXTERNAL}`).forEach((el) => {
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
export function handleDawoudPageImg(elem) {
  elem.querySelectorAll(`.${cls.DAWOUD_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0];
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.DAWOUD}?page=${img.getAttribute('alt')}`);
    });
  });
}
/**
 *
 * @param elem
 */
export function handleCrumPageImg(elem) {
  elem.querySelectorAll(`.${cls.CRUM_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0];
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.CRUM_SCAN_PREFIX}${img.getAttribute('alt')}`);
    });
  });
}
/**
 *
 * @param elem
 */
export function handleExplanatory(elem) {
  elem.querySelectorAll(`.${cls.EXPLANATORY}`).forEach((el) => {
    const img = el.children[0];
    const alt = img.getAttribute('alt');
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
export function handleDawoudPage(elem) {
  elem.querySelectorAll(`.${cls.DAWOUD_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerHTML)}`);
  });
}
/**
 *
 * @param elem
 */
export function handleDrvKey(elem) {
  elem.querySelectorAll(`.${cls.DRV_KEY}`).forEach((el) => {
    el.classList.add(cls.SMALL, cls.LIGHT, cls.ITALIC, ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#drv${el.innerHTML}`);
  });
}
/**
 *
 * @param elem
 */
export function handleExplanatoryKey(elem) {
  elem.querySelectorAll(`.${cls.EXPLANATORY_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
  });
}
/**
 *
 * @param elem
 */
export function handleSisterKey(elem) {
  elem.querySelectorAll(`.${cls.SISTER_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
  });
}
/**
 *
 * @param elem
 */
export function handleSisterView(elem) {
  elem
    .querySelectorAll(css.classQuery(cls.SISTERS_TABLE, cls.INDEX_TABLE))
    .forEach((table) => {
      let counter = 1;
      table.querySelectorAll('tr').forEach((el) => {
        const td = el.querySelector(`.${cls.SISTER_VIEW}`);
        if (!td) {
          console.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        td.innerHTML =
          `<span class="${cls.SISTER_INDEX}">${counter.toString()}. </span>` +
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
export function handleDialect(elem, highlighter) {
  elem.querySelectorAll(`.${cls.DIALECT}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    el.addEventListener(
      'click',
      highlighter.toggleDialect.bind(highlighter, el.innerHTML)
    );
  });
}
/**
 *
 * @param elem
 * @param highlighter
 */
export function handleDeveloper(elem, highlighter) {
  elem.querySelectorAll(`.${header.CLS.DEVELOPER}`).forEach((el) => {
    el.classList.add(ccls.LINK);
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
  anchor.href = paths.CRUM_ABBREVIATIONS;
  anchor.classList.add(cls.ABBREVIATIONS);
  anchor.target = '_blank';
  crumElement?.insertBefore(anchor, crumElement.firstChild);
}
/**
 *
 * @param elem
 */
export function handleAnkiNavigation(elem) {
  if (!iam.amI('anki')) return;
  elem.querySelectorAll(`.${cls.NAVIGATE}`).forEach((e) => {
    if (e.tagName !== 'A' || !e.hasAttribute('href')) {
      console.error(
        'This "navigate" element is not an <a> tag with an "href" property!',
        e
      );
      return;
    }
    e.setAttribute('href', `${paths.LEXICON}/${e.getAttribute('href')}`);
  });
}
/**
 *
 * @param elem
 */
export function addCopticLookups(elem) {
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
export function addGreekLookups(elem) {
  html.linkifyText(elem, GREEK_RE, paths.GREEK_DICT_PREFIX, [
    ccls.LINK,
    cls.LIGHT,
  ]);
}
/**
 *
 * @param elem
 */
export function addEnglishLookups(elem) {
  elem.querySelectorAll(`.${cls.MEANING}`).forEach((el) => {
    html.linkifyText(el, ENGLISH_RE, paths.LOOKUP_URL_PREFIX, [
      ccls.HOVER_LINK,
    ]);
  });
}
