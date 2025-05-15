import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';

const SEARCH_BOX_ID = 'searchBox';
const FULL_WORD_CHECKBOX_ID = 'fullWordCheckbox';
const REGEX_CHECKBOX_ID = 'regexCheckbox';
// TODO: The message box gets written. Since multiple Xooxle instances are
// allowed to coexist on the same page, we should create several boxes,
// otherwise they could override each other!
const MESSAGE_BOX_ID = 'message';

const CRUM_HREF_FMT = '{KEY}.html';
const KELLIA_HREF_FMT = 'https://coptic-dictionary.org/entry.cgi?tla={KEY}';

interface Xooxle {
  indexURL: string;
  tableID: string;
  collapsibleID: string;
  hrefFmt?: string;
}

const XOOXLES: Xooxle[] = [
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
 * @param event
 */
function stopPropagation(event: KeyboardEvent) {
  event.stopPropagation();
}

/**
 *
 */
async function main(): Promise<void> {
  // Prevent other elements in the page from picking up key events on the
  // search box.
  const searchBox = document.getElementById(SEARCH_BOX_ID)!;
  searchBox.addEventListener('keyup', stopPropagation);
  searchBox.addEventListener('keydown', stopPropagation);
  searchBox.addEventListener('keypress', stopPropagation);

  // Initialize searchers.
  await Promise.all(
    XOOXLES.map(async (xoox) => {
      const raw = await fetch(xoox.indexURL);
      const json = (await raw.json()) as xooxle._Index;
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
}

await main();
