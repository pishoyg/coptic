import argparse
import json
import json5
import os

LANGUAGES = [
  'Bohairic', 'Sahidic', 'English', 'Greek', 'Fayyumic', 'Akhmimic',
  'OldBohairic', 'Mesokemic', 'DialectP', 'Lycopolitan']


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
  default='raw/Sources'
)
argparser.add_argument(
  '--output_file',
  type=str,
  help='Path to the output file.',
  default='data/sources/sources.html'
)
args = argparser.parse_args()


def main():
  with open(args.books) as b:
    books = b.read().split('\n')
    books = filter(None, books)

  out = []
  for book_name in books:
    try:
      t = open(os.path.join(args.input_dir, book_name + '_Sources.json')).read()
    except:
      continue
    out.append('<h1>' + book_name + '</h1>')
    try:
      data = json.loads(t)
    except:
      data = json5.loads(t)
    del t

    for lang in LANGUAGES:
      out.append('<h2>' + lang + '</h2>')
      out.append('<br>'.join('  - ' + line for line in data[lang].split('\n') if line))

  os.makedirs(os.path.dirname(args.output_file), exist_ok=True)
  with open(args.output_file, 'w') as o:
    o.write(''.join(out))

if __name__ == '__main__':
  main()
