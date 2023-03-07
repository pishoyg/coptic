"""

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


DIALECTS = ['S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH']


DIALECTS_RE = re.compile(r'\({d}(,{d})*\)'.format(d='({})'.format('|'.join(DIALECTS))))
SPELLINGS_TYPES_REFERENCES_RE = re.compile(r'[^()]+')
ENGLISH_WITHIN_COPTIC_RE = re.compile(r'\{[^{}]+\}')
COPTIC_WITHIN_ENGLISH_RE = re.compile(r'\[[^\[\]]+\]')
REFERENCE_RE = re.compile(r'<a href[^<>]+</a>')
COMMA_NOT_BETWEEN_PARENTHESES_RE = re.compile(r',(?![^()]*\)|[^{}]*\}|[^\[\]]*\])')
COPTIC_LETTER_RE = re.compile('[Ⲁ-ⲱϢ-ϯⳈⳉ]')
PAGE_NUMER_RE = re.compile('[0-9]{1,3}[ab]$')
CLASS_RE = re.compile('[a-z ]+|-')
TWO_TABS_RE = re.compile('\t\t')
ENGLISH_LETTER_RE = re.compile('[a-zA-Z]')


LETTER_MAPPING = {
  'a': 'ⲁ',
  'b': 'ⲃ',
  'g': 'ⲅ',
  'd': 'ⲇ',
  'e': 'ⲉ',
  'V': 'ⲋ',
  'z': 'ⲍ',
  'h': 'ⲏ',
  'q': 'ⲑ',
  'i': 'ⲓ',
  'k': 'ⲕ',
  'l': 'ⲗ',
  'm': 'ⲙ',
  'n': 'ⲛ',
  'j': 'ⲝ',
  'o': 'ⲟ',
  'p': 'ⲡ',
  'r': 'ⲣ',
  's': 'ⲥ',
  't': 'ⲧ',
  'u': 'ⲩ',
  'f': 'ⲫ',
  'x': 'ⲭ',
  'c': 'ⲯ',
  'w': 'ⲱ',
  'S': 'ϣ',
  'F': 'ϥ',
  'K': 'ϧ',
  'H': 'ϩ',
  'J': 'ϫ',
  'G': 'ϭ',
  'T': 'ϯ',
  'Q': 'ⳉ',
}


_SPELLING_ANNOTATIONS = [
  # These are always spelling-specific, and are (for the time being) left as part of the spellings!
  ('-', '-',),    # Prenominal form.
  ('–', '-'),     # Prenominal form.
  ('=', '⸗'),     # Pronominal form.
  ('+', ' (ⲉϥ)'),     # Qualitative form.
  ('$$', '(?)'),  # Possibly / probably.
]


_SPELLING_ANNOTATION_CHARS = set(p[1] for p in _SPELLING_ANNOTATIONS)


class_to_suffix = {
  '-': '-',
 'adjective': 'adj.',
 'adverb': 'adv.',
# 'conjunction': 'conjunction',
# 'interjection': 'interj.',
# 'interrogative adverb': 'int. adv.',
# 'interrogative particle': 'int. part.',
# 'interrogative pronoun': 'int. pro.',
 'noun': 'ⲟⲩ',
 'noun female': 'ⲧ',
 'noun male': 'ⲡ',
 'noun male/female': 'ⲡ,ⲧ',
 'numeral': 'num.',
 'numeral male': 'num. ⲡ',
 'numeral male/female': 'num. ⲡ/ⲧ',
# 'particle': 'part.',
# 'personal pronoun': 'p. pro.',
 'plural': 'ⲛ',
# 'preposition': 'pre.',
# 'pronoun': 'pro.',
 'verb': 'v.',
 'verbal prefix': 'v. prefix',
}


_DETACHED_TYPES = [
  ('****',  type('(ⲧ)',     'feminine')),
  ('**',    type('(imp.)',  'imperative')),
  ('*',     type('(ⲛ)',     'plural')),
  ('^',     type('(p.c.)',  'conjunctive participle')),
  ('$',     type('(&c)',    'constructed with')), # of verbs.
]

_EARLY_PRE_PROCESSING = [
  ('$^', '('),    # Left parenthesis.
  ('^$', ')'),    # Right parenthesis.
  ('*^', '{'),    # English-within-Coptic left bracket.
  ('^*', '}'),    # English-within-Coptic right bracket.
  ('[', '['),     # Coptic-within-English left bracket.
  (']', ']'),     # Coptic-within-English right bracket.
  ('^^', '__'),   # Same word spelling as the line before.
]


TXT_TYPES = [
  ('imperative: ', '(imp.)'),
  ('female: ', '(ⲧ)'),
  ('plural: ', '(ⲛ)'),
  ('p c ', '(p.c.)'),
  ('male: ', '(ⲡ)'),
  ('noun male: ', '(ⲡ)'),
]

MEANING_PREFIXES = [
  ('intr:', '(intransitive)'),
  ('tr:', '(transitive)'),
  ('qual:', '(qualitative)'),
]
