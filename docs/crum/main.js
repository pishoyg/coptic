import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';
const XOOXLES = [
  { indexURL: 'crum.json', tableID: 'crum', collapsibleID: 'crum-collapsible' },
  {
    indexURL: 'kellia.json',
    tableID: 'kellia',
    collapsibleID: 'kellia-collapsible',
  },
  {
    indexURL: 'copticsite.json',
    tableID: 'copticsite',
    collapsibleID: 'copticsite-collapsible',
  },
];
function stopPropagation(event) {
  event.stopPropagation();
}
async function main() {
  const form = new xooxle.Form();
  form.populateFromParams();
  // Prevent other elements in the page from picking up key events on the
  // search box.
  xooxle.Form.searchBox.addEventListener('keyup', stopPropagation);
  xooxle.Form.searchBox.addEventListener('keydown', stopPropagation);
  xooxle.Form.searchBox.addEventListener('keypress', stopPropagation);
  await Promise.all(
    XOOXLES.map(async (x) => {
      const index = await xooxle.index(x.indexURL, x.tableID, x.collapsibleID);
      return new xooxle.Xooxle(index, form);
    })
  );
  collapse.addListeners(true);
}
await main();
