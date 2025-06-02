// NOTE: While this file is used for both Crum and Xooxle, make sure that only
// the Crum-specific Xooxle content lives here, and that any generic Xooxle
// logic (applicable for other instances of Xooxle) live in the shared Xooxle
// files.
// TODO: (#202) Reduce the dependency on `innerHTML`. Use attributes when
// possible. NOTE: The associated issue is closed. Judge whether it should be
// reopened, or if we should create a new issue, or just delete this TODO.
import * as help from './help.js';
import * as iam from '../iam.js';
import * as browser from '../browser.js';
import * as html from '../html.js';
import * as scan from '../scan.js';
import * as paths from '../paths.js';
import * as highlight from './highlight.js';
const COPTIC_RE = /[Ⲁ-ⲱϢ-ϯⳈⳉ]+/giu;
const GREEK_RE = /[Α-Ωα-ω]+/giu;
const ENGLISH_RE = /[A-Za-z]+/giu;
const GREEK_LOOKUP_URL_PREFIX = 'https://logeion.uchicago.edu/';
const ABBREVIATIONS_PAGE =
  'https://coptic.wiki/crum/?section=list_of_abbreviations';
/**
 *
 */
function main() {
  const highlighter = new highlight.Highlighter(iam.amI('anki'), []);
  // We disable the help panel on Anki for the following reasons:
  // - There is no keyboard on mobile.
  // - Many of the shortcuts simply don't work, for some reason.
  // - Anki on macOS (and possibly on other platforms) has its own shortcuts,
  //   which conflict with ours!
  // - Elements created by the panel logic (such as the `help` footer) were
  //   found to be duplicated on some Anki platforms!
  if (!iam.amI('anki')) {
    help.makeHelpPanel(highlighter);
  }
  // Handle 'categories' class.
  document.querySelectorAll('.categories').forEach((elem) => {
    const linked = elem.innerHTML
      .trim()
      .split(',')
      .map((s) => s.trim())
      .map(
        (s) =>
          `<a class="hover-link" href="${paths.LEXICON}/${s}.html" target="_blank">${s}</a>`
      )
      .join(', ');
    elem.innerHTML = linked;
  });
  // Handle 'root-type' class.
  document.querySelectorAll('.root-type').forEach((elem) => {
    const type = elem.getElementsByTagName('b')[0]?.innerHTML;
    if (!type) {
      console.error('Unable to infer the root type for element!', elem);
      return;
    }
    const linked = `(<a class="hover-link" href="${paths.LEXICON}/${type.replaceAll('/', '_')}.html" target="_blank">${type}</a>)`;
    elem.innerHTML = linked;
  });
  // Handle 'crum-page' class.
  document.querySelectorAll('.crum-page').forEach((el) => {
    const pageNumber = el.innerHTML;
    el.classList.add('link');
    html.makeSpanLinkToAnchor(el, `#crum${scan.chopColumn(pageNumber)}`);
  });
  // Handle 'crum-page-external' class.
  document.querySelectorAll('.crum-page-external').forEach((el) => {
    el.classList.add('link');
    el.onclick = () => {
      browser.open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.innerHTML}`
      );
    };
  });
  // Handle 'dawoud-page-external' class.
  document.querySelectorAll('.dawoud-page-external').forEach((el) => {
    el.classList.add('link');
    el.onclick = () => {
      browser.open(`${paths.DAWOUD}?page=${el.innerHTML}`);
    };
  });
  // Handle 'dawoud-page-img' class.
  document.querySelectorAll('.dawoud-page-img').forEach((el) => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0];
    el.classList.add('link');
    el.onclick = () => {
      browser.open(`${paths.DAWOUD}?page=${el.getAttribute('alt')}`);
    };
  });
  // Handle 'crum-page-img' class.
  document.querySelectorAll('.crum-page-img').forEach((el) => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    el = el.children[0];
    el.classList.add('link');
    el.onclick = () => {
      browser.open(
        `https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID=${el.getAttribute('alt')}`
      );
    };
  });
  // Handle 'explanatory' class.
  document.querySelectorAll('.explanatory').forEach((el) => {
    // TODO: (#202) Eliminate the dependency on the HTML structure.
    const img = el.children[0];
    const alt = img.getAttribute('alt');
    if (!alt.startsWith('http')) {
      return;
    }
    img.classList.add('link');
    img.onclick = () => {
      browser.open(alt);
    };
  });
  // Handle 'dawoud-page' class.
  document.querySelectorAll('.dawoud-page').forEach((el) => {
    el.classList.add('link');
    html.makeSpanLinkToAnchor(el, `#dawoud${scan.chopColumn(el.innerHTML)}`);
  });
  // Handle 'drv-key' class.
  document.querySelectorAll('.drv-key').forEach((el) => {
    el.classList.add('small', 'light', 'italic', 'hover-link');
    html.makeSpanLinkToAnchor(el, `#drv${el.innerHTML}`);
  });
  // Handle 'explanatory-key' class.
  document.querySelectorAll('.explanatory-key').forEach((el) => {
    el.classList.add('hover-link');
    html.makeSpanLinkToAnchor(el, `#explanatory${el.innerHTML}`);
  });
  // Handle 'sister-key' class.
  document.querySelectorAll('.sister-key').forEach((el) => {
    el.classList.add('hover-link');
    html.makeSpanLinkToAnchor(el, `#sister${el.innerHTML}`);
  });
  // Handle 'sister-view' class.
  document.querySelectorAll('.sisters-table, .index-table').forEach((table) => {
    let counter = 1;
    Array.from(table.getElementsByTagName('tr')).forEach((el) => {
      const td = el.querySelector('.sister-view');
      if (!td) {
        console.error(
          'A raw in the sisters table does not have a "sister-view" element!'
        );
        return;
      }
      td.innerHTML =
        `<span class="sister-index">${counter.toString()}. </span>` +
        td.innerHTML;
      counter += 1;
    });
  });
  // Handle 'dialect' class.
  document.querySelectorAll('.dialect').forEach((el) => {
    el.classList.add('hover-link');
    el.onclick = highlighter.toggleDialect.bind(highlighter, el.innerHTML);
  });
  // Handle 'developer' class.
  document.querySelectorAll('.developer').forEach((el) => {
    el.classList.add('link');
    el.onclick = highlighter.toggleDev.bind(highlighter);
  });
  {
    // Add a link to the Crum abbreviations.
    const crumElement = document.getElementById('crum');
    const anchor = document.createElement('a');
    anchor.textContent = 'Abbreviations';
    anchor.href = ABBREVIATIONS_PAGE;
    anchor.classList.add('abbreviations');
    anchor.target = '_blank';
    crumElement?.insertBefore(anchor, crumElement.firstChild);
  }
  if (iam.amI('anki')) {
    // On web, we are capable of navigating the website using relative paths.
    // That's not the case on Anki, so we prepend the full URL.
    // Since Anki flashcards correspond to pages in our Lexicon directory, it's
    // the Lexicon URL that we need to prepend.
    document.querySelectorAll('.navigate').forEach((e) => {
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
  // Add Coptic word lookups.
  html.linkifyText(
    document.body,
    COPTIC_RE,
    paths.LOOKUP_URL_PREFIX,
    ['hover-link'],
    ['type', 'title']
  );
  // Add Greek word lookups.
  html.linkifyText(document.body, GREEK_RE, GREEK_LOOKUP_URL_PREFIX, [
    'link',
    'light',
  ]);
  // Handle 'meaning' class.
  // Add English word lookups.
  document.querySelectorAll('.meaning').forEach((elem) => {
    html.linkifyText(elem, ENGLISH_RE, paths.LOOKUP_URL_PREFIX, ['hover-link']);
  });
}
main();
