/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 *
 * TODO: (#179) We desire to implement highlighting for the Bible as well. Move
 * shared functionality to an external package, and keep Lexicon-specific logic
 * in this file.
 */
import * as css from '../css.js';
import * as d from './dialect.js';
import * as cls from './cls.js';
const STYLE = document.createElement('style');
document.head.appendChild(STYLE);
const SHEET = STYLE.sheet;
const RULE_IDX = SHEET.cssRules.length;
// PARAM is the name of the query parameter holding the set of active dialects.
const PARAM = 'd';
const DELIM = ',';
const CHECKBOXES = Array.from(
  document.querySelector(`table.${cls.VERSES} tr`).querySelectorAll('td')
).map((td) => {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.name = d.DIALECTS.find((dialect) => td.classList.contains(dialect));
  return box;
});
/**
 * Update dialect display.
 */
export function updateDisplay() {
  // Delete the old rule.
  if (RULE_IDX < SHEET.cssRules.length) {
    SHEET.deleteRule(RULE_IDX);
  }
  const inactive = CHECKBOXES.filter((c) => !c.checked).map((c) => c.name);
  if (inactive.length === 0 || inactive.length === CHECKBOXES.length) {
    // If the dialects are all on or all off, don't add a new rule.
    return;
  }
  SHEET.insertRule(
    `${css.classQuery(...inactive)} { display: none; }`,
    RULE_IDX
  );
}
/**
 *
 * @param url
 */
export function setParam(url) {
  const active = CHECKBOXES.filter((c) => c.checked).map((c) => c.name);
  if (!active.length) {
    return;
  }
  url.searchParams.set(PARAM, active.join(DELIM));
}
/**
 * Reset display, and remove the URL fragment if present.
 */
export function reset() {
  CHECKBOXES.forEach((c) => {
    c.checked = false;
  });
  updateDisplay();
  // Remove the URL fragment.
  // NOTE: We only reload when we actually detect an anchor (hash) or text
  // fragment in order to minimize disruption. Reloading the page causes a
  // small jitter.
  // NOTE: `url.hash` doesn't include text fragments (`#:~:text=`),
  // which is why we need to use `performance.getEntriesByType('navigation')`.
  // However, the latter doesn't always work, for some reason. In our
  // experience, it can retrieve the text fragment once, but if you reset and
  // then add a text fragment manually, it doesn't recognize it! This is not a
  // huge issue right now, so we aren't prioritizing fixing it!
  const url = new URL(window.location.href);
  if (
    !url.hash &&
    !performance.getEntriesByType('navigation')[0]?.name.includes('#')
  ) {
    return;
  }
  url.hash = '';
  window.history.replaceState('', '', url.toString());
  // Reload to get rid of the highlighting caused by the hash / fragment,
  // if any.
  window.location.reload();
}
/**
 * Register event listeners.
 */
export function addEventListeners() {
  // A click on a checkbox triggers a dialect display update.
  CHECKBOXES.forEach((checkbox) => {
    checkbox.addEventListener('click', updateDisplay);
  });
}
/**
 *
 */
export function populateBoxes() {
  const url = new URL(window.location.href);
  const active = new Set(
    url.searchParams
      .get(PARAM)
      ?.split(DELIM)
      .map((x) => x) ??
      // If there is no parameters, all dialects are active.
      d.DIALECTS
  );
  CHECKBOXES.forEach((c) => {
    c.checked = active.has(c.name);
  });
  // Delete the URL parameters.
  url.searchParams.delete(PARAM);
  window.history.replaceState('', '', url.toString());
  // Update display.
  updateDisplay();
}
/**
 * @returns
 */
export function form() {
  // TODO: (#179) Use a try on small screens, but feel free to spell out the
  // checkboxes on a larger screen.
  const div = document.createElement('div');
  div.append(
    ...CHECKBOXES.map((box) => {
      const label = document.createElement('label');
      label.append(box, box.name);
      return label;
    })
  );
  div.classList.add(cls.CHECKBOXES);
  return div;
}
