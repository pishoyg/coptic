# coptic

**Ⲉ̀ϣⲱⲡ ⲁⲓϣⲁⲛⲉⲣⲡⲉⲱⲃϣ Ⲓⲗ̅ⲏ̅ⲙ̅, ⲉⲓⲉ̀ⲉⲣⲡⲱⲃϣ ⲛ̀ⲧⲁⲟⲩⲓⲛⲁⲙ: Ⲡⲁⲗⲁⲥ ⲉϥⲉ̀ϫⲱⲗϫ ⲉ̀ⲧⲁϣ̀ⲃⲱⲃⲓ ⲉ̀ϣⲱⲡ ⲁⲓϣ̀ⲧⲉⲙⲉⲣⲡⲉⲙⲉⲩⲓ.**

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [`apps.ankiweb.net/`](#appsankiwebnet)
  - [TODO (data collection)](#todo-data-collection)
    - [Crum](#crum)
    - [Moawad Dawoud's Dictionary](#moawad-dawouds-dictionary)
    - [Research](#research)
  - [TODO (diplomacy)](#todo-diplomacy)
  - [TODO (documentation)](#todo-documentation)
  - [TODO (programming)](#todo-programming)
    - [Script Features](#script-features)
    - [Data Included](#data-included)
    - [Drive and Sharability](#drive-and-sharability)
    - [Appearance](#appearance)
    - [Package Sharability](#package-sharability)
  - [Keys and Synchronization](#keys-and-synchronization)
- [`marcion.sourceforge.net/`](#marcionsourceforgenet)
- [`kellia.uni-goettingen.de/`](#kelliauni-goettingende)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


This repo hosts several projects for the following purpose:

- Snapshotting / archiving existing digital projects relating to the Coptic
language.

- Creating tools that make Coptic more **learnable**.

The repo contains several projects that are categorized under broad categories,
such as `bible`, `dictionary`, and `keyboard`. Each category is represented by
a directory, and subdirectories contain separate, usually unrelated projects.

## Directory Structure

- `bible/`

    This directory contains Biblical data, used to generate HTML and EPUB
    versions of the Bible and the like.

- `dictionary/`

    This directory contains dictionary data, used to generate flashcards, CSV
    files and the like.

- `keyboard/`

    This directory contains Keyboard layouts.

- `archive/`

    This directory contains snapshots of published apps or repos, utilities, and
    even some abandoned projects.
    Data retrieved from another app or repo will live here, and could be used /
    reprocessed by projects in the repo.

## Contact

pishoybg@gmail.com

## Contributing

Please feel free to:

- Reach out with questions / suggestions.

- Submit a merge request.

## Copyrights

I don't care! Do whatever you want with the data / code you published here.

# `apps.ankiweb.net/`

Download [Anki](https://ankiweb.net/).

Download [the Coptic package](https://drive.google.com/file/d/1KV0fH23Zucmlvdc0dwTJiDdqKIvbuYY_/view?usp=sharing),
and open it / import it in Anki.

## TODO (data collection)

### Crum

1. Record the correct list of Crum page containing a given word. We've
   populated the data with a default value of two pages for each word.

### Moawad Dawoud's Dictionary

1. **Copy the Greek loanwords from Moawad into a new flashcard deck.**

1. Add a column in `roots.tsv` containing Moawad Dawoud's page numbers, and add
   scans to the flashcards.

1. Add a column containing Moawad Dawoud's standardized spellings.

1. Add a column containing Moawad Dawoud's Arabic translations.

### Research

1. **Collect more explanatory pictures.**

1. Add a notes column.

1. Support pronunciations.

1. Add a meaning column that would be displayed on top before Crum's
   translation.

1. Fix the typos in the data retrieved from Crum.

1. Contemplate adding literature citations (perhaps after incorporating
   Scriptorium).

1. Contemplate adding neologisms (somehow)!

## TODO (diplomacy)

1. Add data from St. Shenouda The Archimandrite Coptic Society's Dictionary.
   (Discuss keying the words with them, to support synchronization with future
   versions of their dictionary.)

1. Incorporate the Naqlun dictionary's data.

1. Incorporate the ⲛⲓⲣⲉϥⲤⲁϫⲓ ⲛ̀ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ Group's neologisms.

## TODO (documentation)

1. **Improve the repo documentation.**

1. **Move the TODO's to the correct directories.**

1. **Link Drive items in this repo.**

1. **Move / reproduce TODO's from the code in the README files. Only
   low-priority, niche items should stay in the code. Run `grep TODO -R ${DIR}`
   to find the TODO's.**

   At the moment, all the relevant code TODO's are here:

   ```
   grep TODO dictionary/marcion.sourceforge.net/*.py bible/stshenouda.org/*.py
   ```

1. **Move / reproduce TODO's from Drive in the README files.**

1. Document the root directories that the scripts typically run from.

## TODO (programming)

### Script Features

1. **Allow either-or fields.**

1. **Use the either-or feature to put something in the front when the existing
   front (usually Bohairic) is missing.**

1. **Implement a `SEQ` field type.**

1. **Use the either-or feature and the `SEQ` field type to generate keys for
   Bible verses without references.**

1. **Order the Bible books and chapters.**

1. Contemplate sorting the dictionary words by popularity. For now, you can
   rely on simple string matching against the Bible data, and perhaps manually
   modify it later.

### Datasets

1. **Add word derivations to a TSV, and then to the flashcards.**

1. **Incorporate copticsite.com's dictionary into a package.** The data is
   poor-quality and unkeyed, but easier to incorporate.

1. **Incorporate Scriptorium's data. Gain familiarity with their platform.
   Parse their dictionary.**

1. Contemplate crawling [Wiktionary - Category:Coptic lemmas
](https://en.wiktionary.org/wiki/Category:Coptic_lemmas).

### Sharability for Collaborators

1. **Support more seamless integration between Drive and your scripts.**

1. It might be easier for contributors if the "Notes" field in the Anki package
   should be retrieved from a Drive folder or gsheet, rather than a Git
   directory.

1. Consider retrieving the images from a Drive folder or even from a
   spreadsheet if possible.

Thought: Another possibility is for Git to continue to be the source of truth.
But what we can do is have users share their contributions via Drive, and then
we will implement a pipeline to integrate the contributions made through Drive
into Git.

### Sharability for Learners

1. Revisit the possibility of image compression to minimize the package size.

1. Revisit the possibility of publishing the decks through Anki.

### Appearance

1. Label the images, in order to make it clear that they represent different
   senses.

1. Consider padding the images.

## TODO(sort)

**TODO: Wrap your head around the list of projects. Rate each project based on
(1) feasibility and (2) impact. Highlight the low-hanging fruits. Revisit the
bookmarks.**

*TODO: Document the snapshot dates and versions of the apps and data imported
into the repo.*

*TODO: Rename "bible/" to "literature/" since all literature is welcome.*

**TODO: The following README.md files may be nested too deeply within the repo.
Consider bringing them closer to the root in order to make the information
easier to retrieve.**

- `./bible/stshenouda.org/README.md`
- `./dictionary/copticocc.org/README.md`
- `./dictionary/marcion.sourceforge.net/README.md`
- `./dictionary/marcion.sourceforge.net/data/README.md`
- `./dictionary/marcion.sourceforge.net/data/img/README.md`
- `./dictionary/stshenouda.org/data/README.md`
- `./dictionary/apps.ankiweb.net/README.md`

**TODO: Document the repo properly and invite collaborators.**

*TODO: Add unit tests.*

*TODO: Add hooks (pre-commits?) to exercise more control on the code.*

## Synchronization

1. Synchronization seems to be working fine. However, running the generation
   script twice produces a different file, and reimporting (supposedly
   identical data) produces the message "notes were used to update existing
   ones. Investigate.

## Keys and Synchronization

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

   In our script, we ask the user to provide a list of keys as part of their
   input, along the list of fronts, backs, deck names, ... etc. (That's already
   all of them, eh?)
   The users of the package must assign the keys properly, ensuring uniqueness,
   and refraining from changing / reassigning them afterwards.

   This is somewhat straightforward for Marcion's words. Use of Marcion's IDs
   for synchronization should suffice.

   For other, data creators without programming expertise, a sequence number
   works as long as nobody inserts a new row in the middle of the CSV, which
   would mess up the keys. Discuss keying with those creators.

   For the Bible, we could use the verse reference as a note ID, and ensure
   that the book names, chapter numbers, and verse numbers don't change in a
   following version.

   1. Deck ID

   We use a hash of the deck name. The deck name becomes a protected field.

   1. Model ID

   We use a hash of the model id. The model name becomes a protected field.

# `marcion.sourceforge.net/`

This project processes an electronic version of Crum's Dictionary,
manually copied by Milan Konvicka.

# `kellia.uni-goettingen.de/`

Scriptorium doesn't need an intro. This ambitious project has created
many successful tools, while maintaining strong academic rigor and
discipline. It is likely that Scriptorium's dictionary will become the
standard, or at least serve as a seed to a neologism-girded standard
(since neologisms are out of the current scope of Scriptorium).
