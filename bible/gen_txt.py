import argparse
import json
import json5
import os
import re


LANGUAGES = [
  'Bohairic', 'Akhmimic', 'Fayyumic', 'OldBohairic', 'Mesokemic', 'DialectP',
  'Lycopolitan', 'Greek', 'English', 'Sahidic']
VERSE_PREFIX = re.compile('^\(([^)]+)\)')
SPACE = re.compile('\s')

argparser = argparse.ArgumentParser(
  description='Process the Coptic Bible data.')
argparser.add_argument(
  '--input_dir',
  type=str,
  help='Path to the input directory.',
  default='data/raw'
)
argparser.add_argument(
  '--output_dir',
  type=str,
  help='Path to the output directory.',
  default='data/txt'
)
args = argparser.parse_args()


class lang_processor:
  errors = {lang: [] for lang in LANGUAGES}

  def __init__(self, _book_name, _lang):
    self.book_name = _book_name
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
    if VERSE_PREFIX.match(verse):
      return False
    return True
  
  def _update_verse_number(self, verse):
    s = VERSE_PREFIX.search(verse)
    if s:
      g = s.groups()
      assert len(g) == 1
      self.verse_num = g[0]
      return True

    if not self.verse_num:
      self.verse_num = 1
      return True

    try:
      self.verse_num = int(self.verse_num) + 1
      return True
    except:
      self.errors[self.lang].append('Suspected non-verse: {}:{} : {}'.format(
        self.chapter_num, self.verse_num, verse))
      return False

  def _process_verse(self, verse):
    verse = verse[self.lang]
    if self._title_check(verse):
      if verse:
        self.errors[self.lang].append("Suspected title    : {} : {}".format(
          self.chapter_num, verse))
      return
    if not self._update_verse_number(verse):
      # Ignore verse when unable to infer the number.
      # It's likely not a real verse.
      return
    verse = VERSE_PREFIX.sub('', verse)
    verse = ' '.join(['{}:{}'.format(self.chapter_num, self.verse_num)] + verse.split())
    self.lines.append(verse)

  def _update_chapter_number(self, chapter):
    if chapter['sectionNameEnglish']:
      self.chapter_num = chapter['sectionNameEnglish']
      return

    if not self.chapter_num:
      self.chapter_num = 1
      return

    try:
      self.chapter_num = int(self.chapter_num) + 1
    except:
      raise Exception('Unable to infer chapter number:\n{}'.format(chapter))

  def _process_chapter(self, chapter):
    self.title_check_done = False
    self._update_chapter_number(chapter)
    for verse in chapter['data']:
      self._process_verse(verse)
    self.verse_num = None

  def process_book(self, book):
    self.errors[self.lang].append(self.book_name)
    for chapter in book:
      self._process_chapter(chapter)
    self.done = True
    self.chapter_num = None
    self.errors[self.lang].append('')
  
  def text(self):
    assert self.done
    return '\n'.join(self.lines)
  
  def errors_text(self, lang):
    return '\n'.join(self.errors[lang])


def main():
  for f in os.listdir(args.input_dir):
    if not f.endswith('.json'):
      continue
    book_name = os.path.splitext(f)[0]
    print('Processing book: {}'.format(book_name))
    t = open(os.path.join(args.input_dir, f)).read()
    try:
      data = json.loads(t)
    except:
      data = json5.loads(t)
    for lang in LANGUAGES:
      out_dir = os.path.join(args.output_dir, lang)
      os.makedirs(out_dir, exist_ok=True)
      p = lang_processor(book_name, lang)
      p.process_book(data)
      out = open(os.path.join(out_dir, book_name + '.txt'), 'w')
      out.write(p.text())
  for lang in LANGUAGES:
    err = lang_processor(None, lang).errors_text(lang)
    if not err:
      continue
    out_dir = os.path.join(args.output_dir, lang, 'errors')
    os.makedirs(out_dir, exist_ok=True)
    out = open(os.path.join(out_dir, 'errors.txt'), 'w')
    out.write(err)


if __name__ == '__main__':
  main()
