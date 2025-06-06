// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.
import * as iam from '../iam.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
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
  elem.querySelectorAll('.categories').forEach((el) => {
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
export function handleRootType(elem) {
  elem.querySelectorAll('.root-type').forEach((el) => {
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
export function handleCrumPage(elem) {
  elem.querySelectorAll('.crum-page').forEach((el) => {
    el.classList.add('link');
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerHTML)}`);
  });
}
/**
 *
 * @param elem
 */
export function handleCrumPageExternal(elem) {
  elem.querySelectorAll('.crum-page-external').forEach((el) => {
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
export function handleDawoudPageExternal(elem) {
  elem.querySelectorAll('.dawoud-page-external').forEach((el) => {
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
export function handleDawoudPageImg(elem) {
  elem.querySelectorAll('.dawoud-page-img').forEach((el) => {
    const img = el.children[0];
    img.classList.add('link');
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
  elem.querySelectorAll('.crum-page-img').forEach((el) => {
    const img = el.children[0];
    img.classList.add('link');
    img.addEventListener('click', () => {
      browser.open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${img.getAttribute('alt')}`
      );
    });
  });
}
/**
 *
 * @param elem
 */
export function handleExplanatory(elem) {
  elem.querySelectorAll('.explanatory').forEach((el) => {
    const img = el.children[0];
    const alt = img.getAttribute('alt');
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
export function handleDawoudPage(elem) {
  elem.querySelectorAll('.dawoud-page').forEach((el) => {
    el.classList.add('link');
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerHTML)}`);
  });
}
/**
 *
 * @param elem
 */
export function handleDrvKey(elem) {
  elem.querySelectorAll('.drv-key').forEach((el) => {
    el.classList.add('small', 'light', 'italic', 'hover-link');
    html.makeSpanLinkToAnchor(el, `#drv${el.innerHTML}`);
  });
}
/**
 *
 * @param elem
 */
export function handleExplanatoryKey(elem) {
  elem.querySelectorAll('.explanatory-key').forEach((el) => {
    el.classList.add('hover-link');
    html.makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
  });
}
/**
 *
 * @param elem
 */
export function handleSisterKey(elem) {
  elem.querySelectorAll('.sister-key').forEach((el) => {
    el.classList.add('hover-link');
    html.makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
  });
}
/**
 *
 * @param elem
 */
export function handleSisterView(elem) {
  elem.querySelectorAll('.sisters-table, .index-table').forEach((table) => {
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
export function handleDialect(elem, highlighter) {
  elem.querySelectorAll('.dialect').forEach((el) => {
    el.classList.add('hover-link');
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
  elem.querySelectorAll('.developer').forEach((el) => {
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
export function handleAnkiNavigation(elem) {
  if (!iam.amI('anki')) return;
  elem.querySelectorAll('.navigate').forEach((e) => {
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
    ['hover-link'],
    ['type', 'title']
  );
}
/**
 *
 * @param elem
 */
export function addGreekLookups(elem) {
  html.linkifyText(elem, GREEK_RE, GREEK_LOOKUP_URL_PREFIX, ['link', 'light']);
}
/**
 *
 * @param elem
 */
export function addEnglishLookups(elem) {
  elem.querySelectorAll('.meaning').forEach((el) => {
    html.linkifyText(el, ENGLISH_RE, paths.LOOKUP_URL_PREFIX, ['hover-link']);
  });
}
