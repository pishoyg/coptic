#TODO: STORE TYPE IN A SEPARATE COLUMN.
#TODO: MAKE THE OUTPUT SHEET MORE READABLE AND USER-FRIENDLY.
#TODO: ADD A GREEK-FREE COLUMN.

#TODO: PUT REMARKS AND REFERENCES ON THEIR OWN COLUMNS.
#TODO: ADD REFERENCE-FREE COLUMNS.
#TODO: PARSING REFERENCES SHOULD BE PART OF PARSING ENGLISH!
#      THIS IS EASY.
#      USE RECURSION!
#      PARSE END OF REFERENCE AS WELL!

#TODO: VERIFY THE ASSUMPTIONS THAT YOU HAVE MADE ABOUT THE TYPE COVERAGE RANGES!!!
#TODO: HANDLE `unknown_ascii_letters`.
#TODO: TAKE ANOTHER LOOK AT THE CONTEXT-FREE GRAMMAR.

#TODO: ~REPLACE ASSERSTIONS WITH ERROR MESSAGES.
#TODO: ~COMPLETE THE CONTEXT-FREE GRAMMAR.
 
"""
# Nomenclature:
A line in Marcion's dictionary database consists of words.
A word, represented by the class `structured_word` defined below, consists of:
  - Dialects that this word belongs to.
  - Spellings that this word can take (usually 1).
  - Types that this word is (usually none).
  - References for the word (usually none).

For example, the following line is Marcion's representation of the word `ⲛⲁⲓ` from page
216b from Crum's dictionary:

(S) na,naa (S,A,sA) nae (S,B) nai (S) naeih (F) nei,neei (S,A,B,F) ^na- *^[naHht, naht]^*

This line has several words, namely:
  - (S) na,naa                        # 1 dialect, 2 spellings
  - (S,A,sA) nae                      # 3 dialects, 1 spelling
  - (S,B) nai                         # 2 dialects, 1 spelling
  - (S) naeih                         # 1 dialect, 1 spelling
  - (F) nei,neei                      # 1 dialect, 2 spellings
  - (S,A,B,F) ^na- *^[naHht, naht]^*  # 4 dialects, 1 spelling, 1 type
    The type is "^", which means "conjunctive participle".

Grammar:
  - The parser assumes the following grammar:
  <line> = <word> (, <word>)*
  <word> = <dialect_list> <spelling_list>
  <spelling_list> = <spelling> (, <spelling>)*
  <spelling> = (<english> | <coptic> | <type>)+

Remarks about the parsing:
  The strings "$^" and "^$" are used to represent the parentheses "(" and ")" in
  Marcion's encoding of Crum.
  In Crum, the parentheses had the roles in Coptic forms:
    - To represent optional letters.
      For example, the word "horses" in Bohairic can be written as either
      "ⲉϩⲑⲱⲣ", "ϩⲑⲱⲣ", or "ϩⲑⲟⲣ". This is represented by "(ⲉ)ϩⲑⲱⲣ,ϩⲑⲟⲣ".
    - To represent "deduced" word forms (fewer use cases).
    For example, the word "ⲗⲟⲕⲉⲙ†" (qualitative form) occurs in Coptic literature,
    with the meaning "be moist, sodden", but the root form never does.
    Crum assumes that it's like "ⲗⲱⲕⲉⲙ" and represents that by wriring
    "(ⲗⲱⲕⲉⲙ), ⲗⲟⲕⲉⲙ†".
    
    The differentiation between the two use cases can be done by checking whether
    the parentheses cover the entire word, or a subpart of it.

Developer contact: b.g.coptic@gmail.com.
Inquiries are welcome :)

Copyright (C) 2020

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
"""

import re

import constants


#TODO: REMOVE.
unknown_ascii_letters = set()
prefixes = set()


def _munch(text, regex, force):
  # Munch the prefix of "text" which matches "regex", and return both parts.
  m = regex.match(text)
  if force:
    assert m
  elif not m:
    return '', text
  
  i, j = m.span()
  assert i == 0
  return text[:j], text[j:].strip()


def _chop(text, regex, force):
  s = regex.search(text)
  if force:
    assert s
  elif not s:
    return text, '', ''
  i, j = s.span()
  return text[:i].strip(), text[i:j], text[j:].strip()


def parse_line(line):
  # TODO: Understand the role of quotation marks, instead of removing them.
  line = line.replace('"', '')
  line = line.strip()

  if not _DIALECTS.search(line):
    # This has a single undialected (spellings, types, references) tuple.
    s, t, r, line = _munch_and_parse_spellings_types_and_references(line)
    assert not line
    return [structured_word([], s, t, r)]

  words = []
  while line:
    # Parse the dialects.
    d, line = _munch_and_parse_dialects(line)
    s, t, r, line = _munch_and_parse_spellings_types_and_references(line)
    words.append(structured_word(d, s, t, r))

  return words
  

def _munch_and_parse_spellings_types_and_references(line):
  
  # TODO: Force a munch, unless you are parsing derivates.
  line, remainder = _munch(line, _SPELLINGS_TYPES_REFERENCES, False)
  
  s, t, r = [], [], []
  
  for p in _EARLY_PRE_PROCESSING:
    line = line.replace(p[0], p[1])
  
  while line:
    spelling_and_types, reference, line = _chop(line, _REFERENCE, False)
    if reference:
      r.append(_parse_reference(reference))
    if spelling_and_types:
      ss, ts = _parse_spellings_and_types(spelling_and_types)
      s.extend(ss)
      t.extend(ts)

  return s, t, r, remainder


