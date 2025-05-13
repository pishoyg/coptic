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

function stopPropagation(event: KeyboardEvent) {
  event.stopPropagation();
}

async function main() {
  const form = new xooxle.Form({
    searchBoxID: SEARCH_BOX_ID,
    fullWordCheckboxID: FULL_WORD_CHECKBOX_ID,
    regexCheckboxID: REGEX_CHECKBOX_ID,
    messageBoxID: MESSAGE_BOX_ID,
  });

  // Prevent other elements in the page from picking up key events on the
  // search box.
  form.searchBox.addEventListener('keyup', stopPropagation);
  form.searchBox.addEventListener('keydown', stopPropagation);
  form.searchBox.addEventListener('keypress', stopPropagation);

  await Promise.all(
    XOOXLES.map(async (x) => {
      const raw = await fetch(x.indexURL);
      const json = (await raw.json()) as xooxle._Index;
      const index = new xooxle.Index(
        json,
        x.tableID,
        x.collapsibleID,
        x.hrefFmt
      );
      return new xooxle.Xooxle(index, form);
    })
  );

  collapse.addListeners(true);
}

await main();
