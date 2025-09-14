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
import * as d from './dialect.js';
import * as cls from './cls.js';
import * as ccls from '../cls.js';
import * as header from '../header.js';
import * as logger from '../logger.js';
import * as wiki from './wiki.js';
const COPTIC_RE = /[\p{Script=Coptic}][\p{Script=Coptic}\p{Mark}]*/gu;
const GREEK_RE = /[\p{Script=Greek}][\p{Script=Greek}\p{Mark}]*/gu;
const ENGLISH_RE = /[\p{Script=Latin}][\p{Script=Latin}\p{Mark}]*/gu;
/**
 * Handle all Crum elements.
 * @param root
 * @param highlighter
 */
export function handle(root, highlighter) {
  handleCategories(root);
  handleRootType(root);
  handleCrumPage(root);
  handleCrumPageExternal(root);
  handleDawoudPageExternal(root);
  handleDawoudPageImg(root);
  handleCrumPageImg(root);
  handleExplanatory(root);
  handleDawoudPage(root);
  handleDrvKey(root);
  handleExplanatoryKey(root);
  handleSisterKey(root);
  handleSisterView(root);
  handleDialect(root, highlighter);
  handleDeveloper(root, highlighter);
  insertCrumAbbreviationsLink();
  handleAnkiNavigation(root);
  addCopticLookups(root);
  addGreekLookups(root);
  addEnglishLookups(root);
  wiki.handle(root);
}
/**
 *
 * @param root
 */
export function handleCategories(root) {
  root.querySelectorAll(`.${cls.CATEGORIES}`).forEach((el) => {
    el.innerHTML = el.innerText
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
 * @param root
 */
export function handleRootType(root) {
  root.querySelectorAll(`.${cls.ROOT_TYPE}`).forEach((el) => {
    const type = el.querySelector('b')?.innerText;
    if (!type) {
      logger.error('Unable to infer the root type for element!', el);
      return;
    }
    el.innerHTML = `(<a class="${ccls.HOVER_LINK}" href="${paths.LEXICON}/${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
  });
}
/**
 *
 * @param root
 */
export function handleCrumPage(root) {
  root.querySelectorAll(`.${cls.CRUM_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(el.innerText)}`);
  });
}
/**
 *
 * @param root
 */
export function handleCrumPageExternal(root) {
  root.querySelectorAll(`.${cls.CRUM_PAGE_EXTERNAL}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    el.addEventListener('click', () => {
      browser.open(`${paths.CRUM_SCAN_PREFIX}${el.innerText}`);
    });
  });
}
/**
 *
 * @param root
 */
export function handleDawoudPageExternal(root) {
  root.querySelectorAll(`.${cls.DAWOUD_PAGE_EXTERNAL}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    el.addEventListener('click', () => {
      browser.open(`${paths.DAWOUD}?page=${el.innerText}`);
    });
  });
}
/**
 *
 * @param root
 */
export function handleDawoudPageImg(root) {
  root.querySelectorAll(`.${cls.DAWOUD_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0];
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.DAWOUD}?page=${img.getAttribute('alt')}`);
    });
  });
}
/**
 *
 * @param root
 */
export function handleCrumPageImg(root) {
  root.querySelectorAll(`.${cls.CRUM_PAGE_IMG}`).forEach((el) => {
    const img = el.children[0];
    img.classList.add(ccls.LINK);
    img.addEventListener('click', () => {
      browser.open(`${paths.CRUM_SCAN_PREFIX}${img.getAttribute('alt')}`);
    });
  });
}
/**
 *
 * @param root
 */
export function handleExplanatory(root) {
  root.querySelectorAll(`.${cls.EXPLANATORY}`).forEach((el) => {
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
 * @param root
 */
export function handleDawoudPage(root) {
  root.querySelectorAll(`.${cls.DAWOUD_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerText)}`);
  });
}
/**
 *
 * @param root
 */
export function handleDrvKey(root) {
  root.querySelectorAll(`.${cls.DRV_KEY}`).forEach((key) => {
    // The key should have the link to the row containing the derivation
    // definition in our source-of-truth sheet.
    // Make the target _blank so it will open in a separate page.
    key.target = '_blank';
    // Create a second anchor pointing to this row in the HTML. This is useful
    // for users to share links to specific derivations.
    const frag = `#drv${key.innerText}`;
    const a = document.createElement('a');
    a.href = frag;
    a.classList.add(ccls.HOVER_LINK);
    a.innerText = '🔗';
    // Store the key parent.
    const parent = key.parentNode;
    // Create a span bearing the two anchors, with a space in between.
    const span = document.createElement('span');
    span.classList.add(cls.DRV_LINK);
    span.replaceChildren(a, ' ', key);
    // Add the new span as a child to the original parent.
    parent.appendChild(span);
    if (iam.amI('anki')) {
      // Yanking is not straightforward on Anki, for what it seems!
      return;
    }
    // Clicking on the anchor also copies the URL.
    a.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.hash = frag;
      browser.yank(url.toString());
    });
  });
}
/**
 *
 * @param root
 */
