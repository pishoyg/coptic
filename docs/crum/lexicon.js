import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';
import * as utils from '../utils.js';
import * as highlight from './highlight.js';
import * as help from './help.js';
const SEARCH_BOX_ID = 'searchBox';
const FULL_WORD_CHECKBOX_ID = 'fullWordCheckbox';
const REGEX_CHECKBOX_ID = 'regexCheckbox';
// TODO: The message box gets written. Since multiple Xooxle instances are
// allowed to coexist on the same page, we should create several boxes,
// otherwise they could override each other!
const MESSAGE_BOX_ID = 'message';
const CRUM_HREF_FMT = '{KEY}.html';
const KELLIA_HREF_FMT = 'https://coptic-dictionary.org/entry.cgi?tla={KEY}';
const dialectCheckboxes = Array.from(
  document.querySelectorAll('.dialect-checkbox')
);
const XOOXLES = [
  {
    indexURL: 'crum.json',
    tableID: 'crum',
    collapsibleID: 'crum-collapsible',
    hrefFmt: CRUM_HREF_FMT,
  },
  {
    indexURL: 'kellia.json',
    tableID: 'kellia',
    collapsibleID: 'kellia-collapsible',
    hrefFmt: KELLIA_HREF_FMT,
  },
  {
    indexURL: 'copticsite.json',
    tableID: 'copticsite',
    collapsibleID: 'copticsite-collapsible',
  },
];
/**
 *
 */
async function main() {
  // Prevent other elements in the page from picking up key events on the
  // search box.
  const searchBox = document.getElementById(SEARCH_BOX_ID);
  searchBox.addEventListener('keyup', utils.stopPropagation);
  searchBox.addEventListener('keydown', utils.stopPropagation);
  searchBox.addEventListener('keypress', utils.stopPropagation);
  // Initialize searchers.
  // TODO: You initialize three different Form objects, and it looks like each
  // one of them will end up populating the query parameters separately! They
  // also populate the shared objects from the parameters repeatedly!
  // While this is not currently a problem, it remains undesirable.
  // Deduplicate these actions, somehow.
  await Promise.all(
    XOOXLES.map(async (xoox) => {
      const raw = await fetch(xoox.indexURL);
      const json = await raw.json();
      const form = new xooxle.Form({
        searchBoxID: SEARCH_BOX_ID,
        fullWordCheckboxID: FULL_WORD_CHECKBOX_ID,
        regexCheckboxID: REGEX_CHECKBOX_ID,
        messageBoxID: MESSAGE_BOX_ID,
        resultsTableID: xoox.tableID,
        collapsibleID: xoox.collapsibleID,
      });
      new xooxle.Xooxle(json, form, xoox.hrefFmt);
    })
  );
  // Initialize collapsible elements.
  collapse.addListenersForSiblings(true);
  const highlighter = new highlight.Highlighter(false, dialectCheckboxes);
  help.makeHelpPanel(highlighter);
  highlighter.update();
}
await main();
