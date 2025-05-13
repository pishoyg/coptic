import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';

const XOOXLE_JSON = 'xooxle.json';

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

  const indexes: xooxle.Index[] = (
    await fetch(XOOXLE_JSON).then(
      async (resp) => (await resp.json()) as xooxle._Index[]
    )
  ).map((index: xooxle._Index) => new xooxle.Index(index));

  new xooxle.Xooxle(indexes, form);
  collapse.addListeners(true);
}

await main();
