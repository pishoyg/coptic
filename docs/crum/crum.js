/**
 * Package crum defines Crum note handlers.
 */
import * as iam from '../iam.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
import * as css from '../css.js';
import * as dial from './dialect.js';
import * as cls from './cls.js';
import * as id from './id.js';
import * as ccls from '../cls.js';
import * as head from '../header.js';
import * as log from '../logger.js';
import * as wiki from './wiki.js';
import * as drop from '../dropdown.js';
import * as roots from './roots.js';
import * as derivations from './derivations.js';
const COPTIC_RE = /[\p{Script=Coptic}][\p{Script=Coptic}\p{Mark}]*/gu;
const GREEK_RE = /[\p{Script=Greek}][\p{Script=Greek}\p{Mark}]*/gu;
const ENGLISH_RE = /[\p{Script=Latin}][\p{Script=Latin}\p{Mark}]*/gu;
/**
 * Handle all Crum elements.
 * @param root
 * @param highlighter
 * @param devHighlighter
 */
export function handle(root, highlighter, devHighlighter) {
  handleCategories(root);
  handleRootType(root);
  handleCrumPage(root);
  handleDawoudPageImg(root);
  handleCrumPageImg(root);
  handleExplanatory(root);
  handleDawoudPage(root);
  handleDrvKey(root);
  handleExplanatoryKey(root);
  handleSisterKey(root);
  handleSisterView(root);
  handleDialect(root, highlighter);
  handleDeveloper(root, devHighlighter);
  insertCrumAbbreviationsLink();
  handleAnkiNavigation(root);
  addCopticLookups(root);
  addGreekLookups(root);
  addEnglishLookups(root);
  handleNagHammadi(root);
  handleQuality(root);
  wiki.handle(root);
}
/**
 *
 * @param root
 */
export function handleCategories(root) {
  root.querySelectorAll(`.${cls.CATEGORIES}`).forEach((el) => {
    const cats = el.textContent
      .trim()
      .split(',')
      .map((cat) => cat.trim());
    el.replaceChildren(
      ...cats.flatMap((cat, index) => {
        const a = document.createElement('a');
        a.classList.add(ccls.HOVER_LINK);
        a.target = '_blank';
        a.textContent = cat;
        a.href = paths.crum(cat);
        return index === cats.length - 1 ? [a] : [a, ', '];
      })
    );
  });
}
/**
 *
 * @param root
 */
export function handleRootType(root) {
  root.querySelectorAll(`.${cls.PART_OF_SPEECH} b`).forEach((el) => {
    const type = el.textContent.trim();
    const link = document.createElement('a');
    link.classList.add(ccls.HOVER_LINK);
    link.href = paths.crum(type.replaceAll('/', '_'));
    link.target = '_blank';
    link.textContent = type;
    el.replaceChildren(link);
  });
}
/**
 *
 * @param root
 */
export function handleCrumPage(root) {
  root.querySelectorAll(`.${cls.CRUM_PAGE}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    if (el.closest(`.${cls.WIKI}`)) {
      // Inside Wiki, crum-page elements point externally.
      el.classList.add(ccls.LINK);
      el.addEventListener('click', () => {
        browser.open(paths.crumScan(el.textContent));
      });
      return;
    }
    // Outside Wiki, crum-page elements point to an anchor within the page.
    // TODO: (#575) The scans should be removed from the notes, and all Crum
    // pages should point externally.
    html.makeSpanLinkToAnchor(
      el,
      `#crum${scan.chopColumn(el.textContent.trim())}`
    );
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
      browser.open(paths.dawoudScan(img.getAttribute('alt')));
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
      browser.open(paths.crumScan(img.getAttribute('alt')));
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
    html.makeSpanLinkToAnchor(
      el,
      `#dawoud${scan.chopColumn(el.textContent.trim())}`
    );
  });
}
/**
 *
 * @param root
 */
export function handleDrvKey(root) {
  let rowNum = derivations.MAPPING[marcion() ?? 0];
  root.querySelectorAll(`.${cls.DRV_KEY}`).forEach((key) => {
    // The key should have the link to the row containing the derivation
    // definition in our source-of-truth sheet.
    // Make the target _blank so it will open in a separate page.
    if (!rowNum) {
      log.error('Page has derivations, but unable to infer their row numbers!');
    } else {
      key.classList.add(ccls.LINK);
      key.addEventListener(
        'click',
        browser.open.bind(
          browser,
          paths.rowUrl(paths.CRUM_DERIVATIONS_URL, rowNum++),
          true
        )
      );
    }
    // Create a second anchor pointing to this row in the HTML. This is useful
    // for users to share links to specific derivations.
    const frag = `#drv${key.textContent.trim()}`;
    const a = document.createElement('a');
    a.href = frag;
    a.classList.add(ccls.HOVER_LINK);
    a.textContent = '🔗';
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
    html.makeSpanLinkToAnchor(el, `#explanatory${el.textContent.trim()}`);
  });
}
/**
 *
 * @param root
 */
