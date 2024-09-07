const searchBox = document.getElementById('searchBox') as HTMLInputElement;
const fullWordCheckbox = document.getElementById('fullWordCheckbox') as HTMLInputElement;
const regexCheckbox = document.getElementById('regexCheckbox') as HTMLInputElement;
const resultTable = document.getElementById('resultTable')!.querySelector('tbody')!;

const HIGHLIGHT_COLOR = '#f0d4fc';

// TODO: (#229) Use a smarter heuristic to show context. Instead of splitting
// into lines, split into meaningful search units.
class Result {
  readonly path: string;
  readonly text: string;
  readonly fields: Record<string, string>;
  public constructor(
    path: string, text: string, fields: Record<string, string>) {
    this.path = path;
    this.text = text;
    this.fields = fields;
  }

  match(query: string, fullWord: boolean, useRegex: boolean):
    [string | null, string | null] {
    if (!useRegex) {
      // Escape all the special characters in the string, in order to search
      // for raw matches.
      query = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (fullWord) {
      // Using Unicode-aware word boundaries: `\b` doesn't work for non-ASCII
      // so we use `\p{L}` (letter) and `\p{N}` (number) to match words in any
      // Unicode script.
      query = `(?<=^|[^\\p{L}\\p{N}])${query}(?=$|[^\\p{L}\\p{N}])`;
    }
    try {
      // NOTE: We can't use the `g` flag (for global) to retrieve all regex
      // matches, because there are some limitations regarding supporting
      // regular expressions using both `u` and `g` flags.
      const regex = new RegExp(query, 'iu'); // Case-insensitive and Unicode-aware.
      const match = this.text.match(regex);
      if (match?.index === undefined) {
        return [null, null];
      }
      // With `fullWord`, we already force matching to be restricted to full
      // words, so there is nothing that we need to do expand our match to fall
      // on word boundaries, it's already the case.
      // Otherwise, we have to expand our boundaries.
      const word = fullWord ? match[0] :
        this.getMatchFullWords(match.index, match[0]);

      const matchedLines: string[] = [];
      this.text.split('\n').forEach((line: string) => {
        const highlightedLine = this.highlightAllMatches(line, regex);
        if (highlightedLine === line) {
          return;
        }
        matchedLines.push(highlightedLine);
      });
      return [word, matchedLines.join('<hr color="#E0E0E0">')];
    } catch {
      alert('Invalid regular expression');
      return [null, null];
    }
  }

  highlightAllMatches(line: string, regex: RegExp): string {
    let result = '';
    let match;

    // Loop through all matches in the line
    while ((match = regex.exec(line)) !== null) {
      // Append the text before the match and the highlighted match
      result += line.substring(0, match.index);
      result += `<span style="background-color: ${HIGHLIGHT_COLOR};">${match[0]}</span>`;

      // Trim the already processed part of the line
      line = line.substring(match.index + match[0].length);
    }

    // Append the remaining part of the line after the last match
    result += line;
    return result;
  }

  getMatchFullWords(matchStart: number, match: string): string {
    let start = matchStart;
    let end = matchStart + match.length;

    // Unicode-aware boundary expansion
    const isWordChar = (char: string) => /\p{L}|\p{N}/u.test(char);

    // Expand left: Move the start index left until a word boundary is found.
    while (start > 0 && isWordChar(this.text[start - 1]!)) {
      start--;
    }

    // Expand right: Move the end index right until a word boundary is found.
    while (end < this.text.length && isWordChar(this.text[end]!)) {
      end++;
    }

    // Return the expanded substring.
    return this.text.substring(start, end);
  }
}

// Load the JSON file as a Promise that will resolve once the data is fetched.
const fileMap: Promise<Result[]> = (async function(): Promise<Result[]> {
  let resp: Response;
  try {
    resp = await fetch('xooxle.json', { mode: 'cors' });
  } catch {
    // If fetch fails (e.g., due to CORS issues), return dummy data.
    const dummy = [
      {
        'path': '2.html',
        'marcion': '(S, A, sA, B, F) ϯ\n(S, F) ⲧⲓ\n(S) ϯⲓ, ϯⲉⲓ, ⲧⲉⲓ, ⲧⲛ\n(A) ⲧⲉ\n(S, B, F) ϯ-\n(A, F) ⲧⲉ-\n(F) ⲧⲁ-\n(S) ⲧⲁ(ⲁ)=, ϯ=\n(A, sA, F) ⲧⲉⲉ=\n(A, sA) ⲧⲉⲉⲧ=\n(A) ⲧⲉ=\n(sA, F) ⲧⲉⲉⲓⲧ=\n(B) ⲧⲏⲓ=, ⲧⲏⲓⲧ=\n(F) ⲧⲉⲓ=, ⲧⲉⲓⲉⲓ=, ⲧⲉⲓⲧ=, ⲧⲁⲓⲧ= {and other irregular S,Sa,F forms}\n(S) ⲧⲟ+, ⲧⲱ+\n(Sf) ⲧⲁ+\n(A) ⲧⲉⲓⲉ+, ⲧⲉ+\n(sA) ⲧⲟⲉⲓⲉ+\n(B) ⲧⲟⲓ+\n(F) ⲧⲁ(ⲁ)ⲓ+, ⲧⲁⲁⲓⲉ+\n(S, sA, F) p c ⲧⲁⲓ-\n(S, A, sA) imperative: ⲙⲁ\n(B) imperative: ⲙⲟⲓ\n(F) imperative: ⲙⲁⲓ\n(S, B, F) imperative: ⲙⲁ-\n(S) imperative: ⲙⲁⲧ=, ⲙⲏⲉⲓ=\n(B) imperative: ⲙⲏⲓ=, ⲙⲏⲓⲧ=, ⲙⲟⲓⲧ=\n(F) imperative: ⲙⲁⲓ=\n(NH) imperative: ⲙⲁ=',
        'meaning': 'intr:\n― give, pay & related meanings [διδοναι]\n― fight\ntr:\n― mostly c dat\n― pay\n― sell S\n― smite [τυπτειν]\nimperative\n― with ϯ\n― not as imperative B\n― ϫⲓⲛⲙ.\nqual: given, being upon\np.c., giver',
        'text': '(S, A, sA, B, F) ϯ\n(S, F) ⲧⲓ\n(S) ϯⲓ, ϯⲉⲓ, ⲧⲉⲓ, ⲧⲛ\n(A) ⲧⲉ\n(S, B, F) ϯ-\n(A, F) ⲧⲉ-\n(F) ⲧⲁ-\n(S) ⲧⲁ=, ⲧⲁⲁ=, ϯ=\n(A, sA, F) ⲧⲉⲉ=\n(A, sA) ⲧⲉⲉⲧ=\n(A) ⲧⲉ=\n(sA, F) ⲧⲉⲉⲓⲧ=\n(B) ⲧⲏⲓ=, ⲧⲏⲓⲧ=\n(F) ⲧⲉⲓ=, ⲧⲉⲓⲉⲓ=, ⲧⲉⲓⲧ=, ⲧⲁⲓⲧ= {and other irregular S,Sa,F forms}\n(S) ⲧⲟ+, ⲧⲱ+\n(Sf) ⲧⲁ+\n(A) ⲧⲉⲓⲉ+, ⲧⲉ+\n(sA) ⲧⲟⲉⲓⲉ+\n(B) ⲧⲟⲓ+\n(F) ⲧⲁⲓ+, ⲧⲁⲁⲓ+, ⲧⲁⲁⲓⲉ+\n(S, sA, F) ⲧⲁⲓ- (p.c.)\n(S, A, sA) ⲙⲁ (imp.)\n(B) ⲙⲟⲓ (imp.)\n(F) ⲙⲁⲓ (imp.)\n(S, B, F) ⲙⲁ- (imp.)\n(S) ⲙⲁⲧ=, ⲙⲏⲉⲓ= (imp.)\n(B) ⲙⲏⲓ=, ⲙⲏⲓⲧ=, ⲙⲟⲓⲧ= (imp.)\n(F) ⲙⲁⲓ= (imp.)\n(NH) ⲙⲁ= (imp.)\n(verb)\nintr:\n― give, pay & related meanings [διδοναι]\n― fight\ntr:\n― mostly c dat\n― pay\n― sell S\n― smite [τυπτειν]\nimperative\n― with ϯ\n― not as imperative B\n― ϫⲓⲛⲙ.\nqual: given, being upon\np.c., giver\n(S, A, sA, B, F) ϯ\n(S, F) ⲧⲓ\n(S) ϯⲓ, ϯⲉⲓ, ⲧⲉⲓ, ⲧⲛ\n(A) ⲧⲉ\n(S, B, F) ϯ-\n(A, F) ⲧⲉ-\n(F) ⲧⲁ-\n(S) ⲧⲁ(ⲁ)=, ϯ=\n(A, sA, F) ⲧⲉⲉ=\n(A, sA) ⲧⲉⲉⲧ=\n(A) ⲧⲉ=\n(sA, F) ⲧⲉⲉⲓⲧ=\n(B) ⲧⲏⲓ=, ⲧⲏⲓⲧ=\n(F) ⲧⲉⲓ=, ⲧⲉⲓⲉⲓ=, ⲧⲉⲓⲧ=, ⲧⲁⲓⲧ= {and other irregular S,Sa,F forms}\n(S) ⲧⲟ+, ⲧⲱ+\n(Sf) ⲧⲁ+\n(A) ⲧⲉⲓⲉ+, ⲧⲉ+\n(sA) ⲧⲟⲉⲓⲉ+\n(B) ⲧⲟⲓ+\n(F) ⲧⲁ(ⲁ)ⲓ+, ⲧⲁⲁⲓⲉ+\n(S, sA, F) p c ⲧⲁⲓ-\n(S, A, sA) imperative: ⲙⲁ\n(B) imperative: ⲙⲟⲓ\n(F) imperative: ⲙⲁⲓ\n(S, B, F) imperative: ⲙⲁ-\n(S) imperative: ⲙⲁⲧ=, ⲙⲏⲉⲓ=\n(B) imperative: ⲙⲏⲓ=, ⲙⲏⲓⲧ=, ⲙⲟⲓⲧ=\n(F) imperative: ⲙⲁⲓ=\n(NH) imperative: ⲙⲁ=\nWith following preposition:\n(S, A, sA, B, F) ― ⲉ- intr: [δανιζειν]\ntr: give to\n(S) ― ⲉⲣⲛ- go toward\n(S, sA, B) ― ⲉⲧⲛ- {ⲉⲧⲟⲟⲧ= ⲛ-} intr: lay upon, command\ntr: give into hands, entrust\n(S, B) ― ⲉϫⲛ- put upon, add to, on behalf of\n― tr:\n― intr:\npay for\nfight for\n(S, B) ― ⲙⲛ-, ― ⲛⲉⲙ- fight with [πολεμειν, ανθισταναι]\n(S, sA, B) ― ⲛⲥⲁ- intr: go after, pursue\ntr: give to, upon, pursue\n(S, sA, B) ― ⲛⲧⲛ- entrust to\nsupport\ngive in, decrease\n(S, A, sA, B, F) ― ⲟⲩⲃⲉ- fight against [πολεμειν, ανθισταναι, αντικεισθαι]\n(S) ⲁⲧϯ ⲟⲩⲃⲉ. not to be opposed\n(B) ⲣⲉϥϯ ⲟⲩⲃⲉ. opponent\n(B) ⲙⲉⲧⲣⲉϥϯ ⲟⲩⲃⲉ. opposition\n(S, B, F) ― ϩⲁ-, ― ϧⲁ- give, sell for\nas nn S\n(S, A, B) ― ϩⲓ-\n(Sf, F) ― ⲉϩⲓ- lay upon, clothe [περιβαλλειν]\nfight for\n(S) ― ϩⲁⲧⲛ-\n(S, B, F) ― ϩⲓϫⲛ- intr: give for, on behalf of (?)\ntr: put upon\nWith following adverb:\n(S, A, sA, B, F) ― ⲉⲃⲟⲗ intr: give forth, away, sell [πωλειν, πιπρασκειν]\ntr: [πωλειν, πιπρασκειν]\nas nn, sale\n{ⲉⲃⲟⲗ} ⲉ- (c) sell for, as\nto\nset, put forth upon\n{ⲉⲃⲟⲗ} ϩⲁ-, {ⲉⲃⲟⲗ} ϧⲁ- (c) for, against\n{ⲉⲃⲟⲗ} ϩⲓϫⲛ- (c) fight on behalf of\nⲣⲉϥϯ ⲉⲃⲟⲗ. seller\n(S, B) ― ⲉⲡⲉⲥⲏⲧ put, send downward [καταβαλλειν]\n(B) ― ⲉⲡϣⲱⲓ raise up\n(S, A) ― ⲉⲡⲁϩⲟⲩ go backward\n(S) ― ⲉⲑⲏ go forward, progress\n(S, A, sA, B, F) ― ⲉϩⲟⲩⲛ give, hand in\n{ⲉϩⲟⲩⲛ} ⲉ- (c) into\n{ⲉϩⲟⲩⲛ} ⲛⲥⲁ- (c)\n{ⲉϩⲟⲩⲛ} ⲛⲁϩⲣⲛ- (c) respond to\n{ⲉϩⲟⲩⲛ} ϩⲁ- (c) place beneath\n(S) {ⲉϩⲟⲩⲛ} ϩⲛ- (c)\n(A) {ⲉϩⲟⲩⲛ} ϩⲁⲛ- (c)\n(B) {ⲉϩⲟⲩⲛ} ϧⲉⲛ- (c) strike into, upon\n{ⲉϩⲟⲩⲛ} ⲉϩⲣⲛ- (c) strike against, oppose\n(B) ⲣⲉϥϯ ⲉϧⲟⲩⲛ ⲉϩⲣⲛ- opposer\n(S, A, sA, B, F) ― ⲉϩⲣⲁⲓ\n(B) ― ⲉϧⲣⲁⲓ send up, in, lay down\n― intr: S\n― tr: [επιβαλλειν]\nintr :\n{ⲉϩⲣⲁⲓ} ⲉ- (c)\n{ⲉϩⲣⲁⲓ} ⲙⲛ- (c)\ntr :\n{ⲉϩⲣⲁⲓ} ⲉ- (c) lift up, commit to\n{ⲉϩⲣⲁⲓ} ϩⲁ- (c)\n(S, B) ϫⲓ ϯ, ϭⲓ ϯ (verb)\nas one vb, buy and sell, trade\n(S, A, B) ― (ⲡ) (noun male)\ngift, bonuty [δομα, δοσισ]\nsale [πρασισ]\nfight [μαχη]\nparal ϫⲓ, ϭⲓ, exchange, trading\n(B) ⲙⲁ ⲛϯ fighting place\n(S, B) ⲣⲉϥϯ giver [δοτησ]\nfighter [μαχητησ, πολεμιστησ]\nⲙⲛⲧⲣⲉϥϯ, ⲙⲉⲧⲣⲉϥϯ generosity, charity\nⲣ ⲣⲉϥϯ, ⲉⲣ ⲣⲉϥϯ be giver\nϭⲓⲛϯ, ϫⲓⲛϯ giving, selling\nfighting B'
      },
      {
        'path': '1.html',
        'marcion': '(S) ⲟⲩⲟⲉⲓⲛ\n(A, sA) ⲟⲩⲁ(ⲉ)ⲓⲛⲉ\n(Sa, sA, F) ⲟⲩⲁⲉⲓⲛ\n(B) ⲟⲩⲱⲓⲛⲓ\n(O) ⲟⲩⲟⲓⲛ\n(NH) ⲟⲩⲟⲉⲓⲛⲉ',
        'meaning': 'light [φωσ, φωτισμοσ]\ndawn [ανατολη, ορθροσ]\nlight of eyes\nas adj [φωτεινοσ]',
        'text': '(S) ⲟⲩⲟⲉⲓⲛ (ⲡ)\n(A, sA) ⲟⲩⲁⲓⲛⲉ, ⲟⲩⲁⲉⲓⲛⲉ (ⲡ)\n(Sa, sA, F) ⲟⲩⲁⲉⲓⲛ (ⲡ)\n(B) ⲟⲩⲱⲓⲛⲓ (ⲡ)\n(O) ⲟⲩⲟⲓⲛ (ⲡ)\n(NH) ⲟⲩⲟⲉⲓⲛⲉ (ⲡ)\n(noun male)\nlight [φωσ, φωτισμοσ]\ndawn [ανατολη, ορθροσ]\nlight of eyes\nas adj [φωτεινοσ]\nlight\ndawn\nlight (of eyes)\n(S) ⲟⲩⲟⲉⲓⲛ\n(A, sA) ⲟⲩⲁ(ⲉ)ⲓⲛⲉ\n(Sa, sA, F) ⲟⲩⲁⲉⲓⲛ\n(B) ⲟⲩⲱⲓⲛⲓ\n(O) ⲟⲩⲟⲓⲛ\n(NH) ⲟⲩⲟⲉⲓⲛⲉ\nⲁⲧⲟⲩ., ⲁⲑⲟⲩ. without light [αωρια]\n(S, sA) ⲣⲙⲛⲟⲩ.\n(NH) ⲣⲙⲟⲩ. man of, dweller in light\n(S, A, B, F) ⲣ ⲟⲩ., ⲉⲣ ⲟⲩ., ⲉⲗ ⲟⲩ. make, be light, shine\nWith prep or advb:\nⲉϫⲛ- (c)\n(B) ϩⲓϫⲉⲛ- (c)\n(B) ⲛ- (c)\n(S) ⲉⲃⲟⲗ (c)\nⲣⲉϥⲣ ⲟⲩ. one who lights, illuminator [φωστηρ]\nϭⲓⲛⲣ ⲟⲩ., ϫⲓⲛⲉⲣ ⲟⲩ. shining, illumination\n(B) ϯ ⲟⲩ. give light [φωτιζειν]\nϫⲓ ⲟⲩ., ϭⲓ ⲟⲩ. take, get light\n(sA) ⲧⲣⲟⲩ. (verb)\nshine'
      }
    ]
      ;
    resp = new Response(JSON.stringify(dummy));
  }

  const records: Record<string, string>[] = (
    await resp.json() as Record<string, string>[]);
  return records.map((record: Record<string, string>): Result => {
    const path = record['path']!;
    delete record['path'];
    const text = record['text']!;
    delete record['text'];
    return new Result(path, text, record);
  });
})();
// Event listener for the search button.
let currentAbortController: AbortController | null = null;

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

    const viewCell = document.createElement('td');
    viewCell.innerHTML = `<a href="${res.path}#:~:text=${encodeURIComponent(matchedWord)}">
      view</a>`;
    row.appendChild(viewCell);

    Object.values(res.fields).forEach((value: string) => {
      const cell = document.createElement('td');
      cell.innerHTML = value.replaceAll('\n', '<br>');
      row.appendChild(cell);
    });

    const matchesCell = document.createElement('td');
    matchesCell.innerHTML = matchedLines;
    row.appendChild(matchesCell);

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

let debounceTimeout: number | null = null;

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

searchBox.focus();
