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

# TODO: Design Protocol buffers!!!
# TODO: Design an entity-relationship model, and a SQL schema.
# TODO: Parse 'quality' and 'type'.
# TODO: Ensure the rigor of the parser.

import argparse

import pandas as pd

import parser

GSPREAD_ENABLED = True
try:
  import gspread
  from oauth2client.service_account import ServiceAccountCredentials
except:
  GSPREAD_ENABLED = False

argparser = argparse.ArgumentParser(
    description=
    'Parse and process the Marcion digital Coptic database,'
    'which is in turn based on the Crum Coptic dictionary.')

################################################################################
### Input CSV arguments.
################################################################################
argparser.add_argument(
  '--coptwrd_csv',
  type=str,
  help='Path to the input CSV file containing the words.'
)

argparser.add_argument(
  '--coptwrd_txt',
  type=str,
  default='coptwrd.txt',
  help='Path to the input TXT file containing the words.'
)

argparser.add_argument(
  '--coptdrv_csv',
  type=str,
  default='coptdrv.csv',
  help='Path to the input CSV file containing the derivations.'
)

argparser.add_argument(
  '--word_col',
  type=str,
  default='word',
  help='Name of the column containing the word groups.'
)

################################################################################
### Output CSV arguments.
################################################################################
argparser.add_argument(
  '--output_csv',
  type=str,
  default='marcion-crum-parser.csv',
  help='Path to the output CSV file.'
)

argparser.add_argument(
  '--unicode_col',
  type=str,
  default='coptic',
  help='Name of the output column containing the unicode version of the word.'
)

argparser.add_argument(
  '--dialect_col_prefix',
  type=str,
  default='dialect:',
  help='Prefix for the name of the output columns containing the filtered dialects.'
)

argparser.add_argument(
  '--filter_dialects',
  type=str,
  nargs='+',
  default=['S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'],
  help='For each of the provided dialect symboles, an extra column will be added'
  ' to the sheet, containing only the words that belong to this dialect.'
)

################################################################################
### Arguments for exporting output to Google Sheets.
################################################################################
argparser.add_argument(
  '--gspread_scope',
  type=str,
  nargs='+',
  default=['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/spreadsheets',
           'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
  help='Scope used to write output to google sheet.'
)

argparser.add_argument(
  '--gspread_credentials_json',
  type=str,
  help='Credentials file, used to write output to google sheet.'
)

argparser.add_argument(
  '--gspread_name',
  type=str,
  default='marcion-crum-parser',
  help='Name of the Google sheet to open / create.'
  'If opening a sheet with this name fails, will try to create one instead.'
)

argparser.add_argument(
  '--gspread_owner',
  type=str,
  help='In case a new sheet is created, assign this as the owner of the sheet.'
)

args = argparser.parse_args()


################################################################################
### Main.
################################################################################

def main():
  lines = read_txt()
  df = pd.DataFrame()
  for l in lines:
    df = df.append(parser.parse_txt_line(l), ignore_index=True)
#  df = df.reindex(sorted(df.columns), axis=1)
#  df = df.reindex(columns=['dialect:B', 'meaning', 'class', 'page'])
  df = df.fillna('')
  print(df)
  df.to_csv(args.coptwrd_txt + '.anki.txt', sep='\t', header=False, index=False, columns=['dialect:B', 'meaning', 'page'])
  print(parser.prefixes)
  write_to_gspread(df)
  exit()
  df = read_csv()
  process_data(df)
  write_to_csv(df)
  if GSPREAD_ENABLED and args.gspread_owner:
    write_to_gspread(df)


def read_csv():
  return pd.read_csv(args.coptwrd, sep='\t', encoding='utf-8').fillna('')


def read_txt():
  with open(args.coptwrd_txt) as f:
    return f.readlines()


def process_data(df):
  unicode_coptic = []
  filtered_words = {d: [] for d in args.filter_dialects}
  for line in df[args.word_col]:
    line = parser.parse_line(line)
    unicode_coptic.append(' | '.join(str(word) for word in line))
    for d in args.filter_dialects:
      filtered_words[d].append(' | '.join([word.undialected_str() for word in line if word.is_dialect(d)]))
  df[args.unicode_col] = unicode_coptic
  for d in args.filter_dialects:
    df[args.dialect_col_prefix+d] = filtered_words[d]


def write_to_csv(df):
  df.to_csv(args.output_csv, sep='\t')


def write_to_gspread(df):
  credentials = ServiceAccountCredentials.from_json_keyfile_name(
      args.gspread_credentials_json,
      args.gspread_scope)
  client = gspread.authorize(credentials)
  
  try:
    spreadsheet = client.open(args.gspread_name)
  except:
    spreadsheet = client.create(args.gspread_name)
    spreadsheet.share(args.gspread_owner, perm_type='user', role='owner')
  
  spreadsheet.get_worksheet(0).update([df.columns.values.tolist()] + df.values.tolist())


if __name__ == '__main__':
  main()
