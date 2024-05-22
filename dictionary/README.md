# dictionary

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Marcion](#marcion)
  - [`marcion-raw/`](#marcion-raw)
  - [`marcion-input/`](#marcion-input)
  - [`output/`](#output)
  - [`img/`](#img)
  - [`crum`](#crum)
  - [`obsolete/`](#obsolete)
  - [(planned) `dawoud-raw`](#planned-dawoud-raw)
  - [(planned) `dawoud-input`](#planned-dawoud-input)
  - [(planned) `notes`](#planned-notes)
- [copticocc.org](#copticoccorg)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Marcion

Identical data was retrieved from [Marcion](http://marcion.sourceforge.net/) in
both SQL and HTML formats. The directory contains the raw data, processing
scripts, as well as some utilities.

### `marcion-raw/`

This directory contains raw, uncurated data from Marcion.

- `cop-3357-8977-3.msql` represents the raw data retrieved from Marcion.
  It contains two tables, namely `coptwrd` and `coptdrv`.

- `coptwrd.tsv` and `coptdrv.tsv`, represent simple rewriting of the raw data
  in `tsv` format.

- `coptwrd.tab` contains a lot of redundant data. It may have been used as an
  index for the purpose of increasing search efficiency.

- `search_results.html` was obtained by searching for the regex `.*` in the
  web version of Marcion.

P.S. It is possible that some typos have been corrected in the `tsv` files. In
this case, the `msql` file should prevail, and the corrections should be undone
in the interest of preserving blind copying fidelity to Marcion.

### `marcion-input/`

This directory contains curated versions of the subset of interest of the files
in `marcion-raw/`. Curation is an ongoing process, so the data in this
directory can change with some liberty. Primarily, our purpose is to fix the
typos. File histories should show the changes. You can also run
`diff marcion-input/${FILE_NAME} marcion-raw/${FILE_NAME}` to view the
differences.

### `output/`

- `roots.csv` contains the roots in TSV format.

- (planned) `derivations.csv` contains the derivations in TSV format.

- (planned) `combined.csv` contains the roots and derivations in TSV format.

- (planned) `anki.apkg` contains a generated [Anki](https://apps.ankiweb.net/)
  package.

### `img/`

This directory contains explanatory images, named according to the keys used in
Marcion.

The image file names should have the format
`${KEY}-${SENSE}-${SEQUENCE}.${EXTENSION}` or `${KEY}-${SEQUENCE}.${EXTENSION}`.

If three fields are given, the second field (the sense) is used to indicate
which sense of the word the image represents. This is useful for words that have
different (potentially unrelated or even conflicting) meanings. The second
field is optional. If two fields are given in the image name, the image will be
understood as representing some basic sense of the words.
If, for a certain words, images are given in both formats, the senseless images
will precede the sense-indicated images, and the sense-indicated images will be
sorted according to the integer used to represent the sense.

### `crum`

This directory contains scans of the pages in Crum's dictionary, also obtained
from Marcion.

### `obsolete/`

This directory contains obsolete files.

- `coptwrd.txt` seems to represent raw data, and is used as an input file in
  the code. Though it's possible that it was generated from the raw
  `coptwrd.tsv` using an earlier version of the script, and blindly used
  afterwards. It has been abandoned in the interest of keeping a single source
  of truth, and due to the fact that it contains a subset of the data.

- `coptwrd.txt.anki.txt` in an Anki dataset derived from `coptwrd.txt`.

- `marcion-crum.tsv` is obtained from the raw `coptwrd.tsv` by augmenting the
  data with extra columns containing a unicode version of the `word` column,
  and a per-dialect column.

### (planned) `dawoud-raw`

This directory contains raw data from Moawad Dawoud's dictionary.

### (planned) `dawoud-input`

This directory contains curated data from Moawad Dawoud's dictionary.

### (planned) `notes`

This directory contains notes. We can exercise full liberty over the contents
of this file.

## copticocc.org

`dawoud-D100/` contains scans of Moawad Dawoud's dictionary. They are obtained
from the PDF using the following imagemagick command (The density used is 100,
hence the prefix `-D100`.):

```bash
convert -density 100 -colorspace sRGB dawoud.pdf %d.jpg
```

The PDF was obtained [from the Coptic Treasures
website](https://coptic-treasures.com/book/coptic-dictionary-moawad-abd-al-nour/).
