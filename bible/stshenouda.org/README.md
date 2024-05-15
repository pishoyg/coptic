# Data

The `data/` directory contains raw (input) and output data.

The raw data was obtained from the Coptic Bible app published by [St. Shenouda
the Archimandrite Coptic Society](http://www.stshenouda.org/). (Download for
[iOS](https://apps.apple.com/us/app/coptic-bible/id1555182007),
[Android](https://play.google.com/store/apps/details?id=com.xpproductions.copticbible&hl=en&gl=US).)

## Output Directories

We produce the following output formats:

- `data/output/anki_tsv/`: A TSV (tab-separated values) file that is directly importable into
[Anki](https://apps.ankiweb.net/) (a powerful flashcard platform).

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

# Running the Script

Running `regnerate.py` reruns the pipeline that processes the raw data in
`data/raw/` and generates all the output formats listed in `data/output/`.

If you run it from this directory, `python3 regenerate.py` should suffice. The
arguments should be prepopulated with default values that point to the correct
file locations. Run `python3 regenerate.py --help` for more instructions about
the arguments.

Run `pip3 install -r requirements.txt` to install the Python packages used by
the script.
