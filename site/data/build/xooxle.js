'use strict';
const searchBox = document.getElementById('searchBox');
const searchButton = document.getElementById('searchButton');
const resultList = document.getElementById('resultList');
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
      if (!match) {
        return null;
      }
      if (fullWord) {
        return match[0];
      }
      return this.getMatchFullWords(match[0]);
    }
    catch (e) {
      console.error('Invalid regular expression:', e);
      return null;
    }
  }
  getMatchFullWords(match) {
    const matchStart = this.text.indexOf(match);
    if (matchStart === -1) {
      return match;
    }
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
    resp = new Response('[{"path": "1.html", "title": "ⲟⲩⲱⲓⲛⲓ", "text": "light" }]');
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
    resultList.innerHTML = '';
    return;
  }
  const results = await fileMap;
  resultList.innerHTML = '';
  let found = false;
  for (const res of results) {
    if (abortController.signal.aborted) {
      return;
    }
    const matchedWord = res.match(query, fullWord, useRegex);
    if (!matchedWord) {
      continue;
    }
    found = true;
    const li = document.createElement('li');
    li.innerHTML = `<a href="${res.path}#:~:text=${encodeURIComponent(matchedWord)}">
      ${res.path.replace('.html', '')}</a> ${res.title}`;
    resultList.appendChild(li);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (!found && !abortController.signal.aborted) {
    const li = document.createElement('li');
    li.innerHTML = 'No matching files found.';
    resultList.appendChild(li);
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
