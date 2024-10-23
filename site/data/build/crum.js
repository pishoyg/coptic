'use strict';
const sheet = window.document.styleSheets[0];
const HOME = 'http://remnqymi.com/';
const spellingRuleIndex = sheet.cssRules.length;
const undialectedRuleIndex = sheet.cssRules.length + 1;
const punctuationRuleIndex = sheet.cssRules.length + 2;
function addOrReplaceRule(index, rule) {
  if (index < sheet.cssRules.length) {
    sheet.deleteRule(index);
  }
  sheet.insertRule(rule, index);
}
function updateDialectCSS(active) {
  const query = active === null ? '' : active.map((d) => `.${d}`).join(',');
  addOrReplaceRule(spellingRuleIndex, query
    ? `.spelling:not(${query}), .dialect:not(${query}) {opacity: 0.3;}`
    : `.spelling, .dialect {opacity: ${String(active === null ? 1.0 : 0.3)};}`);
  addOrReplaceRule(undialectedRuleIndex, `.spelling:not(.S,.Sa,.Sf,.A,.sA,.B,.F,.Fb,.O,.NH,.Ak,.M,.L,.P,.V,.W,.U) { opacity: ${String(active === null || query !== '' ? 1.0 : 0.3)}; }`);
  addOrReplaceRule(punctuationRuleIndex, `.dialect-parenthesis, .dialect-comma, .spelling-comma, .type { opacity: ${String(active === null ? 1.0 : 0.3)}; }`);
}
const dialectCheckboxes = document.querySelectorAll('.dialect-checkbox');
// When we first load the page, 'd' dictates the set of active dialects and
// hence highlighting. We load 'd' from the local storage, and we update the
// boxes to match this set. Then we update the CSS.
window.addEventListener('pageshow', () => {
  const d = localStorage.getItem('d');
  const active = d === null ? null : d === '' ? [] : d.split(',');
  Array.from(dialectCheckboxes).forEach((box) => {
    box.checked = active?.includes(box.name) ?? false;
  });
  updateDialectCSS(active);
});
// When we click a checkbox, it is the boxes that dictate the set of active
// dialects and highlighting. So we use the boxes to update 'd', and then
// update highlighting.
dialectCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('click', () => {
    const active = Array.from(dialectCheckboxes)
      .filter((box) => box.checked)
      .map((box) => box.name);
    localStorage.setItem('d', active.join(','));
    updateDialectCSS(active);
  });
});
function reset(event) {
  localStorage.removeItem('d');
  dialectCheckboxes.forEach((box) => { box.checked = false; });
  updateDialectCSS(null);
  // Prevent clicking the button from submitting the form, thus resetting
  // everything!
  event.preventDefault();
}
document.getElementById('reset').addEventListener('click', reset);
// Collapse logic.
Array.prototype.forEach.call(document.getElementsByClassName('collapse'), (collapse) => {
  collapse.addEventListener('click', function () {
    // TODO: Remove the dependency on the HTML structure.
    const collapsible = collapse.nextElementSibling;
    collapsible.style.maxHeight = collapsible.style.maxHeight ? '' : collapsible.scrollHeight.toString() + 'px';
  });
  collapse.click();
});
const dialectSingleChar = {
  'N': 'NH',
  'a': 'Sa',
  'f': 'Sf',
  's': 'sA',
  'b': 'Fb',
  'k': 'Ak',
};
document.addEventListener('keyup', (e) => {
  switch (e.key) {
  // Commands:
  case 'r':
    reset(e);
    break;
  case 'd':
    localStorage.setItem('dev', localStorage.getItem('dev') === 'true' ? 'false' : 'true');
    break;
  case 'h':
    window.open(HOME, '_self');
    break;
  case '?':
    togglePanel();
    break;
  case 'Escape':
    togglePanel(false);
    break;
    // Search panel:
  case '/':
    focus('searchBox');
    break;
  case 'w':
    click('fullWordCheckbox');
    break;
  case 'e':
    click('regexCheckbox');
    break;
    // Dialects:
  case 'B':
  case 'S':
  case 'A':
  case 'F':
  case 'O':
  case 'N':
  case 'a':
  case 'f':
  case 's':
  case 'b':
  case 'k':
  case 'M':
  case 'L':
  case 'P':
  case 'V':
  case 'W':
  case 'U':
    click(`checkbox-${dialectSingleChar[e.key] ?? e.key}`);
    break;
    // Scrolling:
  case 'C':
    scroll('crum-title');
    break;
  case 'K':
    scroll('kellia-title');
    break;
  case 'T':
    scroll('copticsite-title');
    break;
  }
});
function scroll(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
function click(id) {
  document.getElementById(id).click();
}
function focus(id) {
  document.getElementById(id)?.focus();
}
function togglePanel(visible) {
  // TODO: (#274) Implement!
  console.log(visible);
}
