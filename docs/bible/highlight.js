/**
 * Package highlight defines the Crum dialect and developer-mode highlighting.
 */
import * as css from '../css.js';
import * as d from './dialect.js';
import * as cls from './cls.js';
const STYLE = document.createElement('style');
document.head.appendChild(STYLE);
const SHEET = STYLE.sheet;
const RULE_IDX = SHEET.cssRules.length;
// DIALECTS bears the dialects present in this page.
// Each page has a subset of the dialects. For highlighting purposes, only this
// subset is of interest.
// Any verse should contain all the languages in this page.
const DIALECTS = Array.from(
  document.querySelector(`.${cls.VERSE}`).querySelectorAll(`.${cls.LANGUAGE}`)
).map((td) => d.DIALECTS.find((dialect) => td.classList.contains(dialect)));
const CHECKBOXES = DIALECTS.map((dialect) => {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.name = dialect;
  return box;
});
/**
 * Update dialect display.
 */
export function update() {
  const active = d.manager.active();
  // Set checkboxes.
  CHECKBOXES.forEach((c) => {
    c.checked = !!active?.includes(c.name);
  });
  // Delete the old rule.
  if (RULE_IDX < SHEET.cssRules.length) {
    SHEET.deleteRule(RULE_IDX);
  }
  const inactive = DIALECTS.filter((dialect) => !active?.includes(dialect));
  if (inactive.length === 0 || inactive.length === DIALECTS.length) {
    // Dialects are all off or all on. Again, nothing to do!
    return;
  }
  SHEET.insertRule(
    `${css.classQuery(...inactive)} { display: none; }`,
    RULE_IDX
  );
}
/**
 * Register event listeners.
 */
export function addEventListeners() {
  // A click on a checkbox triggers a dialect display update.
  CHECKBOXES.forEach((checkbox) => {
    checkbox.addEventListener('click', () => {
      d.manager.toggle(checkbox.name);
      update();
    });
  });
}
/**
 * @returns
 */
export function form() {
  // TODO: (#179) Use a tray on small screens, but feel free to spell out the
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
