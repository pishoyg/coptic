# Data

The `data/` directory contains raw (input) and output data.

The raw data was obtained from the Coptic Bible app published by [St. Shenouda
the Archimandrite Coptic Society](http://www.stshenouda.org/). (Download for
[iOS](https://apps.apple.com/us/app/coptic-bible/id1555182007),
[Android](https://play.google.com/store/apps/details?id=com.xpproductions.copticbible&hl=en&gl=US).)

## Output Directories

We produce the following output formats:

- `data/output/anki_tsv/`: A TSV (tab-separated values) file that is directly
importable into [Anki](https://apps.ankiweb.net/) (a popular flashcard
platform).

- `data/output/csv/`: A CSV (comma-separated values) file.

- `data/output/html*/`: HTML files (viewable in the browser).

- `data/output/epub*/`: EPUB files (suited for ebook readers).

## Output Files

Each of the output directories can contain several times that fall into one of
three categories:

- The files named `bible.${FORMAT}` contain the full data.

- The files named `${LANGUAGE}.${FORMAT}` contain data for a specific language.

- The files named `${LANGUAGE}_${LANGUAGE}.${FORMAT}` contain parallel data for
  a pair of languages. (Usually Bohairic-English is the pair of interest,
though you can control which pair(s) get generated using the CLI arguments.)
