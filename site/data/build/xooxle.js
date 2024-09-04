'use strict';
const searchBox = document.getElementById('searchBox');
const searchButton = document.getElementById('searchButton');
const resultList = document.getElementById('resultList');
class Result {
  constructor(path, title, text) {
    this.path = path;
    this.title = title;
    this.text = text;
  }
  match(query) {
    return this.text.toLowerCase().includes(query.toLowerCase());
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
  const json = await resp.json().then((resp) => resp);
  return Array.from(json)
    .map((dict) => Object.assign(new Result('', '', ''), dict));
})();
function search() {
  const query = searchBox.value.trim();
  if (!query) {
    alert('Please enter a search query');
    return;
  }
  resultList.innerHTML = '';
  void fileMap.then((results) => {
    let found = false;
    results.filter((res) => res.match(query)).forEach((res) => {
      found = true;
      const li = document.createElement('li');
      li.innerHTML = `<a href="${res.path}#:~:text=${query}">${res.path.replace('.html', '')}</a> ${res.title}`;
      resultList.appendChild(li);
    });
    if (found) {
      return;
    }
    const li = document.createElement('li');
    li.innerHTML = 'No matching files found';
    resultList.appendChild(li);
    return;
  });
}
searchButton.addEventListener('click', search);
searchBox.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchButton.click();
  }
});
