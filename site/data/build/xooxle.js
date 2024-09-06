'use strict';
const searchBox = document.getElementById('searchBox');
const resultTable = document.getElementById('resultList').querySelector('tbody');
const fullWordCheckbox = document.getElementById('fullWordCheckbox');
const regexCheckbox = document.getElementById('regexCheckbox');
class Result {
  // TODO: (#229) Return the matching text in context, not just the text on its
  // own.
  match(query, fullWord, useRegex) {
    if (!useRegex) {
      // Escape all the special characters in the string, in order to search
      // for raw matches.
      query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (fullWord) {
      query = `\\b${query}\\b`;
    }
    try {
      const regex = new RegExp(query, 'i'); // Case-insensitive.
      const match = this.text.match(regex);
      if ((match === null || match === void 0 ? void 0 : match.index) === undefined) {
        return [null, null];
      }
      // With `fullWord`, we already force matching to be restricted to full
      // words, so there is nothing that we need to do expand our match to fall
      // on word boundaries, it's already the case.
      // Otherwise, we have to expand our boundaries.
      const word = fullWord ? match[0] :
        this.getMatchFullWords(match.index, match[0]);
      const matchedLines = [];
      this.text.split('\n').forEach((line) => {
        // TODO: (#229) It's possible for several matches, not necessarily
        // containing the same text, to be present on the one line.
        const match = line.match(regex);
        if ((match === null || match === void 0 ? void 0 : match.index) === undefined) {
          return;
        }
        // Highlight the matched text by wrapping it in a span with a light
        // purple background.
        const highlightedLine = line.replace(match[0], `<span style="background-color: #f0d4fc;">${match[0]}</span>`);
        matchedLines.push(highlightedLine);
      });
      return [word, matchedLines.join('<br>')];
    }
    catch {
      alert('Invalid regular expression');
      return [null, null];
    }
  }
  getMatchFullWords(matchStart, match) {
    let start = matchStart;
    let end = matchStart + match.length;
    // Expand left: Move the start index left until a word boundary is found.
    while (start > 0 && !/\W/.test(this.text[start - 1])) {
      start--;
    }
    // Expand right: Move the end index right until a word boundary is found.
    while (end < this.text.length && !/\W/.test(this.text[end])) {
      end++;
    }
    // Return the expanded substring.
    return this.text.substring(start, end);
  }
}
// Load the JSON file as a Promise that will resolve once the data is fetched.
const fileMap = (async function () {
  let resp;
  try {
    resp = await fetch('index.json', { mode: 'cors' });
  }
  catch {
    // If fetch fails (e.g., due to CORS issues), return dummy data.
    const dummy = [
      {
        'path': '1.html',
        'title': 'ⲟⲩⲟⲉⲓⲛ, ⲟⲩⲁⲓⲛⲉ, ⲟⲩⲁⲉⲓⲛⲉ, ⲟⲩⲁⲉⲓⲛ, ⲟⲩⲱⲓⲛⲓ, ⲟⲩⲟⲓⲛ, ⲟⲩⲟⲉⲓⲛⲉ',
        'text': '(S) ⲟⲩⲟⲉⲓⲛ (ⲡ)\n(A, sA) ⲟⲩⲁⲓⲛⲉ,\nⲟⲩⲁⲉⲓⲛⲉ\n(ⲡ)\n(Sa, sA, F) ⲟⲩⲁⲉⲓⲛ (ⲡ)\n(B) ⲟⲩⲱⲓⲛⲓ (ⲡ)\n(O) ⲟⲩⲟⲓⲛ (ⲡ)\n(NH)\nⲟⲩⲟⲉⲓⲛⲉ\n(ⲡ)\n(noun male)\nlight [φωσ, φωτισμοσ]\ndawn [ανατολη, ορθροσ]\nlight of eyes\nas adj [φωτεινοσ]\nlight\ndawn\nlight (of eyes)\n(S) ⲟⲩⲟⲉⲓⲛ\n(A, sA) ⲟⲩⲁ(ⲉ)ⲓⲛⲉ\n(Sa, sA, F) ⲟⲩⲁⲉⲓⲛ\n(B) ⲟⲩⲱⲓⲛⲓ\n(O) ⲟⲩⲟⲓⲛ\n(NH)\nⲟⲩⲟⲉⲓⲛⲉ\n{ext codex XIII - Trimorphic Protennoia; 158; 36;\n32; ⲟⲩⲟⲉⲓⲛⲉ ⲡⲉ\nⲉϥϣⲟⲟⲡ ϩⲛ\nⲟⲩⲟⲉⲓⲛⲉ; Ext}, {codex II - The Apocryphon of\nJohn; 106; 4; 9; ⲉϥϯ ⲙⲡⲟⲩⲟⲉⲓⲛⲉ ⲛⲁⲧϣⲓⲧϥ;\nExt}\nⲁⲧⲟⲩ., ⲁⲑⲟⲩ.\nwithout light [αωρια]\nCrum:\n(S, sA)\nⲣⲙⲛⲟⲩ.\n(NH)\nⲣⲙⲟⲩ.\nman of, dweller in light\n(S, A, B, F)\nⲣ\nⲟⲩ., ⲉⲣ ⲟⲩ., ⲉⲗ ⲟⲩ.\nmake, be light, shine\nWith prep or advb:\nⲉϫⲛ- (c)\n(B)\nϩⲓϫⲉⲛ-\n(c)\n(B)\nⲛ-\n(c)\n(S)\nⲉⲃⲟⲗ\n(c)\nⲣⲉϥⲣ ⲟⲩ.\none who lights, illuminator\n[φωστηρ]\nϭⲓⲛⲣ ⲟⲩ.,\nϫⲓⲛⲉⲣ ⲟⲩ.\nshining, illumination\nCrum:\n(B)\nϯ ⲟⲩ.\ngive light [φωτιζειν]\nϫⲓ ⲟⲩ.,\nϭⲓ ⲟⲩ.\ntake, get light\n(sA)\nⲧⲣⲟⲩ.\n(verb)\nshine'
      },
      {
        'path': '2.html',
        'title': 'ϯ, ⲧⲓ, ϯⲓ, ϯⲉⲓ, ⲧⲉⲓ, ⲧⲛ, ⲧⲉ, ϯ-, ⲧⲉ-, ⲧⲁ-, ⲧⲁ=, ⲧⲁⲁ=, ϯ=, ⲧⲉⲉ=, ⲧⲉⲉⲧ=,\n  ⲧⲉ=, ⲧⲉⲉⲓⲧ=, ⲧⲏⲓ=, ⲧⲏⲓⲧ=, ⲧⲉⲓ=, ⲧⲉⲓⲉⲓ=, ⲧⲉⲓⲧ=, ⲧⲁⲓⲧ= {and other irregular\n  S,Sa,F forms}, ⲧⲟ+, ⲧⲱ+, ⲧⲁ+, ⲧⲉⲓⲉ+, ⲧⲉ+, ⲧⲟⲉⲓⲉ+, ⲧⲟⲓ+, ⲧⲁⲓ+, ⲧⲁⲁⲓ+, ⲧⲁⲁⲓⲉ+,\n  ⲧⲁⲓ-, ⲙⲁ, ⲙⲟⲓ, ⲙⲁⲓ, ⲙⲁ-, ⲙⲁⲧ=, ⲙⲏⲉⲓ=, ⲙⲏⲓ=, ⲙⲏⲓⲧ=, ⲙⲟⲓⲧ=, ⲙⲁⲓ=, ⲙⲁ=',
        'text': '(S, A, sA, B, F) ϯ\n(S, F) ⲧⲓ\n(S) ϯⲓ, ϯⲉⲓ,\nⲧⲉⲓ, ⲧⲛ\n(A) ⲧⲉ\n(S, B, F) ϯ-\n(A, F) ⲧⲉ-\n(F) ⲧⲁ-\n(S) ⲧⲁ=, ⲧⲁⲁ=,\nϯ=\n(A, sA, F) ⲧⲉⲉ=\n(A, sA) ⲧⲉⲉⲧ=\n(A) ⲧⲉ=\n(sA, F) ⲧⲉⲉⲓⲧ=\n(B) ⲧⲏⲓ=, ⲧⲏⲓⲧ=\n(F) ⲧⲉⲓ=, ⲧⲉⲓⲉⲓ=,\nⲧⲉⲓⲧ=,\nⲧⲁⲓⲧ= {and other\nirregular S,Sa,F forms}\n(S) ⲧⲟ+, ⲧⲱ+\n(Sf)\nⲧⲁ+\n(A) ⲧⲉⲓⲉ+, ⲧⲉ+\n(sA)\nⲧⲟⲉⲓⲉ+\n(B) ⲧⲟⲓ+\n(F) ⲧⲁⲓ+, ⲧⲁⲁⲓ+,\nⲧⲁⲁⲓⲉ+\n(S, sA, F) ⲧⲁⲓ- (p.c.)\n(S, A, sA) ⲙⲁ (imp.)\n(B) ⲙⲟⲓ (imp.)\n(F) ⲙⲁⲓ (imp.)\n(S, B, F) ⲙⲁ- (imp.)\n(S) ⲙⲁⲧ=, ⲙⲏⲉⲓ= (imp.)\n(B) ⲙⲏⲓ=, ⲙⲏⲓⲧ=,\nⲙⲟⲓⲧ=\n(imp.)\n(F) ⲙⲁⲓ= (imp.)\n(NH)\nⲙⲁ=\n(imp.)\n(verb)\nintr:\n― give, pay & related meanings [διδοναι]\n― fight\ntr:\n― mostly c dat\n― pay\n― sell S\n― smite [τυπτειν]\nimperative\n― with ϯ\n― not as imperative B\n― ϫⲓⲛⲙ.\nqual: given, being upon\np.c., giver\n(S, A, sA, B, F) ϯ\n(S, F) ⲧⲓ\n(S) ϯⲓ, ϯⲉⲓ,\nⲧⲉⲓ, ⲧⲛ\n(A) ⲧⲉ\n(S, B, F) ϯ-\n(A, F) ⲧⲉ-\n(F) ⲧⲁ-\n(S) ⲧⲁ(ⲁ)=,\nϯ=\n(A, sA, F) ⲧⲉⲉ=\n(A, sA) ⲧⲉⲉⲧ=\n(A) ⲧⲉ=\n(sA, F) ⲧⲉⲉⲓⲧ=\n(B) ⲧⲏⲓ=, ⲧⲏⲓⲧ=\n(F) ⲧⲉⲓ=, ⲧⲉⲓⲉⲓ=,\nⲧⲉⲓⲧ=,\nⲧⲁⲓⲧ= {and other\nirregular S,Sa,F forms}\n(S) ⲧⲟ+, ⲧⲱ+\n(Sf)\nⲧⲁ+\n(A) ⲧⲉⲓⲉ+, ⲧⲉ+\n(sA)\nⲧⲟⲉⲓⲉ+\n(B) ⲧⲟⲓ+\n(F) ⲧⲁ(ⲁ)ⲓ+, ⲧⲁⲁⲓⲉ+\n(S, sA, F) p c\nⲧⲁⲓ-\n(S, A, sA) imperative: ⲙⲁ\n(B) imperative: ⲙⲟⲓ\n(F) imperative: ⲙⲁⲓ\n(S, B, F) imperative: ⲙⲁ-\n(S) imperative: ⲙⲁⲧ=,\nⲙⲏⲉⲓ=\n(B) imperative: ⲙⲏⲓ=,\nⲙⲏⲓⲧ=,\nⲙⲟⲓⲧ=\n(F) imperative: ⲙⲁⲓ=\n(NH)\nimperative: ⲙⲁ= {ext codex II - The\nGospel of Thomas; 107; 49; 31; ⲡⲉⲧⲉ\nⲡⲱⲉⲓ ⲡⲉ\nⲙⲁⲧⲛⲛⲁⲉⲓϥ; Ext}\nWith following\npreposition:\nCrum:\n(S,\nA,\nsA,\nB,\nF) ―\nⲉ-\nintr: [δανιζειν]\ntr: give to\n(S)\n― ⲉⲣⲛ-\ngo toward\nCrum:\n(S, sA, B)\n― ⲉⲧⲛ-\n{ⲉⲧⲟⲟⲧ= ⲛ-}\nintr: lay upon, command\ntr: give into hands, entrust\n(S, B)\n― ⲉϫⲛ-\nput upon, add to, on behalf of\n― tr:\n― intr:\npay for\nfight for\n(S, B)\n― ⲙⲛ-,\n― ⲛⲉⲙ-\nfight with [πολεμειν, ανθισταναι]\n(S, sA, B)\n― ⲛⲥⲁ-\nintr: go after, pursue\ntr: give to, upon, pursue\nCrum:\n(S, sA, B)\n― ⲛⲧⲛ-\nentrust to\nsupport\ngive in, decrease\n(S,\nA,\nsA,\nB,\nF) ―\nⲟⲩⲃⲉ-\nfight against [πολεμειν, ανθισταναι,\nαντικεισθαι]\n(S)\nⲁⲧϯ ⲟⲩⲃⲉ.\nnot to be opposed\n(B)\nⲣⲉϥϯ ⲟⲩⲃⲉ.\nopponent\n(B)\nⲙⲉⲧⲣⲉϥϯ\nⲟⲩⲃⲉ.\nopposition\n(S, B, F)\n― ϩⲁ-,\n― ϧⲁ-\ngive, sell for\nas nn S\n(S, A, B)\n― ϩⲓ-\n(Sf, F)\n― ⲉϩⲓ-\nlay upon, clothe [περιβαλλειν]\nfight for\n(S)\n― ϩⲁⲧⲛ-\nCrum:\n(S, B, F)\n― ϩⲓϫⲛ-\nintr: give for, on behalf of\n(?)\ntr: put upon\nWith following adverb:\n(S,\nA,\nsA,\nB,\nF) ―\nⲉⲃⲟⲗ\nintr: give forth, away, sell\n[πωλειν, πιπρασκειν]\ntr: [πωλειν, πιπρασκειν]\nas nn, sale\n{ⲉⲃⲟⲗ} ⲉ- (c)\nsell for, as\nto\nset, put forth upon\n{ⲉⲃⲟⲗ} ϩⲁ-,\n{ⲉⲃⲟⲗ} ϧⲁ- (c)\nfor, against\n{ⲉⲃⲟⲗ} ϩⲓϫⲛ- (c)\nfight on behalf of\nⲣⲉϥϯ ⲉⲃⲟⲗ.\nseller\n(S, B)\n― ⲉⲡⲉⲥⲏⲧ\nput, send downward [καταβαλλειν]\nCrum:\n(B)\n― ⲉⲡϣⲱⲓ\nraise up\n(S, A)\n― ⲉⲡⲁϩⲟⲩ\ngo backward\n(S)\n― ⲉⲑⲏ\ngo forward, progress\n(S,\nA,\nsA,\nB,\nF) ―\nⲉϩⲟⲩⲛ\ngive, hand in\n{ⲉϩⲟⲩⲛ} ⲉ- (c)\ninto\n{ⲉϩⲟⲩⲛ} ⲛⲥⲁ- (c)\n{ⲉϩⲟⲩⲛ} ⲛⲁϩⲣⲛ- (c)\nrespond to\n{ⲉϩⲟⲩⲛ} ϩⲁ- (c)\nplace beneath\n(S)\n{ⲉϩⲟⲩⲛ}\nϩⲛ- (c)\n(A)\n{ⲉϩⲟⲩⲛ}\nϩⲁⲛ- (c)\n(B)\n{ⲉϩⲟⲩⲛ}\nϧⲉⲛ- (c)\nstrike into, upon\n{ⲉϩⲟⲩⲛ} ⲉϩⲣⲛ- (c)\nstrike against, oppose\n(B)\nⲣⲉϥϯ ⲉϧⲟⲩⲛ ⲉϩⲣⲛ-\nopposer\nCrum:\n(S,\nA,\nsA,\nB,\nF) ―\nⲉϩⲣⲁⲓ\n(B)\n― ⲉϧⲣⲁⲓ\nsend up, in, lay down\n― intr: S\n― tr: [επιβαλλειν]\nintr :\n{ⲉϩⲣⲁⲓ} ⲉ- (c)\n{ⲉϩⲣⲁⲓ} ⲙⲛ- (c)\ntr :\n{ⲉϩⲣⲁⲓ} ⲉ- (c)\nlift up, commit to\n{ⲉϩⲣⲁⲓ} ϩⲁ- (c)\n(S, B)\nϫⲓ ϯ,\nϭⲓ ϯ\n(verb)\nas one vb, buy and sell, trade\n(S, A, B)\n― (ⲡ)\n(noun male)\ngift, bonuty [δομα, δοσισ]\nsale [πρασισ]\nfight [μαχη]\nparal ϫⲓ, ϭⲓ, exchange, trading\n(B)\nⲙⲁ ⲛϯ\nfighting place\nCrum:\n(S, B)\nⲣⲉϥϯ\ngiver [δοτησ]\nfighter [μαχητησ, πολεμιστησ]\nⲙⲛⲧⲣⲉϥϯ, ⲙⲉⲧⲣⲉϥϯ\ngenerosity, charity\nⲣ ⲣⲉϥϯ,\nⲉⲣ ⲣⲉϥϯ\nbe giver\nϭⲓⲛϯ, ϫⲓⲛϯ\ngiving, selling\nfighting B'
      },
    ];
    resp = new Response(JSON.stringify(dummy));
  }
  return (await resp.json()).map((obj) => Object.assign(new Result(), obj));
})();
// Event listener for the search button.
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
    resultTable.innerHTML = ''; // Clear previous results.
    return;
  }
  const results = await fileMap;
  resultTable.innerHTML = ''; // Clear previous results.
  let found = false;
  for (const res of results) {
    if (abortController.signal.aborted) {
      return;
    }
    const [matchedWord, matchedLines] = res.match(query, fullWord, useRegex);
    if (matchedWord === null || matchedLines === null) {
      continue;
    }
    found = true;
    // Create a new row for the table
    const row = document.createElement('tr');
    const titleCell = document.createElement('td');
    const linesCell = document.createElement('td');
    const viewCell = document.createElement('td');
    titleCell.innerHTML = res.title;
    linesCell.innerHTML = matchedLines;
    viewCell.innerHTML = `<a href="${res.path}#:~:text=${encodeURIComponent(matchedWord)}">
      view</a>`;
    row.appendChild(titleCell);
    row.appendChild(linesCell);
    row.appendChild(viewCell);
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
let debounceTimeout = null;
function handleSearchQuery() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    // Call the async function after the timeout.
    // Use void to ignore the returned promise.
    void search();
  }, 100);
}
searchBox.addEventListener('input', handleSearchQuery);
searchBox.addEventListener('keypress', handleSearchQuery);
fullWordCheckbox.addEventListener('click', handleSearchQuery);
fullWordCheckbox.addEventListener('click', handleSearchQuery);
