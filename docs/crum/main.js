import * as xooxle from '../xooxle.js';
import * as collapse from '../collapse.js';
const XOOXLES = ['crum.json', 'kellia.json', 'copticsite.json'];
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
    XOOXLES.map(async (url) => new xooxle.Xooxle(await xooxle.index(url), form))
  );
  collapse.addListeners(true);
}
await main();
