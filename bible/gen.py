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
  default='data/raw/books/books.txt'
)
argparser.add_argument(
  '--input_dir',
  type=str,
  help='Path to the input directory.',
  default='data/raw'
)
argparser.add_argument(
  '--output_csv',
  type=str,
  help='Path to the ouptut directory for CSV format.',
  default='data/csv'
)
argparser.add_argument(
  '--output_html',
  type=str,
  help='Path to the ouptut directory for HTML format.',
  default='data/html'
)
argparser.add_argument(
  '--parallels',
  type=str,
  action='append',
  help='Produce HTML parallel texts for the following pairs of languages.',
  default=['Bohairic_English'],
  nargs='*',
)
args = argparser.parse_args()

def chapter_number(chapter):
  return chapter['sectionNameEnglish'] or '1'

def verse_number(verse):
  if not isinstance(verse, dict):
    print(verse)
  t = verse['English'] or verse['Greek']
  s = VERSE_PREFIX.search(t)
  return s.groups()[0] if s else ''

def html_id(book_name, chapter_num=None):
  id = book_name.lower().replace(' ', '_')
  if chapter_num:
    id += str(chapter_num)
  return id

def main():
  with open(args.books) as b:
    books = b.read().split('\n')
    books = list(filter(None, books))

  os.makedirs(args.output_csv, exist_ok=True)

  bible = pd.DataFrame()
  html = {lang: {} for lang in LANGUAGES + args.parallels}

  for book_name in books:
    for lang in LANGUAGES + args.parallels:
      html[lang][book_name] = ['<h2 id="{}">{}</h2>'.format(html_id(book_name), book_name)]

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
    for lang in LANGUAGES + args.parallels:
      for chapter in data:
        chapter_num = chapter_number(chapter)
        html[lang][book_name].append('<a href="#{}">{}</a>'.format(html_id(book_name, chapter_num), chapter_num))

    parallel_pairs = [p.split('_') for p in args.parallels]
    for chapter in data:
      chapter_num = chapter_number(chapter)
      for lang in LANGUAGES + args.parallels:
        html[lang][book_name].append('<h3 id="{}">{}</h3>'.format(html_id(book_name, chapter_num), chapter_num))
      for lang in args.parallels:
        html[lang][book_name].append('<table>')
      for verse in chapter['data']:
        verse_num = verse_number(verse)
        d = {
          'book': book_name,
          'chapter': chapter_num,
          'verse': verse_num,
        }
        for lang in LANGUAGES:
          d[lang] = VERSE_PREFIX.sub('', verse[lang])
          html[lang][book_name].append(verse[lang])
        for lang, pair in zip(args.parallels, parallel_pairs):
          html[lang][book_name].append('<tr> <td>{}</td> <td>{}</td> </tr>'.format(verse[pair[0]], verse[pair[1]]))
        df = pd.concat([df, pd.DataFrame([d])], ignore_index=True)
      for lang in args.parallels:
        html[lang][book_name].append('</table>')
    df.to_csv(os.path.join(args.output_csv, book_name + '.csv'), sep='\t',
              index=False)
    bible = pd.concat([bible, df], ignore_index=True)
  bible_path = os.path.join(args.output_csv, 'bible/bible.csv')
  os.makedirs(os.path.dirname(bible_path), exist_ok=True)
  bible.to_csv(bible_path, sep='\t', index=False)

  os.makedirs(args.output_html, exist_ok=True)
  for lang in LANGUAGES + args.parallels:
    out = [
      '<head>',
      '<title>Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ</title>',
      '<style> a { color: blue;} </style>'
      '</head>',
      '<h1>Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ</h1>'
    ]
    out.extend([
      '<p><a href="#{}">{}</a></p>'.format(html_id(book_name), book_name) for book_name in books
    ])
    for book_name in books:
      out.extend(html[lang][book_name])
    with open(os.path.join(args.output_html, lang.lower() + '.html'), 'w') as f:
      f.write('\n'.join(out))

if __name__ == '__main__':
  main()
