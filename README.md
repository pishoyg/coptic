# coptic

Ⲉ̀ϣⲱⲡ ⲁⲓϣⲁⲛⲉⲣⲡⲉⲱⲃϣ Ⲓⲗ̅ⲏ̅ⲙ̅, ⲉⲓⲉ̀ⲉⲣⲡⲱⲃϣ ⲛ̀ⲧⲁⲟⲩⲓⲛⲁⲙ: Ⲡⲁⲗⲁⲥ ⲉϥⲉ̀ϫⲱⲗϫ ⲉ̀ⲧⲁϣ̀ⲃⲱⲃⲓ ⲉ̀ϣⲱⲡ
ⲁⲓϣ̀ⲧⲉⲙⲉⲣⲡⲉⲙⲉⲩⲓ.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [How to Get the Flashcards](#how-to-get-the-flashcards)
  - [Description](#description)
    - [A Coptic Dictionary](#a-coptic-dictionary)
    - [copticsite.com](#copticsitecom)
  - [Contact and Contributions](#contact-and-contributions)
  - [For Developers / Owners](#for-developers--owners)
    - [Getting started](#getting-started)
    - [Directory Structure](#directory-structure)
    - [`data/`](#data)
    - [`.env`](#env)
    - [`stats`](#stats)
    - [Languages](#languages)
    - [Planning](#planning)
      - [Issues](#issues)
      - [Milestones](#milestones)
      - [Labels](#labels)
    - [Technical Guidelines](#technical-guidelines)
  - [Data Collection](#data-collection)
  - [Credits](#credits)
- [dictionary](#dictionary)
  - [Marcion](#marcion)
    - [Data Store](#data-store)
      - [`marcion-raw/`](#marcion-raw)
      - [`marcion-input/`](#marcion-input)
      - [`output/`](#output)
      - [`img/`](#img)
      - [`crum`](#crum)
      - [`obsolete/`](#obsolete)
      - [(planned) `dawoud-raw`](#planned-dawoud-raw)
      - [(planned) `dawoud-input`](#planned-dawoud-input)
      - [(planned) `notes`](#planned-notes)
    - [Undialected Entries](#undialected-entries)
  - [copticocc.org](#copticoccorg)
- [bible](#bible)
  - [Data](#data)
    - [Output Directories](#output-directories)
    - [Output Files](#output-files)
- [flashcards](#flashcards)
  - [Anki Keys and Synchronization](#anki-keys-and-synchronization)
  - [Type Enforcement](#type-enforcement)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

This repo hosts a Coptic flashcard / dictionary project that aims to make the
language more **learnable**.

## How to Get the Flashcards

1. Download Anki ([Android](https://play.google.com/store/apps/details?id=com.ichi2.anki),
[iOS](https://apps.apple.com/us/app/ankimobile-flashcards/id373493387)\*,
[Desktop](https://apps.ankiweb.net/)).

   (\**The iOS version is
paid, unfortunately!*)

2. Download [the Coptic package](https://drive.google.com/file/d/1KV0fH23Zucmlvdc0dwTJiDdqKIvbuYY_/view?usp=sharing),
and open it / import it in Anki. This package includes all the data.

   **N.B. The package is updated regularly (almost daily), so make sure
   to save the link and come back occasionally to download the updated version.**

## Description

The package includes two types of flashcard decks. While the purpose of the
app is to help you learn vocabulary through spaced repetition, it also doubles
as a dictionary because it's searchable.

### A Coptic Dictionary

This is a essentially a **complete** digital version of Crum. The front of the
card shows the *root* spellings. You can choose to view the front in Bohairic,
Sahidic, or all dialects.

<div align="center">
   <figure>
      <img src="flashcards/data/img/a-coptic-dictionary/front/bohairic.png" alt="bohairic front" width="200"/>
      <img src="flashcards/data/img/a-coptic-dictionary/front/sahidic.png" alt="sahidic front" width="200"/>
      <img src="flashcards/data/img/a-coptic-dictionary/front/all.png" alt="all-dialect front" width="200"/>
      <br>
      <figcaption> Front in Bohairic, Sahidic, or All Dialects </figcaption>
   </figure>
</div>

The back of the card shows the full list of spellings per dialect, the meaning,
and the derivations table (with prepositions, derived words, ... etc.)
It also includes scans of the Crum pages containing the words, and tells you
where exactly you can find the definition. This data is fully obtained from
Crum's dictionary.

<div align="center">
   <figure>
      <img src="flashcards/data/img/a-coptic-dictionary/back/01.png" alt="back" width="200"/>
      <img src="flashcards/data/img/a-coptic-dictionary/back/02.png" alt="back" width="200"/>
      <img src="flashcards/data/img/a-coptic-dictionary/back/03.png" alt="back" width="200"/>
      <img src="flashcards/data/img/a-coptic-dictionary/back/04.png" alt="back" width="200"/>
      <br>
      <figcaption> Back </figcaption>
   </figure>
</div>

In some cases, the back includes explanatory pictures as well. The purpose of
the explanatory images is to aid learning by engaging your visual memory as
well, and also to clarify the meaning when the translation is unclear (in many
cases, you will find yourself looking up images anyway to understand the word,
such as with exotic plant species, ancient crafts and tools, ...) Collecting
explanatory images is an ongoing effort.

<div align="center">
   <figure>
      <img src="flashcards/data/img/a-coptic-dictionary/back-with-images/01.png" alt="back" width="200"/>
      <img src="flashcards/data/img/a-coptic-dictionary/back-with-images/02.png" alt="back" width="200"/>
      <img src="flashcards/data/img/a-coptic-dictionary/back-with-images/03.png" alt="back" width="200"/>
      <br>
      <figcaption> Example with Images </figcaption>
   </figure>
</div>

### copticsite.com

This is a simple Coptic / Arabic dictionary obtained from [copticsite.com](
https://copticsite.com/). It has more than 16,000 words, and it includes Greek
loanwords, as we as **neologisms liberally added by the author!**

<div align="center">

   <figure>
      <img src="flashcards/data/img/copticsite.com/front.png" alt="front" width="200"/>
      <img src="flashcards/data/img/copticsite.com/back.png" alt="back" width="200"/>
      <br>
      <figcaption> copticsite.com Front and Back </figcaption>
   </figure>

</div>

## Contact and Contributions

You can reach out at <pishoybg@gmail.com> for any questions, feedback, or if
you want to contribute. I always read my email, and I read it promptly.

There are two ways you can contribute:

- Manual data collection (no programming expertise needed).

- Coding.

The contribution pipeline is not yet well-defined. We plan to make it clearer
as to how exactly you can contribute (which files you can write, in which
formats, ... etc.) In the meantime, feel free to look below and reach out with
suggestions or questions, or data! :)

## For Developers / Owners

### Getting started

Running `make install` should take care of most of the python installations.

Some pipelines also use the following binaries:
- [tidy](https://www.html-tidy.org/)
- [magick](https://imagemagick.org/)

### Directory Structure

`dictionary/` contains subdirectories, each containing one dictionary, its data,
and the scripts used to process the data into other formats. `bible/` currently
contains a single subdirectory, containing [stshenouda.org](stshenouda.org)'s
version of the Coptic Bible, and the scripts used to process it.

`flashcards/` hosts the logic for creating the flashcard decks. It relies on
data produced under `dictionary/` and `bible/`.

`archive/` and `utils/` are not of particular interest.

There is a total of three README files in this repo. This is intentional, in
order to prevent the documentation from scattering all over. The other two are
under `dictionary/` and `bible/`, and they concern those subprojects
specifically.

Most scripts have default parameters with the assumption that they are being
invoked from the repo's root directory, rather than from the directory where
the script lives.

### `data/`

We have somewhat strict rules regarding our `data/` directory. It usually (and this means almost always) contains four
subdirectories:

- `raw/`: Data that is **copied** from elsewhere. This would, for example, include the Marcion SQL tables copied as is,
  unmodified. We don't use files in this directory as inputs to our program.

- `input/`: Data that we either *modified* or *created*. If we want to fix typos to data that we copied, we don't touch
  the data under `raw/`, but we take the liberty to modify the copies that live under `input/`. This directory also
includes the data that we created ourselves.

- `output/`: This contains the data written by our pipelines, **one subdirectory per format**. If your pipeline writes
both TSV and HTML, they should go respectively to `output/tsv/` and `output/html/`.

### `.env`

`.env` (which is hidden by a rule in `.gitignore`) contains the environment
variables. They are essential for some pipelines.

It is documented in `.env_INFO`, so this README section is intentionally brief.

### `stats`

- We collect extensive stats, and we force them using a pre-commit. The primary
  targets of our statistics are:
  - The size of our code (represented by the number of lines of code). We also
  collect this stat for each subproject or pipeline step independently.
  - The number of data items we've collected for data collection tasks.
  - We also record the number of commits, and the number of contributors.

### Languages

- Our pipelines are primarily written in Python. There is minimal logic in
  Bash.

- We have a strong bias for Python over Bash. Use Bash if you expect the number
of lines of code of an equivalent Python piece to be significantly more.

- We started using JavaScript for static web content, and we expect to make a
similar platform-specific expansion into another territory for the app.

- In the past, we voluntarily used Java (for an archived project). Won't happen
again! We also used VBA and JS for Microsoft Excel and Google Sheet macros,
because they were required by the platform (but those pieces are also archived
at the moment).

- It is desirable to strike a balance between the benefits of focusing on a
small number of languages, and the different powers that different language can
uniquely exhibit. We won't compromise the latter for the former. Use the
*right* language for a task. When two languages can do a job equally well,
uncompromisingly choose the one that is more familiar.

- You can view some code statistics in `stats.sh`.

### Planning

#### Issues

- We use GitHub to track our TODO's and plans. See [
Issues](https://github.com/pishoyg/coptic/issues).

#### Milestones

- To assist our planning, every issue must belong to a milestone. See [
Milestone](https://github.com/pishoyg/coptic/milestones/).

- When it comes to prioritization, generally speaking, we **assign priorities to
milestones**, and those dictate the priorities of their child issues.

- We don't assign priorities to individual issues, although, of course, within a
milestone, some issues will be higher-priority than others, and some issues
will be prerequisites for others. But we rely on our own memory for those.

- Milestone priorities are assigned using **due dates**. Milestones help make
long-term plans.
Their count should be in a small order of magnitude to make this possible.

- We also don't track issue sizes, or estimates for how much time they take.
Again, we rely on our memory for that.

- There is also a generic developer experience milestone, that is somewhat
perpetual, and has been growing to be synonymous to the `dev` label. Although
in cases when a `dev` task pertains to another milestone, the other milestone
trumps the developer experience milestone.

- Some milestones can be *done* while having open issues. In this sense, every
  milestone is perpetual, but we close it when it's good enough, and let the
issues attached to it live and show us what room there is for improvement if
any. We do this because it's a good option, and all the other options are
pretty bad:
  - Create another milestone for the tapering line of improvements.
  - Let the issues get orphaned (not having a parent milestone).
  - Keep the milestone open, although it's good enough.

  The developer experience milestone somewhat belongs to this category already.

#### Labels

- All issues should be labeled. See [
Labels](https://github.com/pishoyg/coptic/labels).

- We assign the following categories of labels to issues:

   - Nature of Tasks

     - How can the task be achieved? Coding? Diplomacy? Manual data
     collection? Planning? Writing Documentation?
     - Please note the following:
       - A coding task that facilitates data collection is a coding task, not a
       data collection task.
       - We don't assign a coding label, because that includes most tasks. A task
         that doesn't have a nature label should be a coding task.

   - Audience

     - Is the issue user-facing or developer-oriented?

   - We also have a generic `app` label and `bug` label.

### Technical Guidelines

1. Add in-code assertions and checks. This is our first line of defense, and
   has been the champion when it comes to ensuring correctness and catching
   bugs.

1. We rely heavily on manual inspection of the output to verify correctness.
   The `git --word-diff` command is helpful when our line-oriented `diff` is
   not readable. Keep this in mind when structuring your output data.

1. We use pre-commit hooks extensively, and they have helped us discover a lot
   of bugs and issues with our code, and also keep our repo clean.

1. We force the existence of unit tests, at least one for each Python file.
   While these have so far been mere placeholders, the mere import of a package
   sometimes catches syntax errors, and the placeholders will make it
   convenient to write tests whenever desired. A big benefit of unit tests is
   that they make us confident that a change is correct, so we can speed up the
   development process.

1. Do not let Python tempt you to use its built-in types instead of classes and
   objects. Don't forget about OOP!

1. Document the code.

1. We force type hints throughout the repo, although as a pipeline matures we
   disable them to reduce the running time. See
   [type_enforced](https://github.com/connor-makowski/type_enforced).
   - We tend to have an `enforcer` package that hosts the flag that enables or
     disables type enforcement. We also use it to define classes that we use
   for enforcement.

1. Collect and print stats.

1. Color the outputs whenever you can. It keeps your programmers entertained!

1. Keep your code `grep`-able, especially when it comes to the constants used
   across directories.

## Data Collection

Images:
- Here are some examples of words that are very difficult to represent using
images, but icons have come for the rescue:
  - https://metremnqymi.com/crum/2236.html
  - https://metremnqymi.com/crum/89.html
  - https://metremnqymi.com/crum/2189.html

## Credits

The data used here was digitalized and published through the efforts of:

1. Milan Konvicka, creator of [Marcion](https://marcion.sourceforge.net/)

1. Hany Takla, founder of [Saint Shenouda The Archimandrite – Coptic
   Society](http://stshenouda.org/)

1. Osama Thabet, creator of [copticsite.com](https://copticsite.com/)

1. [Kyrillos Wannes](https://twitter.com/kyrilloswannes), author of *Een
   Inleiding tot Bohairisch Koptisch*, who is rigorously
   collecting Marcion-Dawoud mapping for the flashcards project.

# dictionary

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Marcion](#marcion)
  - [Data Store](#data-store)
    - [`marcion-raw/`](#marcion-raw)
    - [`marcion-input/`](#marcion-input)
    - [`output/`](#output)
    - [`img/`](#img)
    - [`crum`](#crum)
    - [`obsolete/`](#obsolete)
    - [(planned) `dawoud-raw`](#planned-dawoud-raw)
    - [(planned) `dawoud-input`](#planned-dawoud-input)
    - [(planned) `notes`](#planned-notes)
  - [Undialected Entries](#undialected-entries)
- [copticocc.org](#copticoccorg)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Marcion

### Data Store

Identical data was retrieved from [Marcion](http://marcion.sourceforge.net/) in
both SQL and HTML formats. The directory contains the raw data, processing
scripts, as well as some utilities.

#### `marcion-raw/`

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

#### `marcion-input/`

This directory contains curated versions of the subset of interest of the files
in `marcion-raw/`. Curation is an ongoing process, so the data in this
directory can change with some liberty. Primarily, our purpose is to fix the
typos. File histories should show the changes. You can also run
`diff marcion-input/${FILE_NAME} marcion-raw/${FILE_NAME}` to view the
differences.

#### `output/`

- `roots.csv` contains the roots in TSV format.

- (planned) `derivations.csv` contains the derivations in TSV format.

- (planned) `combined.csv` contains the roots and derivations in TSV format.

- (planned) `anki.apkg` contains a generated [Anki](https://apps.ankiweb.net/)
  package.

#### `img/`

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

#### `crum`

This directory contains scans of the pages in Crum's dictionary, also obtained
from Marcion.

#### `obsolete/`

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

#### (planned) `dawoud-raw`

This directory contains raw data from Moawad Dawoud's dictionary.

#### (planned) `dawoud-input`

This directory contains curated data from Moawad Dawoud's dictionary.

#### (planned) `notes`

This directory contains notes. We can exercise full liberty over the contents
of this file.

### Undialected Entries

The following entries have no dialect specified in Crum, so they are treated as
part of all dialects.

1. https://metremnqymi.com/crum/1274.html
2. https://metremnqymi.com/crum/1292.html
3. https://metremnqymi.com/crum/1367.html
4. https://metremnqymi.com/crum/1462.html
5. https://metremnqymi.com/crum/1553.html
6. https://metremnqymi.com/crum/1555.html
7. https://metremnqymi.com/crum/1557.html
8. https://metremnqymi.com/crum/1558.html
9. https://metremnqymi.com/crum/1657.html
10. https://metremnqymi.com/crum/1659.html
11. https://metremnqymi.com/crum/1712.html
12. https://metremnqymi.com/crum/1957.html
13. https://metremnqymi.com/crum/2074.html
14. https://metremnqymi.com/crum/2075.html
15. https://metremnqymi.com/crum/2076.html
16. https://metremnqymi.com/crum/2077.html
17. https://metremnqymi.com/crum/2078.html
18. https://metremnqymi.com/crum/2079.html
19. https://metremnqymi.com/crum/2081.html
20. https://metremnqymi.com/crum/2082.html
21. https://metremnqymi.com/crum/2084.html
22. https://metremnqymi.com/crum/2085.html
23. https://metremnqymi.com/crum/2086.html
24. https://metremnqymi.com/crum/2087.html
25. https://metremnqymi.com/crum/2088.html
26. https://metremnqymi.com/crum/2090.html
27. https://metremnqymi.com/crum/2091.html
28. https://metremnqymi.com/crum/2092.html
29. https://metremnqymi.com/crum/2093.html
30. https://metremnqymi.com/crum/2195.html
31. https://metremnqymi.com/crum/2205.html
32. https://metremnqymi.com/crum/2832.html
33. https://metremnqymi.com/crum/3117.html
34. https://metremnqymi.com/crum/3230.html
35. https://metremnqymi.com/crum/3231.html
36. https://metremnqymi.com/crum/3257.html
37. https://metremnqymi.com/crum/3302.html

## copticocc.org

`dawoud-D100/` contains scans of Moawad Dawoud's dictionary. They are obtained
from the PDF using the following imagemagick command (The density used is 100,
hence the prefix `-D100`.):

```bash
convert -density 100 -colorspace sRGB dawoud.pdf %d.jpg
```

The PDF was obtained [from the Coptic Treasures
website](https://coptic-treasures.com/book/coptic-dictionary-moawad-abd-al-nour/).

# bible

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Data](#data)
  - [Output Directories](#output-directories)
  - [Output Files](#output-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

There are several published versions of the Coptic Bible. The most
recent, and most complete, is that of [St. Shenouda the Archmandrite
Coptic Society](stshenouda.org). It is the Coptic Bible project that is
most worthy of investment at the moment.

## Data

The `data/` directory contains raw (input) and output data.

The raw data was obtained from the Coptic Bible app published by [St. Shenouda
the Archimandrite Coptic Society](http://www.stshenouda.org/). (Download for
[iOS](https://apps.apple.com/us/app/coptic-bible/id1555182007),
[Android](https://play.google.com/store/apps/details?id=com.xpproductions.copticbible&hl=en&gl=US).)

### Output Directories

We produce the following output formats:

- `data/output/csv/`: A CSV (comma-separated values) file.

- `data/output/html*/`: HTML files (viewable in the browser).

- `data/output/epub*/`: EPUB files (suited for ebook readers).

### Output Files

Each of the output directories can contain several times that fall into one of
three categories:

- The files named `bible.${FORMAT}` contain the full data.

- The files named `${LANGUAGE}.${FORMAT}` contain data for a specific language.

- The files named `${LANGUAGE}_${LANGUAGE}.${FORMAT}` contain parallel data for
  a pair of languages. (Usually Bohairic-English is the pair of interest,
though you can control which pair(s) get generated using the CLI arguments.)

# flashcards

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
- [flashcards](#flashcards)

- [Anki Keys and Synchronization](#anki-keys-and-synchronization)
- [Type Enforcement](#type-enforcement)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Anki Keys and Synchronization

When you import a package into your (personal) Anki database, Anki uses the
IDs to eliminate duplicates.

Uniqueness is therefore important. But what is trickier, and perhaps more
important, is persistence. If we export new versions of a certain deck
regularly, we should maintain persistent IDs to ensure correct
synchronization. Otherwise, identical pieces of data that have distinct IDs
will result in duplicates.

There are three types of IDs in the generated package:

1. Note ID

`genanki`
[suggests](https://github.com/kerrickstaley/genanki?tab=readme-ov-file#note-guids)
defining the GUID as a hash of a subset of fields that uniquely identify a
note.

**The GUID must be unique across decks.** Therefore, this subset of field
values must be unique, including across decks. You can solve this by
prefixing the keys with the name of the deck.

In our script, we ask the user to provide a list of keys as part of their
input, along the list of fronts, backs, deck names, ... etc.
The users of the package must assign the keys properly, ensuring uniqueness,
and refraining from changing / reassigning them afterwards.

This is somewhat straightforward for Marcion's words. Use of Marcion's IDs
for synchronization should suffice.

For the Bible, we could use the verse reference as a note ID, and ensure
that the book names, chapter numbers, and verse numbers don't change in a
following version.

For other data creators without programming expertise, a sequence number
works as long as nobody inserts a new row in the middle of the CSV, which
would mess up the keys. **Discuss keying with those creators.** *As of today,
only copticsite.com's data has this problem.*

1. Deck ID

Whenever possible, we use a hardcoded deck ID. This is not possible for
decks that are autogenerated, such as the Bible decks which are separated
for nesting (as opposed to being grouped in a single deck). In such cases,
we use a hash of the deck name, and **the deck name becomes a protected
field.**

1. Model ID

Model IDs are hardcoded.

## Type Enforcement

Set `ENABLED = True` in `enforcer.py` during development in order to enable
type enforcement. It is disabled in production due to the high cost.
