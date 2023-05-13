import argparse
import json
import json5
import os
import pathlib
import re


LANGUAGES = [
  'Bohairic', 'Akhmimic', 'Fayyumic', 'OldBohairic', 'Mesokemic', 'DialectP',
  'Lycopolitan', 'Greek', 'English', 'Sahidic']
PREFIX = re.compile('^\([^)]+\)')
FIRST_VERSE = re.compile('\(ⲁ︦|1\).+')


argparser = argparse.ArgumentParser(
  description='Process the Coptic Bible data.')
argparser.add_argument(
  '--input_dir',
  type=str,
  help='Path to the input directory.',
  default='raw'
)
argparser.add_argument(
  '--output_dir',
  type=str,
  help='Path to the input directory.',
  default='data'
)
args = argparser.parse_args()


class lang_processor:

  def __init__(self, _lang):
    self.lang = _lang
    self.lines = []
    self.done = False
    self.title_check_done = False
    self.verse_num = None
    self.chapter_num = None

  def _title_check(self, verse):
    # Return true if this is the title.
    if self.title_check_done:
      return False
    self.title_check_done = True
    if FIRST_VERSE.match(verse):
      return False
    return True

  def _process_verse(self, verse):
    verse = verse[self.lang]
    if self._title_check(verse):
      return
    verse = PREFIX.sub('', verse)
    verse = ' '.join(['{}:{}'.format(self.chapter_num, self.verse_num)] + verse.split())
    self.verse_num += 1
    self.lines.append(verse)

  def _process_chapter(self, chapter):
    if chapter['sectionNameEnglish']:
      self.chapter_num = chapter['sectionNameEnglish']
    self.verse_num = 1
    for verse in chapter['data']:
      self._process_verse(verse)
    try:
      self.chapter_num = int(self.chapter_num) + 1
    except:
      pass

  def process_book(self, book):
    self.chapter_num = 1
    for chapter in book:
      self._process_chapter(chapter)
    self.done = True
  
  def text(self):
    if not self.done:
      raise Exception('Processing not done')
    return '\n'.join(self.lines)


def main():
  for f in os.listdir(args.input_dir):
    if not f.endswith('.json'):
      continue
    book_name = os.path.splitext(f)[0]
    print(book_name)
    t = open(os.path.join(args.input_dir, f)).read()
    try:
      data = json.loads(t)
    except:
      data = json5.loads(t)
    for lang in LANGUAGES:
      out_dir = os.path.join(args.output_dir, lang)
      pathlib.Path(out_dir).mkdir(exist_ok=True)
      p = lang_processor(lang)
      p.process_book(data)
      out = open(os.path.join(out_dir, book_name + '.txt'), 'w')
      out.write(p.text())


if __name__ == '__main__':
  main()
