# coptic

Ⲉ̀ϣⲱⲡ ⲁⲓϣⲁⲛⲉⲣⲡⲉⲱⲃϣ Ⲓⲗ̅ⲏ̅ⲙ̅, ⲉⲓⲉ̀ⲉⲣⲡⲱⲃϣ ⲛ̀ⲧⲁⲟⲩⲓⲛⲁⲙ: Ⲡⲁⲗⲁⲥ ⲉϥⲉ̀ϫⲱⲗϫ ⲉ̀ⲧⲁϣ̀ⲃⲱⲃⲓ ⲉ̀ϣⲱⲡ
ⲁⲓϣ̀ⲧⲉⲙⲉⲣⲡⲉⲙⲉⲩⲓ.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [How to Get the Flashcards](#how-to-get-the-flashcards)
- [Contact and Contributions](#contact-and-contributions)
- [Plans / Improvements](#plans--improvements)
  - [Manual Data Collection](#manual-data-collection)
    - [Crum: New Fields](#crum-new-fields)
    - [Moawad Dawoud's Diciontary](#moawad-dawouds-diciontary)
    - [Crum's Dictionary](#crums-dictionary)
    - [Other Dictionaries](#other-dictionaries)
    - [Neologisms](#neologisms)
  - [Documentation](#documentation)
  - [Coding](#coding)
    - [The Bible](#the-bible)
    - [Crum (Marcion)](#crum-marcion)
    - [New Dictionaries Parsing or Crawling](#new-dictionaries-parsing-or-crawling)
    - [Collaborator Convenience](#collaborator-convenience)
    - [Platform](#platform)
    - [Developer Convenience](#developer-convenience)
    - [Archive](#archive)
- [Notes For Developers](#notes-for-developers)
  - [Directory Structure](#directory-structure)
  - [Anki Keys and Synchronization](#anki-keys-and-synchronization)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

This repo hosts a Coptic flashcard / dictionary project that aims at making the
language more **learnable**.

## How to Get the Flashcards

Download Anki
([Android](https://play.google.com/store/apps/details?id=com.ichi2.anki),
[iOS](https://apps.apple.com/us/app/ankimobile-flashcards/id373493387),
[Decktop](https://apps.ankiweb.net/)).

Download [the Coptic package](https://drive.google.com/file/d/1KV0fH23Zucmlvdc0dwTJiDdqKIvbuYY_/view?usp=sharing),
and open it / import it in Anki.

## Contact and Contributions

You can reach out at <pishoybg@gmail.com> for any questions, or if you want to
contribute.

There are two ways you can contribute:

- Manual data collection (no programming expertise needed).

- Coding.

This page documents the tasks. More documentation will be added in the future.
Also feel free to reach out with questions.

## Plans / Improvements

### Manual Data Collection

#### Crum: New Fields

1. **Collect more explanatory pictures.**

1. Collect more explanatory notes.

1. ? Add a meanings that would be displayed on top before Crum's translation.
   Some of Crum's translations are obscure.

1. ? Add literature citations. Perhaps from Scriptorium? Perhaps from the
   Bible?

1. ? Add pronunciations.

#### Moawad Dawoud's Diciontary

1. **Add a column in `roots.tsv` containing Moawad Dawoud's page numbers, and add
   scans to the flashcards.**

1. **Add a column containing Moawad Dawoud's Arabic translations.**

1. **Add a column containing Moawad Dawoud's standardized spellings.**

1. Copy the Greek loanwords from Moawad into a new flashcard deck. (This may be
   less urgent if you incorporate Scriptorium's data, which you must do
   anyway.)

#### Crum's Dictionary

1. Record the correct list of Crum pages containing a given word. We've
   populated the data with a default value of two pages for each word.

1. Fix the typos in the data retrieved from Crum. The current dataset is
   high-quality, and has a very small number of typos. However, they do exist.
   (This is more of an ongoing effort than a task.)

1. Contemplate sorting the dictionary words by popularity.

1. Contemplate dividing the decks to subsets sorted by popularity, so the
   learners can learn the more important words first.

#### Other Dictionaries

1. Add data from St. Shenouda The Archimandrite Coptic Society's Dictionary.

1. Incorporate the Naqlun dictionary's data. It is poor-quality, but it might
   be attractive for some learners.

1. Incorporate the ⲛⲓⲣⲉϥⲤⲁϫⲓ ⲛ̀ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ Group's neologisms. They did substantial
   work that might be worth incorporating.

#### Neologisms

1. ? Add neologisms. (We need to think first of how to create neologisms before
   we add them to our dataset.)

### Documentation

1. **Improve the repo documentation.**

1. **Move the TODO's to the correct directories.**

1. **Link Drive items in this repo.**

1. **Move / reproduce TODO's from the code in the README files. Only
   low-priority, niche items should stay in the code. Run `grep TODO -R ${DIR}`
   to find the TODO's.**

   At the moment, all the relevant code TODO's are here:

   ```bash
   grep TODO dictionary/marcion.sourceforge.net/*.py bible/stshenouda.org/*.py
   ```

1. **Move / reproduce TODO's from Drive in the README files.**

1. **Wrap your head around the list of projects. Rate each project based on
(1) feasibility and (2) impact. Highlight the low-hanging fruits. Revisit the
bookmarks.**

1. **Rename "bible/" to "literature/" since all literature is welcome.**

1. **Move the Anki generator to a new directory right under the root.**

1. **The following README.md files may be nested too deeply within the repo.
Consider bringing them closer to the root in order to make the information
easier to retrieve.**

- `./bible/stshenouda.org/README.md`
- `./dictionary/copticocc.org/README.md`
- `./dictionary/marcion.sourceforge.net/README.md`
- `./dictionary/marcion.sourceforge.net/data/README.md`
- `./dictionary/marcion.sourceforge.net/data/img/README.md`
- `./dictionary/stshenouda.org/data/README.md`
- `./dictionary/apps.ankiweb.net/README.md`

1. **Document the repo properly and invite collaborators.**

1. **Use "Crum" in place of "Marcion".**

1. Document the root directories that the scripts typically run from.

1. Document the snapshot dates and versions of the apps and data imported
into the repo.

### Coding

#### The Bible

1. **Order the Bible books and chapters.**

#### Crum (Marcion)

1. **Add a Sahidic version and a complete version of the dictionary.**

1. **Add word derivations to a TSV, and then to the flashcards.**

#### New Dictionaries Parsing or Crawling

1. **Incorporate copticsite.com's dictionary into a deck. The data is
   poor-quality and unkeyed, but easier to incorporate, and could perhaps
   attract Arabic-speaking learners.**

1. **Incorporate Scriptorium's data. Gain familiarity with their platform.
   Parse their dictionary.**

1. Crawl [Wiktionary - Category:Coptic lemmas](https://en.wiktionary.org/wiki/Category:Coptic_lemmas).

#### Collaborator Convenience

1. **Support more seamless integration between Drive and your scripts.**

1. **It might be easier for contributors if the "Notes" field in the Anki package
   should be retrieved from a Drive folder or gsheet, rather than a Git
   directory.**

1. **Consider retrieving the images from a Drive folder or even from a
   spreadsheet if possible.**

   Thought: Another possibility is for Git to continue to be the source of truth.
   But what we can do is have users share their contributions via Drive, and then
   we will implement a pipeline to integrate the contributions made through Drive
   into Git.

#### Platform

1. **Deploy the flashcards on a standalone app.**

1. Revisit the possibility of publishing the decks through Anki.

#### Developer Convenience

1. Add unit tests.

1. Add hooks (pre-commits?), Makefile, or something similar, to exercise more
   control on the code. You could run unit tests, `doctoc README.md`, and also
   force the data to follow a certain structure.

1. Add doc comments, type hints, assertions, and stripping.

1. Force type hints. Use
   [type_enforced](https://github.com/connor-makowski/type_enforced).

1. Collect and print stats.

1. Learn more Vim!

#### Archive

1. Synchronization seems to be working fine. However, running the generation
   script twice produces a different file, and reimporting (supposedly
   identical data) produces the message "notes were used to update existing
   ones. Investigate.

1. ? Use the either-or feature and the `SEQ` field type to generate keys for
   Bible verses without references.

1. Revisit the possibility of image compression to minimize the package size.

## Notes For Developers

### Directory Structure

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

### Anki Keys and Synchronization

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

   For the Bible, we could use the verse reference as a note ID, and ensure
   that the book names, chapter numbers, and verse numbers don't change in a
   following version.

   For other data creators without programming expertise, a sequence number
   works as long as nobody inserts a new row in the middle of the CSV, which
   would mess up the keys. **Discuss keying with those creators.**

   1. Deck ID

   We use a hash of the deck name. **The deck name becomes a protected field.**

   1. Model ID

   We use a hash of the model id. **The model name becomes a protected field.**
