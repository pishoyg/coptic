"""
Developer contact: b.g.coptic@gmail.com.
Inquiries and suggestions are welcome :)

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

import argparse
import json

import author
import bible
import parser

argparser = argparse.ArgumentParser(
  description=
  'Parse and process unbound.biola.edu\'s Coptic NT, and align it with NKJV.')

############################################################
# Arguments for parsing the New Testament.
############################################################

argparser.add_argument(
  '--unbound_biola_coptic_nt_tsv',
  type=str,
  help='Path to the input TSV file containing the Coptic NT.'
)
argparser.add_argument(
  '--nkjv_json',
  type=str,
  help='Path to the input JSON file containing NKJV.'
)
argparser.add_argument(
  '--unbound_biola_book_names',
  type=str,
  help='Path of the input tsv file containing book names and codes from unbound biola.'
)

############################################################
# Arguments for parsing books.
############################################################

argparser.add_argument(
  '--book_name',
  type=str,
  help='Book name, e.g. "Genesis"'
)
argparser.add_argument(
  '--num_chapters',
  type=int,
  help='Number of chapters in the book.'
)
argparser.add_argument(
  '--coptic_book_path',
  type=str,
  help='Path to the input txt file containing the Coptic text of the book.'
)
argparser.add_argument(
  '--greek_book_path',
  type=str,
  help='Path to the input txt file containing the Greek text of the book.'
)
argparser.add_argument(
  '--english_book_path',
  type=str,
  help='Path to the input txt file containing the English text of the book.'
)


args = argparser.parse_args()


def process_nt():
  coptic_nt = parser.parse_unbound_biola_coptic_nt(
    args.unbound_biola_coptic_nt_tsv,
    *parser.parse_unbound_biola_book_names(args.unbound_biola_book_names))
  nkjv = parser.parse_nkjv_json(args.nkjv_json)
  assert nkjv.num_books() == 66
  nkjv = bible.Bible('nkjn', nkjv.books()[39:])
  assert nkjv.num_books() == 27
  assert coptic_nt.num_books() == 27
  j = json.dumps(
    author.generate_json(['Coptic', 'English'], [coptic_nt, nkjv]),
    ensure_ascii=False,
    indent=1,
    sort_keys=False).encode('utf8').decode()
  print(j)


def process_book():
  c = parser.parse_htakla_coptic_book(
      args.book_name, args.num_chapters, args.coptic_book_path)
  g = parser.parse_htakla_greek_book(
      args.book_name, args.num_chapters, args.greek_book_path,
      r'\d+1[^\d]', 2)
  e = parser.parse_htakla_greek_book(
      args.book_name, args.num_chapters, args.english_book_path,
      r'\d+\s[A-Z]', 2)
  j = json.dumps(
    author.generate_mmakar_book_json(['Bohairic', 'Greek', 'English'], [c, g, e]),
    ensure_ascii=False,
    indent=1,
    sort_keys=False).encode('utf8').decode()
  print(j)


def main():
  if args.coptic_book_path:
    process_book()
  elif args.unbound_biola_coptic_nt_tsv:
    process_nt()


if __name__ == '__main__':
  main()
