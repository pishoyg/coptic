'use strict';
const searchBox = document.getElementById('searchBox');
const searchButton = document.getElementById('searchButton');
const resultTable = document.getElementById('resultList').querySelector('tbody');
const fullWordCheckbox = document.getElementById('fullWordCheckbox');
const regexCheckbox = document.getElementById('regexCheckbox');
class Result {
  match(query, fullWord, useRegex) {
    if (!useRegex) {
      query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (fullWord) {
      query = `\\b${query}\\b`;
    }
    try {
      const regex = new RegExp(query, 'i');
      const match = this.text.match(regex);
      if ((match === null || match === void 0 ? void 0 : match.index) === undefined) {
        return [null, null];
      }
      const word = fullWord ? match[0] :
        this.getMatchFullWords(match.index, match[0]);
      const matchedLines = [];
      this.text.split('\n').forEach((line) => {
        const match = line.match(regex);
        if ((match === null || match === void 0 ? void 0 : match.index) === undefined) {
          return;
        }
        const highlightedLine = line.replace(match[0], `<span style="background-color: #f0d4fc;">${match[0]}</span>`);
        matchedLines.push(highlightedLine);
      });
      return [word, matchedLines.join('<br>')];
    }
    catch (e) {
      console.error('Invalid regular expression:', e);
      return [null, null];
    }
  }
  getMatchFullWords(matchStart, match) {
    let start = matchStart;
    let end = matchStart + match.length;
    while (start > 0 && !/\W/.test(this.text[start - 1])) {
      start--;
    }
    while (end < this.text.length && !/\W/.test(this.text[end])) {
      end++;
    }
    return this.text.substring(start, end);
  }
}
const fileMap = (async function () {
  let resp;
  try {
    resp = await fetch('index.json', { mode: 'cors' });
  }
  catch {
    resp = new Response('[{"path": "1.html", "title": "ⲟⲩⲱⲓⲛⲓ", "text": "light\\nman of light" }]');
  }
  return (await resp.json()).map((obj) => Object.assign(new Result(), obj));
})();
let currentAbortController = null;
async function search() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  const abortController = new AbortController();
  currentAbortController = abortController;
  const query = searchBox.value.trim();
  const fullWord = fullWordCheckbox.checked;
  const useRegex = regexCheckbox.checked;
  if (!query) {
    resultTable.innerHTML = '';
    return;
  }
  const results = await fileMap;
  resultTable.innerHTML = '';
  let found = false;
  for (const res of results) {
    if (abortController.signal.aborted) {
      return;
    }
    const [matchedWord, matchedLines] = res.match(query, fullWord, useRegex);
    console.log(matchedLines);
    if (matchedWord === null || matchedLines === null) {
      continue;
    }
    found = true;
    const row = document.createElement('tr');
    const pathCell = document.createElement('td');
    const titleCell = document.createElement('td');
    const linesCell = document.createElement('td');
    pathCell.innerHTML = `<a href="${res.path}#:~:text=${encodeURIComponent(matchedWord)}">
      ${res.path.replace('.html', '')}</a>`;
    titleCell.innerHTML = res.title;
    linesCell.innerHTML = matchedLines;
    row.appendChild(pathCell);
    row.appendChild(titleCell);
    row.appendChild(linesCell);
    resultTable.appendChild(row);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (!found && !abortController.signal.aborted) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.setAttribute('colspan', '2');
    cell.textContent = 'No matching files found.';
    row.appendChild(cell);
    resultTable.appendChild(row);
  }
}
function handleSearchClick() {
  void search();
}
searchButton.addEventListener('click', handleSearchClick);
searchBox.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchButton.click();
  }
});