export function handleSisterKey(root) {
  root.querySelectorAll(`.${cls.SISTER_KEY}`).forEach((el) => {
    el.classList.add(ccls.HOVER_LINK);
    html.makeSpanLinkToAnchor(el, `#sister${el.textContent.trim()}`);
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
      table.querySelectorAll('tr').forEach((tr) => {
        const td = tr.querySelector(`.${cls.SISTER_VIEW}`);
        if (!td) {
          log.error(
            'A row in the sisters table does not have a "sister-view" element!'
          );
          return;
        }
        const span = document.createElement('span');
        span.classList.add(cls.SISTER_INDEX);
        span.textContent = `${(counter++).toString()}. `;
        td.prepend(span);
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
    const code = el.textContent.trim();
    if (!(code in dial.DIALECTS)) {
      // There are (extremely rare) but known occurrences of irregular
      // dialects, namely:
      // - `Bf` (Bohairic with Fayyumic tendency) under `ϫⲟⲗ (wave)`
      // - `Saf` (Sahidic with Akhmimic and Fayyumic tendency) under ⲥⲟⲉⲓϣ
      //   (pair).
      // For know, we simply ignore them.
      // TODO: (#0) Consider at least prettifying their appearance.
      log.warn('Unknown dialect', code);
      return;
    }
    const dialect = dial.DIALECTS[code];
    // Prettify the appearance of the dialect code.
    const siglum = dialect.siglum();
    el.replaceChildren(siglum);
    // Add a tooltip with the dialect name.
    drop.addDroppable(el, 'hover', ...dialect.anchoredName());
    if (el.closest(`.${cls.WIKI}`)) {
      // Dialect highlighting doesn't really work under Wiki, so we disable it
      // here!
      return;
    }
    siglum.classList.add(ccls.HOVER_LINK);
    siglum.addEventListener(
      'click',
      highlighter.toggle.bind(highlighter, code)
    );
  });
}
/**
 *
 * @param root
 * @param highlighter
 */
export function handleDeveloper(root, highlighter) {
  root.querySelectorAll(`.${head.CLS.DEVELOPER}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    el.addEventListener('click', highlighter.toggle.bind(highlighter));
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
 * Prefix all navigation URLs with the Lexicon path.
 * This is unnecessary on web because a browser is capable of resolving relative
 * paths. But it is necessary on Anki.
 * @param root
 */
export function handleAnkiNavigation(root) {
  if (!iam.amI('anki')) return;
  root.querySelectorAll(`a.${cls.NAVIGATE}`).forEach((a) => {
    // Get the raw attribute.
    const href = a.getAttribute('href');
    if (!href) {
      log.error(cls.NAVIGATE, 'element HREF is unset!');
      return;
    }
    if (href.startsWith('http')) {
      log.error(cls.NAVIGATE, 'element HREF looks like an absolute URL!');
      return;
    }
    a.setAttribute('href', `${paths.LEXICON}/${href}`);
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
    (match) => paths.lexiconLookup(match[0]),
    [ccls.HOVER_LINK],
    // Most Coptic text in Wiki and Nag Hammadi are example sentences, with the
    // words containing prefixes or suffixes rather than being bare roots.
    // We exclude them from lookup hyperlinks in order to avoid confusion.
    // The type is usually "ⲡ" for masculine, "ⲧ" for feminine, "ⲛ" for
    // plural. Adding lookup hyperlinks to that doesn't really make sense.
    [cls.TYPE, cls.WIKI, cls.NAG_HAMMADI]
  );
}
/**
 *
 * @param root
 */
export function addGreekLookups(root) {
  html.linkifyText(root, GREEK_RE, (match) => paths.greekLookup(match[0]), [
    ccls.LINK,
    cls.GREEK,
  ]);
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
      (match) => paths.lexiconLookup(match[0]),
      [ccls.HOVER_LINK],
      [cls.PART_OF_SPEECH, cls.ROMAN, cls.HEADING]
    );
  });
}
// A Nag Hammadi reference has the following format:
// eslint-disable-next-line max-len
//   codex {ROMAN_NUMERAL} - {TRACTATE_TITLE}; {TRACTATE_NUMBER}; {LEAF_NUMBER}; {LINE_NUMBER}; {QUOTE}
// There is a 1:1 mapping between tractate names and numbers, and tractate
// numbers don't really make sense outside of Marcion.
// The leaf number is almost always a number, but occasionally it's "flyleaf
// verso" or "flyleaft recto".
const NAG_HAMMADI_RE =
  /\bcodex ([a-z]*) - ([^;]+); [0-9]+; ([0-9]+|flyleaf (?:verso|recto)); ([0-9]+);/gi;
/**
 *
 * @param root
 */
export function handleNagHammadi(root) {
  root.querySelectorAll(`.${cls.NAG_HAMMADI}`).forEach((elem) => {
    html.replaceText(elem, NAG_HAMMADI_RE, (match, remainder) => {
      const anchor = document.createElement('a');
      anchor.target = '_blank';
      const [codex, title, leaf, line] = [
        match[1],
        match[2],
        match[3],
        match[4],
      ];
      anchor.href = paths.nagHammadiPapyrus(codex, leaf);
      // Notice that we intentionally drop the tractate number from the
      // output, because it doesn't make sense outside of Marcion.
      anchor.textContent = `codex ${codex} - ${title} - ${leaf}`;
      return {
        replacement: anchor,
        remainder: `: ${line}: ${remainder}`,
      };
    });
  });
}
/**
 * @returns The Marcion database key of the current word.
 */
function marcion() {
  const key = parseInt(document.getElementById(id.KEY)?.textContent ?? '');
  return isNaN(key) ? undefined : key;
}
/**
 *
 * @param root
 */
export function handleQuality(root) {
  const rowNum = roots.MAPPING[marcion() ?? 0];
  if (!rowNum) {
    log.error('Unable to retrieve root row number!');
    return;
  }
  root.querySelectorAll(`.${cls.QUALITY}`).forEach((el) => {
    el.classList.add(ccls.LINK);
    el.addEventListener(
      'click',
      browser.open.bind(
        browser,
        paths.rowUrl(paths.CRUM_ROOTS_URL, rowNum),
        true
      )
    );
  });
}
