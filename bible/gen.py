import argparse
from ebooklib import epub
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


HTML_HEAD = """
<head>
    <title>Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ</title>
    <style>
    .a { color: blue;}
    .column {
        float: left;
        width: 50%;
    }
    .row:after {
        content: "";
        display: table;
        clear: both;
    }
    </style>
</head>
<h1>Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ</h1>
"""

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
  '--parallels',
  type=str,
  action='append',
  help='Produce HTML parallel texts for the following pairs of languages.',
  default=['Bohairic_English'],
  nargs='*',
)
argparser.add_argument(
  '--parallel_format',
  type=int,
  help='Format for parallel version. Either 1 for parallel verses, or 2 for successive verses.',
  default=1,
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
  '--cover',
  type=str,
  help='Path to a file containing the cover image for EPUB.',
  default='data/img/stauros.jpeg'
)


args = argparser.parse_args()


def normalize(txt):
  return txt.replace(chr(0xFE26), chr(0x0305))


def recolor(v, verse):
  if 'coloredWords' not in verse:
    return
  for d in verse['coloredWords']:
    txt = d['word']
    color = d['light']
    v = v.replace(txt, '<span style="color:{}">{}</span>'.format(color, txt))
  return v


def chapter_number(chapter):
  return chapter['sectionNameEnglish'] or '1'


def verse_number(verse):
  t = verse['English'] or verse['Greek']
  s = VERSE_PREFIX.search(t)
  return s.groups()[0] if s else ''


def html_id(book_name, chapter_num=None):
  id = book_name.lower().replace(' ', '_')
  if chapter_num:
    id += str(chapter_num)
  return id


def epub_book_href(lang, book_name):
  return lang + '_' + html_id(book_name) + '.xhtml'


PARALLEL_FORMATS = {
  1: ['', '{} <br> {} <br> <br>', ''],
  2: ['<table>', '<tr> <td>{}</td> <td>{}</td> </tr>', '</table>'],
  3: ['', '<div class="row"> <div class="column">{}</div> <div class="column">{}</div> </div>', '']
}


class parallel_builder:
  def __init__(self, chapter_beginner, verse_format, chapter_end):
    self.chapter_beginner = chapter_beginner
    self.chapter_end = chapter_end
    self.verse_format = verse_format

  def begin_chapter(self):
    return self.chapter_beginner
  def end_chapter(self):
    return self.chapter_end
  def verse(self, verse, pair):
    return self.verse_format.format(
      recolor(verse[pair[0]], verse),
      recolor(verse[pair[1]], verse))


def load_book(book_name):
  try:
    t = open(os.path.join(args.input_dir, book_name + '.json')).read()
  except:
    print('Book not found : {}'.format(book_name))
    return {}

  print('Loaded book : {}'.format(book_name))
  t = normalize(t)
  try:
    data = json.loads(t)
  except:
    data = json5.loads(t)
  return data


def write_csv(df):
  if not args.output_csv:
    return

  os.makedirs(args.output_csv, exist_ok=True)
  path = os.path.join(args.output_csv, 'bible.csv')
  os.makedirs(os.path.dirname(path), exist_ok=True)
  df.to_csv(path, sep='\t', index=False)


def write_html(html, books):
  if not args.output_html:
    return

  os.makedirs(args.output_html, exist_ok=True)
  for lang in LANGUAGES + args.parallels:
    out = [HTML_HEAD]
    out.extend([
      '<p><a href="#{}">{}</a></p>'.format(html_id(book_name), book_name) for book_name in books
    ])
    for book_name in books:
      out.extend(html[lang][book_name])
    with open(os.path.join(args.output_html, lang.lower() + '.html'), 'w') as f:
      f.write('\n'.join(out))


def write_epub(html, books):
  if not args.output_epub:
    return

  os.makedirs(args.output_epub, exist_ok=True)

  for lang in LANGUAGES + args.parallels:
    kindle = epub.EpubBook()
    kindle.set_identifier(lang)
    kindle.set_language('cop')
    kindle.set_title('Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ')
    kindle.add_author('Saint Shenouda The Archimandrite Coptic Society')
    cover_file_name = os.path.basename(args.cover)
    cover = epub.EpubCover(file_name=cover_file_name)
    with open(args.cover, 'rb') as f:
      cover.content = f.read()
    kindle.add_item(cover)
    kindle.add_item(epub.EpubCoverHtml(image_name=cover_file_name))
    kindle.add_metadata(None, 'meta', '', epub.OrderedDict([('name', 'cover'), ('content', 'cover-img')]))

    toc = epub.EpubHtml(title='Table of Contents', file_name=lang + '_toc.xhtml')
    toc.set_content('\n'.join(
      [HTML_HEAD] + [
      '<p><a href="{}">{}</a></p>'.format(epub_book_href(lang, book_name), book_name) for book_name in books
    ]))
    kindle.add_item(toc)

    spine = [cover, toc]

    for book_name in books:
      c = epub.EpubHtml(title=book_name, file_name=epub_book_href(lang, book_name))
      c.set_content('<html> <head></head> <body>' + '\n'.join(html[lang][book_name]) + '</body> </html>')
      spine.append(c)
      kindle.add_item(c)
    kindle.spine = spine
    kindle.toc = spine[2:]
    kindle.add_item(epub.EpubNcx())
    kindle.add_item(epub.EpubNav())

    epub.write_epub(os.path.join(args.output_epub, lang.lower() + '.epub'), kindle)


def main():
  with open(args.books) as b:
    books = b.read().split('\n')
    books = list(filter(None, books))

  df = pd.DataFrame()
  html = {lang: {} for lang in LANGUAGES + args.parallels}

  for book_name in books:
    for lang in LANGUAGES + args.parallels:
      html[lang][book_name] = ['<h2 id="{}">{}</h2>'.format(html_id(book_name), book_name)]
    
    data = load_book(book_name)
    book_df = pd.DataFrame()
    for lang in LANGUAGES + args.parallels:
      for chapter in data:
        chapter_num = chapter_number(chapter)
        html[lang][book_name].append('<a href="#{}">{}</a>'.format(html_id(book_name, chapter_num), chapter_num))

    parallel_pairs = [p.split('_') for p in args.parallels]
    pb = parallel_builder(*PARALLEL_FORMATS[args.parallel_format])
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
        book_df = pd.concat([book_df, pd.DataFrame([d])], ignore_index=True)
      for lang in args.parallels:
        html[lang][book_name].append(pb.end_chapter())
    df = pd.concat([df, book_df], ignore_index=True)

  write_csv(df)
  write_html(html, books)
  write_epub(html, books)


if __name__ == '__main__':
  main()
