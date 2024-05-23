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
  - [Neologisms](#neologisms)
  - [Learning Curriculum](#learning-curriculum)
  - [New Datasets](#new-datasets)
- [Credits](#credits)
- [For Developers](#for-developers)
  - [Documentation Tasks](#documentation-tasks)
  - [Coding Tasks](#coding-tasks)
    - [Collaborator Convenience](#collaborator-convenience)
    - [Flashcards](#flashcards)
    - [Developer Convenience](#developer-convenience)
  - [Diplomacy Tasks](#diplomacy-tasks)
  - [Directory Structure](#directory-structure)

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

## Current Status

The flashcards contain the following:

- A complete list of words from Crum, including both roots and derivations,
  per-dialect spellings, meaning in English and Greek, scans of the Crum pages
  containing the word definition.

  - (For a subset of the words) Explanatory images, added to aid the learning
  process, and to convey the meanings better.

- A version of the Coptic Bible, containing most Biblical fragments that
  survived in Coptic.

- A complete version of the dictionary published on copticsite.com.

Work is ongoing to augment the data, through integration of existing database,
as well as manual digitization of other data sources.

## Manual Data Collection

### Crum: New Fields

1. **Collect more explanatory pictures.** (100+ hours, delegate)

   This will significantly aid the
   learning process, and it will save learners the time that they have to spend
   on looking up the obscure vocabulary or unfamiliar terms.

1. **Link Scriptorium Lemmas to and Marcion Keys.**

1. Add pronunciations.

1. Add a meanings that would be displayed on top before Crum's translation.
   Some of Crum's translations are obscure or archaic, and some are outdated
   because we understand the meaning of the word better than he did back then.
   (low-priority)

1. Collect more explanatory notes. (low-priority)

1. Add literature citations. Perhaps from Scriptorium? Perhaps from the
   Bible? (low-priority)

### Moawad Dawoud's Diciontary

1. **Add Moawad Dawoud's page numbers, and add scans to the flashcards.** (50+
   hours, delegate)

1. Add Moawad Dawoud's Arabic translations.

1. Add Moawad Dawoud's standardized spellings. (low-priority)

1. Copy the Greek loanwords from Moawad into a new flashcard deck.
   (low-priority, especially if you incorporate Scriptorium's data, which you
   must do anyway.)

1. Digitalize the entirety of Dawoud's dictionary. (low-priority)

1. Get a cleaner scan of Dawoud's dictionary. Obtain the source PDF if posible.
   (low-priority)

### Crum's Dictionary

1. Record the correct list of Crum pages containing a given word. We've
   populated the data with a default value of two pages for each word.

1. Fix the typos in the data retrieved from Crum. The current dataset is
   high-quality, and has a very small number of typos. However, they do exist.
   (low-priority, and it's more of an ongoing byproduct than a task.)

1. Contemplate sorting the dictionary words by popularity, somehow.
   (low-priority)

1. Contemplate dividing the decks to subsets sorted by popularity, so the
   learners can learn the more important words first. (low-priority)

### Neologisms

(ambitious goal)

1. Add neologisms. We need to think first of how to create neologisms before
   we add them to our dataset.

### Learning Curriculum

(ambitious goal)

1. Create Duolingo-like learning curricula for learners at multiple levels.

### New Datasets

1. Add data from St. Shenouda The Archimandrite Coptic Society's Dictionary.

1. Incorporate the Naqlun dictionary's data. It is poor-quality, but it might
   be attractive for some learners. (low-priority)

1. Incorporate the ⲛⲓⲣⲉϥⲤⲁϫⲓ ⲛ̀ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ Group's neologisms. They did substantial
   work that might be worth incorporating.

## Credits

The data used here was digitalized and published through the efforts of:

1. Milan Konvicka, creator of [Marcion](https://marcion.sourceforge.net/)

1. Hany Takla, founder of [Saint Shenouda The Archimandrite – Coptic
   Society](http://stshenouda.org/)

1. Osama Thabet, creator of [copticsite.com](https://copticsite.com/)

## For Developers

For visibility, planned features and improvements must be documented in this
README file (not in any of the README files in the subdirectories).
Non-learner-facing coding tasks are sometimes documented in the code as TODO's,
and sometimes brought here.

### Documentation Tasks

(7-8 hours)

1. **Add deck descriptions.**

1. **Add screenshots of the flashcards in this repo.**

1. **Revisit the `bible` and `dictionary` documentation in their respective
   README.md files.**

1. **Document the repo in a way that makes it possible to invite collaborators.**

1. **Link Drive items in this repo.**

1. **Move / reproduce TODO's from Drive in the README files.**

1. Use "Crum" in place of "Marcion".

1. Document the snapshot dates and versions of the apps and data imported
into the repo.

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

   **Add a file with some private variables that your scripts can use to publish
   the data to Drive. Include your Drive credentials and local paths and the
   like.**

#### Flashcards

1. **Deploy the flashcards on a standalone app.** (100+ hours, delegate)

1. **Incorporate Scriptorium's data. Gain familiarity with their platform.
   Parse their dictionary.** (7-8 hours, delegated)

1. **Add word derivations to a TSV, and then to the flashcards.** (3-4 hours)
   See [this
file](https://github.com/pishoyg/coptic/blob/master/archive%2Fmarcion-1.8.3-src%2Fcrumresulttree.cpp)
for how Marcion constructs the derivations tree.

   1. **Sort the derivations TSV.** (1 hour)

   1. **Implement a TSV group-by field.** (1 hour)

   1. **Implement an apply-lambda field.** (1 hour)

   **1. The image, file, and (future) sound fields should support a
   comma-separated list of keys, or key ranges.** (1 hour)

1. **Publish the decks through Anki.** (1 hours)

1. **Implement a sound type.** (1 hour)

1. **Use a dummy timestamp for testing. You can then verify that your changes
   don't impact the output by comparing two packages generated with the dummy
   timestamp against one another, one with and one without the changes.** (1
hour)

1. Flashcard synchronization seems to be working fine. However, running the
   generation script twice produces a different file, and reimporting
   (supposedly identical data) produces the message "notes were used to update
   existing ones.

   This is likely due to the timestamps that the notes are recorded
   with. The newer timestamps make Anki think that the cards are newer, hence
   it updates everything. It is best, when exporting a new version of the
   package, to only include accurate timestamps. If some notes are identical to
   ones that have already been exported, they should retain their old
   timestamps. `genanki` doesn't have native support for per-note this, neither
   does it support reading an existing package and comparing the new data
   against it), so we will likely have to do lots of manual work to avoid the
   problem, or find another package.

1. Understand note sorting. To start with, understand `genanki`'s `sort_key`
   parameter.

1. **Crawl [Wiktionary - Category:Coptic lemmas](
https://en.wiktionary.org/wiki/Category:Coptic_lemmas).** (20+ hours, delegate)

1. Use the newer version of [copticsite.com](https://copticsite.com/) once
   published.

1. Complete the list of prefixes for the `prettify` format for copticsite.com.
   (low-priority)

1. Revisit the possibility of image compression to minimize the package size.
   (low-priority)

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

1. Pick up some of the Easter egg tasks left around the code:

   ```bash
   grep TODO -R bible dictionary keyboard flashcards --include=\*.py
   ```

   Move them to README files when more visibility is warranted. Delete them
   when they are deemed irrelevant.

### Diplomacy Tasks

1. **Find contributors, and an audience of learners.**

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
