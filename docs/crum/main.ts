import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';

interface Xooxle {
  indexURL: string;
  tableID: string;
}

const XOOXLES: Xooxle[] = [
  { indexURL: 'crum.json', tableID: 'crum' },
  { indexURL: 'kellia.json', tableID: 'kellia' },
  { indexURL: 'copticsite.json', tableID: 'copticsite' },
];

function stopPropagation(event: KeyboardEvent) {
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
    XOOXLES.map(
      async (xoox) =>
        new xooxle.Xooxle(await xooxle.index(xoox.indexURL, xoox.tableID), form)
    )
  );

  collapse.addListeners(true);
}

await main();
