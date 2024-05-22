# coptic

Ⲉ̀ϣⲱⲡ ⲁⲓϣⲁⲛⲉⲣⲡⲉⲱⲃϣ Ⲓⲗ̅ⲏ̅ⲙ̅, ⲉⲓⲉ̀ⲉⲣⲡⲱⲃϣ ⲛ̀ⲧⲁⲟⲩⲓⲛⲁⲙ: Ⲡⲁⲗⲁⲥ ⲉϥⲉ̀ϫⲱⲗϫ ⲉ̀ⲧⲁϣ̀ⲃⲱⲃⲓ ⲉ̀ϣⲱⲡ
ⲁⲓϣ̀ⲧⲉⲙⲉⲣⲡⲉⲙⲉⲩⲓ.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [How to Get the Flashcards](#how-to-get-the-flashcards)
- [Contact and Contributions](#contact-and-contributions)
- [Manual Data Collection](#manual-data-collection)
  - [Crum: New Fields](#crum-new-fields)
  - [Moawad Dawoud's Diciontary](#moawad-dawouds-diciontary)
  - [Crum's Dictionary](#crums-dictionary)
  - [Other Dictionaries](#other-dictionaries)
  - [Neologisms](#neologisms)
  - [Learning Curriculum](#learning-curriculum)
- [Credits](#credits)
- [For Developers](#for-developers)
  - [Documentation Tasks](#documentation-tasks)
  - [Coding Tasks](#coding-tasks)
    - [Collaborator Convenience](#collaborator-convenience)
    - [Flashcards](#flashcards)
    - [Developer Convenience](#developer-convenience)
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

## Manual Data Collection

### Crum: New Fields

1. **Collect more explanatory pictures.** (100+ hours, delegate)

   This will significantly aid the
   learning process, and it will save learners the time that they have to spend
   on looking up the obscure vocabulary or unfamiliar terms.

1. Collect more explanatory notes.

1. Add a meanings that would be displayed on top before Crum's translation.
   Some of Crum's translations are obscure or outdated (meaning either that the
   translation is archaic, or that we understand the meaning of the word better
   than he did back then).

1. Add literature citations. Perhaps from Scriptorium? Perhaps from the
   Bible?

1. Add pronunciations.

### Moawad Dawoud's Diciontary

1. **Add Moawad Dawoud's page numbers, and add scans to the flashcards.** (50+
   hours, delegate)

1. Add Moawad Dawoud's Arabic translations.

1. Add Moawad Dawoud's standardized spellings.

1. Copy the Greek loanwords from Moawad into a new flashcard deck. (This may be
   less urgent if you incorporate Scriptorium's data, which you must do
   anyway.)

1. Digitalize the entirety of Dawoud's dictionary.

### Crum's Dictionary

1. Record the correct list of Crum pages containing a given word. We've
   populated the data with a default value of two pages for each word.

1. Fix the typos in the data retrieved from Crum. The current dataset is
   high-quality, and has a very small number of typos. However, they do exist.
   (This is more of an ongoing effort than a task.)

1. Contemplate sorting the dictionary words by popularity, somehow.

1. Contemplate dividing the decks to subsets sorted by popularity, so the
   learners can learn the more important words first.

### Other Dictionaries

1. Add data from St. Shenouda The Archimandrite Coptic Society's Dictionary.

1. Incorporate the Naqlun dictionary's data. It is poor-quality, but it might
   be attractive for some learners.

1. Incorporate the ⲛⲓⲣⲉϥⲤⲁϫⲓ ⲛ̀ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ Group's neologisms. They did substantial
   work that might be worth incorporating.

### Neologisms

1. Add neologisms. (We need to think first of how to create neologisms before
   we add them to our dataset.)

### Learning Curriculum

1. Create Duolingo-like learning curricula for learners at multiple levels.

## Credits

The data used here was digitalized and published through the efforts of:

1. Milan Konvicka, creator of [Marcion](https://marcion.sourceforge.net/)

1. Hany Takla, founder of [Saint Shenouda The Archimandrite – Coptic
   Society](http://stshenouda.org/)

1. Osama Thabet, creator of [copticsite.com](https://copticsite.com/)

## For Developers

### Documentation Tasks

(7-8 hours)

1. **Reduce the confusion surrounding names and IDs.**

1. **Add screenshots of the flashcards in this repo.**

1. **Use "Crum" in place of "Marcion".**

1. **Move / reproduce TODO's from the code in the README files. Only
   low-priority, niche items should stay in the code.**

   ```bash
   grep TODO -R bible dictionary keyboard flashcards
   ```

1. **Some README.md files may be nested too deeply within the repo.
Consider bringing them closer to the root in order to make the information
easier to retrieve.**

```bash
find -type f -name README.md
```

1. **Document the repo in a way that makes it possible to invite collaborators.**

1. Document the snapshot dates and versions of the apps and data imported
into the repo.

1. **Link Drive items in this repo.**

1. **Move / reproduce TODO's from Drive in the README files.**

### Coding Tasks

#### Collaborator Convenience

1. **Support more seamless integration between Drive and your scripts.** (3-4
   hours)

   Likely, this means letting them contribute through Drive instead of Git.
   List the data sources, and redirect the flow to Drive (think about this!)
   A few sources that immediately come to my mind are:

   - Crum
   - Crum's Notes
   - Crum's Images
   - The Bible
   - copticsite.com's Dictionary
   - Dawoud's screenshots

   Thinking about Drive, it might be even easier for users to contribute
   through a sheet instead of a Drive folder (e.g. for notes). Use sheets
   whenever possible.

   Thought: Another possibility is for Git to continue to be the source of truth.
   But what we can do is have users share their contributions via Drive, and then
   we will implement a pipeline to integrate the contributions made through Drive
   into Git.

#### Flashcards

1. **Deploy the flashcards on a standalone app.** (100+ hours, delegate)

1. **Incorporate Scriptorium's data. Gain familiarity with their platform.
   Parse their dictionary.** (7-8 hours, delegated)

1. **Add word derivations to a TSV, and then to the flashcards.** (3-4 hours)
   See [this
file](https://github.com/pishoyg/coptic/blob/master/archive%2Fmarcion-1.8.3-src%2Fcrumresulttree.cpp)
for how Marcion constructs the derivations tree.

1. **Publish the decks through Anki.** (1 hours)

1. Flashcard synchronization seems to be working fine. However, running the
   generation script twice produces a different file, and reimporting
   (supposedly identical data) produces the message "notes were used to update
   existing ones. Investigate.

   Followup: This is likely due to the timestamps that the notes are recorded
   with. The newer timestamps make Anki think that the cards are newer. It is
   best, when exporting a new version of the package, to only include the notes
   that have changed content. `genanki` doesn't have a friendly way to support
   this (not even by reading the existing package and comparing the new data
   against it), so we will likely have to do lots of manual work to avoid the
   problem.

1. Understand note sorting. (`genanki` has a `sort_key` argument.)

1. Revisit the possibility of image compression to minimize the package size.

1. **Crawl [Wiktionary - Category:Coptic lemmas](
https://en.wiktionary.org/wiki/Category:Coptic_lemmas).** (20+ hours, delegate)

1. Use the newer version of [copticsite.com](https://copticsite.com/) once
   published.

#### Developer Convenience

(20+ hours)

This is not a list of tasks, but more of a list of ideas that you can choose to
abide by if you want to.

1. Expand the unit tests.

1. Define a `uniqueness_tracker` type.

1. Expand the use of hooks and Makefile.

1. Do not let Python tempt you to use its built-in types instead of classes and
   objects. Don't forget about OOP!

1. Document the code.

1. Add assertions and throw exceptions for any assumptions that you make. They
   catch a lot of bugs! A lot!

1. Strip inputs more liberally.

1. Force type hints. Use
   [type_enforced](https://github.com/connor-makowski/type_enforced).

1. Collect and print stats.

1. Learn more Vim!

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
