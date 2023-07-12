import argparse
import json
import json5
import os
import pandas as pd
import re

from ebooklib import epub

# TODO: Export the data to gsheet.
# TODO: Change the color of the verse numbers to #B00E23.

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
  '--cover',
  type=str,
  help='Path to a file containing the cover image.',
  default='data/img/stauros.png'
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
  '--output_epub',
  type=str,
  help='Path to the ouptut directory for EPUB format.',
  default='data/epub'
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

def normalize(txt):
  return txt.replace(chr(0xFE26), chr(0x0305))

def recolor_number(v, verse):
  if 'coloredWords' not in verse:
    return
  for d in verse['coloredWords']:
    w = d['word']
    v = v.replace(w, '<span style="color:#B00E23">{}</span>'.format(w))
  return v

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

class parallel_builder_1:
  def begin_chapter(self):
    return '<table>'
  def end_chapter(self):
    return '</table>'
  def verse(self, verse, pair):
    return '<tr> <td>{}</td> <td>{}</td> </tr>'.format(
      recolor_number(verse[pair[0]], verse),
      recolor_number(verse[pair[1]], verse))

class parallel_builder_2:
  def begin_chapter(self):
    return ''
  def end_chapter(self):
    return ''
  def verse(self, verse, pair):
    return '{} <br> {} <br> <br>'.format(
      recolor_number(verse[pair[0]], verse),
      recolor_number(verse[pair[1]], verse))

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
    t = normalize(t)
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
    pb = parallel_builder_2()
    for chapter in data:
      chapter_num = chapter_number(chapter)
      for lang in LANGUAGES + args.parallels:
        html[lang][book_name].append('<h3 id="{}">{}</h3>'.format(html_id(book_name, chapter_num), chapter_num))
      for lang in args.parallels:
        html[lang][book_name].append(pb.begin_chapter())
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
          html[lang][book_name].append(pb.verse(verse, pair))
        df = pd.concat([df, pd.DataFrame([d])], ignore_index=True)
      for lang in args.parallels:
        html[lang][book_name].append(pb.end_chapter())
    df.to_csv(os.path.join(args.output_csv, book_name + '.csv'), sep='\t',
              index=False)
    bible = pd.concat([bible, df], ignore_index=True)
  bible_path = os.path.join(args.output_csv, 'bible/bible.csv')
  os.makedirs(os.path.dirname(bible_path), exist_ok=True)
  bible.to_csv(bible_path, sep='\t', index=False)

  os.makedirs(args.output_html, exist_ok=True)
  os.makedirs(args.output_epub, exist_ok=True)

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

  for lang in LANGUAGES + args.parallels:
    kindle = epub.EpubBook()
    kindle.set_identifier('lang')
    kindle.set_language('cop')
    kindle.set_title('Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ')
    kindle.add_author('Saint Shenouda The Archimandrite – Coptic Society')
    with open(args.cover, 'rb') as f:
      kindle.set_cover(os.path.basename(args.cover), f.read())
    spine = []
    for book_name in books:
      c = epub.EpubHtml(title=book_name, file_name=lang + '_' + html_id(book_name) + '.xhtml')
      c.set_content('<html> <head></head> <body>' + '\n'.join(html[lang][book_name]) + '</body> </html>')
      spine.append(c)
      kindle.add_item(c)
    kindle.spine = spine
    kindle.toc = spine
    kindle.add_item(epub.EpubNcx())
    kindle.add_item(epub.EpubNav())

    epub.write_epub(os.path.join(args.output_epub, lang.lower() + '.epub'), kindle)


if __name__ == '__main__':
  main()