export function handleExplanatoryKey(root) {
  root.querySelectorAll(`.${cls.EXPLANATORY_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#explanatory${el.innerText}`);
  });
}
/**
 *
 * @param root
 */
export function handleSisterKey(root) {
  root.querySelectorAll(`.${cls.SISTER_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#sister${el.innerText}`);
  });
}
/**
 *
 * @param root
 */
export function handleSisterView(root) {
  root
    .querySelectorAll(css.classQuery(cls.SISTERS_TABLE, cls.INDEX_TABLE))
    .forEach((table) => {
      let counter = 1;
      table.querySelectorAll('tr').forEach((el) => {
        const td = el.querySelector(`.${cls.SISTER_VIEW}`);
        if (!td) {
          logger.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        td.innerHTML = `<span class="${cls.SISTER_INDEX}">${counter.toString()}. </span>${td.innerHTML}`;
        counter++;
      });
    });
}
/**
 *
 * @param root
 * @param highlighter
 */
export function handleDialect(root, highlighter) {
  root.querySelectorAll(`.${cls.DIALECT}`).forEach((el) => {
    const code = el.innerText;
    el.replaceChildren(...d.DIALECTS[code].prettyCode());
    if (el.closest(`.${cls.WIKI}`)) {
      // Dialect highlighting doesn't really work under Wiki, so we disable it
      // here!
      return;
    }
    el.classList.add(ccls.HOVER_LINK);
    el.addEventListener(
      'click',
      highlighter.toggleDialect.bind(highlighter, code)
    );
  });
}
/**
 *
 * @param root
 * @param highlighter
 */
export function handleDeveloper(root, highlighter) {
  root.querySelectorAll(`.${header.CLS.DEVELOPER}`).forEach((el) => {
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
 * @param root
 */
export function handleAnkiNavigation(root) {
  if (!iam.amI('anki')) return;
  root.querySelectorAll(`.${cls.NAVIGATE}`).forEach((e) => {
    if (e.tagName !== 'A' || !e.hasAttribute('href')) {
      logger.error(
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
 * @param root
 */
export function addCopticLookups(root) {
  html.linkifyText(
    root,
    COPTIC_RE,
    (match) => paths.LOOKUP_URL_PREFIX + match[0],
    [ccls.HOVER_LINK],
    [cls.TYPE, cls.WIKI]
  );
}
/**
 *
 * @param root
 */
export function addGreekLookups(root) {
  html.linkifyText(
    root,
    GREEK_RE,
    (match) => paths.GREEK_DICT_PREFIX + match[0],
    [ccls.LINK, cls.LIGHT]
  );
}
/**
 *
 * @param root
 */
export function addEnglishLookups(root) {
  root.querySelectorAll(`.${cls.MEANING}`).forEach((el) => {
    html.linkifyText(
      el,
      ENGLISH_RE,
      (match) => paths.LOOKUP_URL_PREFIX + match[0],
      [ccls.HOVER_LINK]
    );
  });
}