def _pick_up_detached_types(line):
  t = []
  for p in _DETACHED_TYPES:
    if p[0] in line:
      line = line.replace(p[0], '')
      t.append(p[1])
  return t, line.strip()


def _parse_spellings_and_types(line):
  # This makes the assumption that references have been removed.
  for p in _SPELLING_ANNOTATIONS:
    line = line.replace(p[0], p[1])
  t, line = _pick_up_detached_types(line)
  return list(map(_parse_one_spelling, _COMMA_NOT_BETWEEN_PARENTHESES.split(line))), t


def _parse_one_spelling(line):
  out = []
  while line:
    copt, eng, line = _chop(line, _ENGLISH_WITHIN_COPTIC, False)
    if copt:
      out.append(_ascii_to_unicode(copt))
    if eng:
      out.append(_parse_english_within_coptic(eng))
  return ' '.join(out)


def _parse_english_within_coptic(line):
  out = []
  while line:
    eng, copt, line = _chop(line, _COPTIC_WITHIN_ENGLISH, False)
    if eng:
      out.append(eng)
    if copt:
      assert copt[0] == '[' and copt[-1] == ']' and copt[1:-1]
      out.append(_ascii_to_unicode(copt[1:-1]))

  return ' '.join(out)


def _ascii_to_unicode(ascii):
  uni = ''
  for c in ascii:
    if c in _LETTER_MAPPING:
      uni = uni + _LETTER_MAPPING[c]
    else:
      uni = uni + c
      if c not in _SPELLING_ANNOTATION_CHARS:
        unknown_ascii_letters.add(c)
  return uni



def _parse_reference(line):
  """This method makes the assumption that the input is a single
  (not nested nor concatenated) reference, whose boundaries have been removed."""

  ans = ''

  def valid_english(line):
    return all(c.isalpha() or c == ' ' or c == '-' or c == '"' or c == ',' or c == '=' or c == '<' or c == '>' or c == '{' for c in line)

  def valid_pre_conversion_coptic(line):
    return all(c.isalpha() or c == ' ' or c == '-' or c == '"' for c in line)

  parts = line.split(';')
  i = 0
  while i < len(parts):
    if ans:
      ans = ans + '; '
    assert valid_english(parts[i]), parts[i]
    ans = ans + parts[i]
    i += 1
    while parts[i].isnumeric():
      ans = ans + ';' + parts[i]
      i += 1
    ans = ans + '; '
    assert valid_pre_conversion_coptic(parts[i]), parts[i]
    ans = ans + _ascii_to_unicode(parts[i])
    i += 1
  return ans


def _munch_and_parse_dialects(line):
  # TODO: Force a munch and a match, unless you are parsing derivates.
  match, remainder = _munch(line, _DIALECTS, False)
  if match:
    assert match[0] == '(' and match[-1] == ')'
    return match[1:-1].split(','), remainder
  return [], remainder


def get_txt_columns():
  return ['page', 'class', 'meaning', 'spelling']


def parse_txt_line(line):

  def make_multiline(l, class_suffix, class_suffix_applies_to_all):
    l = l.split('\t')
    l = [part.strip() for part in l]
    l = [part for part in l if part]
    for i in range(len(l)):
      keep_going = True
      while keep_going:
        keep_going = False
        for mp in meaning_prefixes:
          if l[i].startswith(mp[0]):
            l[i] = mp[1] + l[i][len(mp[0]):]
            keep_going = True
    return '\n'.join(l)

  def build_word(w, class_suffix):
    d = []
    if _DIALECTS.match(w):
      d, w = _munch_and_parse_dialects(w)
    keep_going = True
    t = []
    while keep_going:
      w = w.strip()
      keep_going = False
      for tt in txt_types:
        if w.startswith(tt[0]):
          t.append(type(tt[1], tt[0]))
          keep_going = True
          w = w[len(tt[0]):].strip()
          break
    type_deteced = False
    for p in _SPELLING_ANNOTATIONS:
      if p[0] in w:
        w = w.replace(p[0], p[1])
        type_deteced = True
    s = w.split(',')
    if not (type_deteced and class_suffix == ' (v.)'):
      t = t or [type(class_suffix, '')]
    for i in s:
      prefixes.update(filter(None, _COPTIC_LETTER.split(i)))
    return structured_word(d, s, t, [])

  line = line.strip()
  line = _TWO_TABS.split(line)
  line = line[0].split('\t') + line[1:]
  line = [part.strip() for part in line]
  line = list(filter(None, line))
  assert len(line) == 4, line
  assert _PAGE_NUMER.match(line[0]), line
  assert _CLASS.match(line[1]), line

  line[2] = make_multiline(line[2], '', False)
  class_has_suffix_form = line[1] in constants.class_to_suffix
  if class_has_suffix_form:
    suffix_form = constants.class_to_suffix[line[1]]
  else:
    suffix_form = line[1]
  suffix_form = ' ' + '(' + suffix_form + ')'
  line[3] = make_multiline(line[3], suffix_form, class_has_suffix_form)

  line[2] = line[2].replace(']', ')').replace('[gk: ', '(')
  words = [build_word(w, suffix_form) for w in line[3].split('\n')]
  dialects = set()
  for w in words:
    dialects.update(w.dialects())
  ans = {
    'page': line[0],
    'class': '(' + line[1] + ')',
    'meaning': line[2],
    'spelling': line[3],
    'class+meaning':  '(' + line[1] + ')' + '\n' + line[2],
  }
  for d in dialects:
    ans['dialect:'+d] = '\n'.join(w.undialected_str() for w in words if w.is_dialect(d))
  return ans
