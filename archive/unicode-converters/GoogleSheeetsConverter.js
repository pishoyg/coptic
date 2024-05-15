/**
 * A Google Sheets macro for converting from one of the well-known Coptic
 * character mapping conventions to the Coptic unicode.
 * The character mapping can be easily changed, in case you have been using
 * a different convention.
 *
 * Please see https://developers.google.com/apps-script/guides/sheets/macros
 * for instructions on how to use the macro in your sheet.
 *
 * @OnlyCurrentDoc
 */

const NUM_CELLS_TO_SET_AT_A_TIME = 50;

const TO_COPTIC = new Map([
['A', 'Ⲁ'],
['B', 'Ⲃ'],
['G', 'Ⲅ'],
['D', 'Ⲇ'],
['E', 'Ⲉ'],
['<', 'Ⲋ'],
['Z', 'Ⲍ'],
['H', 'Ⲏ'],
['Q', 'Ⲑ'],
['I', 'Ⲓ'],
['K', 'Ⲕ'],
['L', 'Ⲗ'],
['M', 'Ⲙ'],
['N', 'Ⲛ'],
['{', 'Ⲝ'],
['O', 'Ⲟ'],
['P', 'Ⲡ'],
['R', 'Ⲣ'],
['C', 'Ⲥ'],
['T', 'Ⲧ'],
['U', 'Ⲩ'],
['V', 'Ⲫ'],
['X', 'Ⲭ'],
['Y', 'Ⲯ'],
['W', 'Ⲱ'],
['}', 'Ϣ'],
['F', 'Ϥ'],
['"', 'Ϧ'],
['|', 'Ϩ'],
['J', 'Ϫ'],
['S', 'Ϭ'],
[':', 'Ϯ'],
['a', 'ⲁ'],
['b', 'ⲃ'],
['g', 'ⲅ'],
['d', 'ⲇ'],
['e', 'ⲉ'],
[',', 'ⲋ'],
['z', 'ⲍ'],
['h', 'ⲏ'],
['q', 'ⲑ'],
['i', 'ⲓ'],
['k', 'ⲕ'],
['l', 'ⲗ'],
['m', 'ⲙ'],
['n', 'ⲛ'],
['[', 'ⲝ'],
['o', 'ⲟ'],
['p', 'ⲡ'],
['r', 'ⲣ'],
['c', 'ⲥ'],
['t', 'ⲧ'],
['u', 'ⲩ'],
['v', 'ⲫ'],
['x', 'ⲭ'],
['y', 'ⲯ'],
['w', 'ⲱ'],
[']', 'ϣ'],
['f', 'ϥ'],
['\'', 'ϧ'],
['\\', 'ϩ'],
['j', 'ϫ'],
['s', 'ϭ'],
[';', 'ϯ'],
['.', '.'],
['>', ':'],
['/', '︦'],
['?', '̅'],
['`', '̀'],
['~', '⳿'],
['-', '-'],
['_', '⳪'],
['%', ','],
['(', '('],
[')', ')'],
['+', '⳧'],
['=', '⳥'],
['þ', '⸗'],
['™', '"'],
['£', '"'],
['•', '='],
['^', ';'],
['¡', '!'],
['ª', '['],
['º', ']'],
['§', '+'],
['¢', '⸗']
])
const TO_LATIN  = new Map([
['Ⲁ', 'A'],
['Ⲃ', 'B'],
['Ⲅ', 'G'],
['Ⲇ', 'D'],
['Ⲉ', 'E'],
['Ⲋ', '<'],
['Ⲍ', 'Z'],
['Ⲏ', 'H'],
['Ⲑ', 'Q'],
['Ⲓ', 'I'],
['Ⲕ', 'K'],
['Ⲗ', 'L'],
['Ⲙ', 'M'],
['Ⲛ', 'N'],
['Ⲝ', '{'],
['Ⲟ', 'O'],
['Ⲡ', 'P'],
['Ⲣ', 'R'],
['Ⲥ', 'C'],
['Ⲧ', 'T'],
['Ⲩ', 'U'],
['Ⲫ', 'V'],
['Ⲭ', 'X'],
['Ⲯ', 'Y'],
['Ⲱ', 'W'],
['Ϣ', '}'],
['Ϥ', 'F'],
['Ϧ', '"'],
['Ϩ', '|'],
['Ϫ', 'J'],
['Ϭ', 'S'],
['Ϯ', ':'],
['ⲁ', 'a'],
['ⲃ', 'b'],
['ⲅ', 'g'],
['ⲇ', 'd'],
['ⲉ', 'e'],
['ⲋ', ','],
['ⲍ', 'z'],
['ⲏ', 'h'],
['ⲑ', 'q'],
['ⲓ', 'i'],
['ⲕ', 'k'],
['ⲗ', 'l'],
['ⲙ', 'm'],
['ⲛ', 'n'],
['ⲝ', '['],
['ⲟ', 'o'],
['ⲡ', 'p'],
['ⲣ', 'r'],
['ⲥ', 'c'],
['ⲧ', 't'],
['ⲩ', 'u'],
['ⲫ', 'v'],
['ⲭ', 'x'],
['ⲯ', 'y'],
['ⲱ', 'w'],
['ϣ', ']'],
['ϥ', 'f'],
['ϧ', '\''],
['ϩ', '\\'],
['ϫ', 'j'],
['ϭ', 's'],
['ϯ', ';'],
['.', '.'],
[':', '>'],
['︦', '/'],
['̅', '?'],
['̀', '`'],
['⳿', '~'],
['-', '-'],
['⳪', '_'],
[',', '%'],
['(', '('],
[')', ')'],
['⳧', '+'],
['⳥', '='],
['⸗', 'þ'],
['"', '™'],
['"', '£'],
['=', '•'],
[';', '^'],
['!', '¡'],
['[', 'ª'],
[']', 'º'],
['+', '§']
])

function convertChar(c, map) {
  if (!map.has(c)) {
    return c;
  }
  return map.get(c);
}

function convert(map) {
  var valuesToSet = [];
  var range = SpreadsheetApp.getActiveSheet().getSelection().getActiveRange();
  const numRows = range.getNumRows();
  const numColumns = range.getNumColumns();
  for (var i = 0; i < numRows; i++) {
    for (var j = 0; j < numColumns; j++) {
      var cell = range.getCell(i+1, j+1).activate();
      var from = cell.getValue();
      var to = "";
      for (var k = 0; k < from.length; k++) {
        to = to + convertChar(from[k], map);
      }
      valuesToSet.push([cell, to])
      if (valuesToSet.length >= NUM_CELLS_TO_SET_AT_A_TIME) {
        for (idx in valuesToSet) {
          valuesToSet[idx][0].setValue(valuesToSet[idx][1]);
        }
        valuesToSet = []
      }
    }
  }
  for (idx in valuesToSet) {
    valuesToSet[idx][0].setValue(valuesToSet[idx][1]);
  }
}

function ToCoptic() {
  convert(TO_COPTIC);
}

function ToLatin() {
  convert(TO_LATIN);
}
