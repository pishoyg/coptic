import argparse
import json
import json5
import os
import pandas as pd
import re

# TODO: Export the data to gsheet.

GSPREAD_ENABLED = True
try:
  import gspread
  from oauth2client.service_account import ServiceAccountCredentials
except:
  GSPREAD_ENABLED = False


LANGUAGES = [
  'Bohairic', 'Sahidic', 'English', 'Greek', 'Fayyumic', 'Akhmimic',
  'OldBohairic', 'Mesokemic', 'DialectP', 'Lycopolitan']
VERSE_PREFIX = re.compile('^\(([^)]+)\)')

argparser = argparse.ArgumentParser(
  description='Process the Coptic Bible data.')
argparser.add_argument(
  '--books',
  type=str,
  help='Path to a file containing the books in order.',
  default='raw/books/books.txt'
)
argparser.add_argument(
  '--input_dir',
  type=str,
  help='Path to the input directory.',
  default='raw'
)
argparser.add_argument(
  '--output_dir',
  type=str,
  help='Path to the ouptut directory.',
  default='data/csv'
)
args = argparser.parse_args()


def verse_number(verse):
  if not isinstance(verse, dict):
    print(verse)
  t = verse['English'] or verse['Greek']
  s = VERSE_PREFIX.search(t)
  return s.groups()[0] if s else ''


def main():
  with open(args.books) as b:
    books = b.read().split('\n')
    books = filter(None, books)

  os.makedirs(args.output_dir, exist_ok=True)

  bible = pd.DataFrame()

  for book_name in books:
    try:
      t = open(os.path.join(args.input_dir, book_name + '.json')).read()
    except:
      print('Book not found : {}'.format(book_name))
      continue
    print('Processing book: {}'.format(book_name))
    try:
      data = json.loads(t)
    except:
      data = json5.loads(t)
    del t

    df = pd.DataFrame()

    for chapter in data:
      chapter_num = chapter['sectionNameEnglish'] or '1'
      for verse in chapter['data']:
        d = {
          'book': book_name,
          'chapter': chapter_num,
          'verse': verse_number(verse),
        }
        for lang in LANGUAGES:
          d[lang] = VERSE_PREFIX.sub('', verse[lang])
        df = pd.concat([df, pd.DataFrame([d])], ignore_index=True)
    df.to_csv(os.path.join(args.output_dir, book_name + '.csv'), sep='\t',
              index=False)
    bible = pd.concat([bible, df], ignore_index=True)
  bible_path = os.path.join(args.output_dir, 'bible/bible.csv')
  os.makedirs(os.path.dirname(bible_path), exist_ok=True)
  bible.to_csv(bible_path, sep='\t', index=False)


if __name__ == '__main__':
  main()
