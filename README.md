# coptic

Ⲉ̀ϣⲱⲡ ⲁⲓϣⲁⲛⲉⲣⲡⲉⲱⲃϣ Ⲓⲗ̅ⲏ̅ⲙ̅, ⲉⲓⲉ̀ⲉⲣⲡⲱⲃϣ ⲛ̀ⲧⲁⲟⲩⲓⲛⲁⲙ: Ⲡⲁⲗⲁⲥ ⲉϥⲉ̀ϫⲱⲗϫ ⲉ̀ⲧⲁϣ̀ⲃⲱⲃⲓ ⲉ̀ϣⲱⲡ
ⲁⲓϣ̀ⲧⲉⲙⲉⲣⲡⲉⲙⲉⲩⲓ.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [How to Get the Flashcards](#how-to-get-the-flashcards)
- [Description](#description)
  - [A Coptic Dictionary](#a-coptic-dictionary)
  - [copticsite.com](#copticsitecom)
  - [Bible](#bible)
- [Contact and Contributions](#contact-and-contributions)
  - [Dictionary](#dictionary)
  - [Moawad Dawoud's Diciontary](#moawad-dawouds-diciontary)
  - [Audio](#audio)
  - [Learning Curriculum](#learning-curriculum)
  - [Neologisms](#neologisms)
- [For Developers / Owners](#for-developers--owners)
  - [Directory Structure](#directory-structure)
  - [Documentation TODO's](#documentation-todos)
  - [Collaborator Convenience TODO's](#collaborator-convenience-todos)
  - [Diplomacy TODO's](#diplomacy-todos)
  - [Learner Convenience TODO's](#learner-convenience-todos)
  - [Content TODO's](#content-todos)
  - [Developer Convenience](#developer-convenience)
- [Credits](#credits)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

This repo hosts a Coptic flashcard / dictionary project that aims at making the
language more **learnable**.

## How to Get the Flashcards

1. Download Anki ([Android](https://play.google.com/store/apps/details?id=com.ichi2.anki),
[iOS](https://apps.apple.com/us/app/ankimobile-flashcards/id373493387)\*,
[Desktop](https://apps.ankiweb.net/)).

   (\**The iOS version is
paid, unfortunately!*)

2. Download [the Coptic package](https://drive.google.com/file/d/1KV0fH23Zucmlvdc0dwTJiDdqKIvbuYY_/view?usp=sharing),
and open it / import it in Anki. This package includes all the data.

   (*Alternatively, you can download individual decks from [this page](
https://ankiweb.net/shared/by-author/836362510). Keep in mind that this page
takes 24 hours to go back live after an update, so it's occasionally down.*)

## Description

The package includes three types of flashcard decks. While the purpose of the
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

### Bible

This is Biblical data. We don't have the full Bible in any dialect, but this
contains a lot of the surviving texts, especially in Bohairic, and Sahidic.

The Bohairic version, for example, contains a total of around ~24,000 verses
(roughly 70% of the Bible). All sections are complete except the poetic and,
even less so, the historical books.

<div align="center">
   <figure>
      <img src="flashcards/data/img/bible/toc.png" alt="table of contents" width="200"/>
      <br>
      <figcaption> Bible Table of Contents </figcaption>
   </figure>
</div>

The front shows the verse in your chosen dialect, and the back shows all
dialects along with the reference and the translation.

<div align="center">
   <figure>
      <img src="flashcards/data/img/bible/front.png" alt="back" width="200"/>
      <img src="flashcards/data/img/bible/back.png" alt="back" width="200"/>
      <br>
      <figcaption> Bible Front and Back </figcaption>
   </figure>
</div>

Hint: When studying the Bible using flashcards, you can edit the note from the
menu, and turn some expressions or words to to **bold**  or *italics*, so you
will pay attention to it the next time you see the card. Then you can select
*Again* or *Hard* for the verses that contain something that you still want to
learn or memorize, and you can select *Good* or *Easy* for the verses that
you've already learned. **N.B.** Editing the keys will mess things up, but you
can freely edit the front and back.

<div align="center">
   <figure>
      <img src="flashcards/data/img/a-coptic-dictionary/edit/edit.png" alt="edit" width="200"/>
      <br>
      <figcaption> Editing a Note </figcaption>
   </figure>
</div>

## Contact and Contributions

You can reach out at <pishoybg@gmail.com> for any questions, feedback, or if
you want to contribute. I always read my email, and I read it promptly. Always!

There are two ways you can contribute:

- Manual data collection (no programming expertise needed).

- Coding.

This section lists ways you can contribute data to enrich the flashcards. [The
section below](#for-developers--owners) documents programming contributions.

The contribution pipeline is not yet well-defined. We plan to make it clearer
as to how exactly you can contribute (which files you can write, in which
formats, ... etc.) In the meantime, feel free to look below and reach out with
suggestions or questions, or data! :)

### Dictionary

1. **Collect more explanatory pictures.** (100+ hours, delegate)

   This will significantly aid the
   learning process, and it will save learners the time that they have to spend
   on looking up the obscure vocabulary or unfamiliar terms.

1. Link Scriptorium lemmas to Marcion Keys.

   This may make it possible to include the meaning, literature citations, and
   perhaps other data.

1. Add a meanings that would be displayed on top before Crum's translation.
   Some of Crum's translations are obscure or archaic, and some are outdated
   because we understand the meaning of the word better than he did back then.
   We could use St. Shenouda's Simple Bohairic English dictionary for that, or
   perhaps Scriptorium.
   (low-priority)

1. Collect more explanatory notes. (low-priority)

1. Add literature citations. Perhaps from Scriptorium? Perhaps from the
   Bible? (low-priority)

1. Fix the typos in the data retrieved from Crum. The current dataset is
   high-quality, and has a very small number of typos. However, they do exist.
   (low-priority, and it's more of an ongoing byproduct than a task.)

1. Complete the list of suffixes used for copticsite.com's dictionary.

1. Contemplate publishing a version with one derivation per note, rather than
   the entire table. See whether this will aid learning. (low-priority)

1. Contemplate sorting the dictionary words by popularity, somehow.
   (low-priority)

1. Contemplate dividing the decks to subsets sorted by popularity, so the
   learners can learn the more important words first. (low-priority)

### Moawad Dawoud's Diciontary

1. **Add Moawad Dawoud's page numbers, and add scans to the flashcards.** (50+
   hours, delegate)

1. Add Moawad Dawoud's Arabic translations.

1. Add Moawad Dawoud's standardized spellings. (low-priority)

1. Copy the Greek loanwords from Moawad into a new flashcard deck.
   (low-priority, especially if you incorporate Scriptorium's data, which you
   must do anyway.)

### Audio

(ambitious goal)

1. Add pronunciations to the notes.

### Learning Curriculum

(ambitious goal)

1. Create Duolingo-like learning curricula for learners at multiple levels.

### Neologisms

(ambitious goal)

1. Add neologisms. We need to think first of how to create neologisms before
   we add them to our dataset.

## For Developers / Owners

For visibility, planned features and improvements must be documented in this
README file (not in any of the README files in the subdirectories).
Non-learner-facing coding tasks are sometimes documented in the code as TODO's,
and sometimes brought here.

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

### Documentation TODO's

(7-8 hours)

1. **Add deck descriptions.**

1. **Revisit the `bible` and `dictionary` documentation in their respective
   README.md files.**

1. **Document the repo in a way that makes it possible to invite collaborators.**

1. **Link Drive items in this repo.**

1. **Move / reproduce TODO's from Drive in the README files.**

1. Use "Crum" in place of "Marcion".

1. Document the snapshot dates and versions of the apps and data imported
into the repo.

### Collaborator Convenience TODO's

1. **Support more seamless integration between Drive and your scripts.** (3-4
   hours)

   Likely, this means letting them contribute through Drive instead of Git.
   List the data sources, and redirect the flow to Drive (think about this!)
   A few sources that immediately come to my mind are:

   - Crum (Roots, derivations, types, meanings, and page numbers)
   - Crum's Notes
   - Crum's Scans
   - Crum's Explanatory Images
   - The Bible
   - [copticsite.com](https://copticsite.com/)'s Dictionary and Suffixes
   - Dawoud's Screenshots
   - Dawoud's Page Numbers
   - future data...

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

1. **Find / design a software to help users record their pronunciations.**

1. Find / design a software to help users gather images.

1. Document the content of `secrets.sh`. Make it possible for someone to take
   over.

### Diplomacy TODO's

1. **Find one or two co-owners of the project.**

1. **Publicize the project, and find an audience of learners.**

1. **Find contributors, in coding and data collection.**

1. Obtain the source file for St. Shenouda The Archimandrite Coptic Society's
   Simple Bohairic English Dictionary.

1. Obtain the Naqlun dictionary's data. It is poor-quality, but it might
   be attractive for some learners. (low-priority)

1. Obtain an updated version of ⲛⲓⲣⲉϥⲤⲁϫⲓ ⲛ̀ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ's neologisms.

1. Obtain an updated version of [copticsite.com](https://copticsite.com/)'s dictionary.

1. Get a cleaner scan of Dawoud's dictionary. Obtain the source PDF if posible.
   (low-priority)

### Learner Convenience TODO's

1. **Deploy the flashcards on a standalone app.** (100+ hours, delegate)

1. Reassess whether Anki is your best bid. Learn about alternatives. The fact
   that the iOS version is paid will deter many learners!

### Content TODO's

1. **Incorporate Scriptorium's data. Gain familiarity with their platform.
   Parse their dictionary.** (7-8 hours, delegated)

1. **Crawl [Wiktionary - Category:Coptic lemmas](
https://en.wiktionary.org/wiki/Category:Coptic_lemmas).** (20+ hours, delegate)

1. **Incorporate the ⲛⲓⲣⲉϥⲤⲁϫⲓ ⲛ̀ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ Group's neologisms.** (3-4 hours)

1. **Group the derivations by dialect.** (3-4 days)

   Now, ... The tricky thing about this task is that, while parsing the
   derivations, it's hard to tell whether a certain row belongs to a given
   dialect or not. If we can easily decide on the correct subset of rows that
   belongs to the dialect at hand, generating the table should be easy.

   There are the following situations:

   1. A row explicitly states its bearing words in the dialect. Easy.

   1. A row is a header. Easy.

   1. A row has a child that belongs to the dialect. We also include it,
      although the way we implemented this check is hacky and needs a cleanup.
      We should reimplement it using proper tree construction.

   1. Now, what if a row is not a header, has no children belonging to the
      dialect, and doesn't specify any dialects itself? Previously, we assumed
      that such rows should be treated as belonging to all dialects (that's
      what we do with the roots). But we can't apply that to derivations, which
      often intentionally omit the dialect list. A good heuristic is to examine
      the parents and try to infer the dialect list from the parents.

1. Include links to the Crum scans inside the note.

1. Revisit the possibility of image compression to minimize the package size.
   (low-priority)

### Developer Convenience TODO's

(40+ hours)

1. Expand the unit tests.

1. Expand the use of hooks and Makefile.

1. Do not let Python tempt you to use its built-in types instead of classes and
   objects. Don't forget about OOP!

1. Document the code.

1. Add assertions and throw exceptions for any assumptions that you make. They
   catch a lot of bugs! A lot!

1. Force type hints. Use
   [type_enforced](https://github.com/connor-makowski/type_enforced).
   - Set type enforcement per class rather than per method.
   - Move your helpers, such as your `Callable`, to a shared package.

1. Collect and print stats.

1. Strip inputs more liberally.

1. Pick up some of the Easter egg tasks left around the code:

   ```bash
   grep TODO -R bible dictionary keyboard flashcards --include=\*.py
   ```

   Move them to README files when more visibility is warranted. Delete them
   when they are deemed irrelevant.

1. **Export accurate timestamps.** (20 hours, delegate)

   1. Reimporting (supposedly identical data) produces the message "notes were
   used to update existing ones." This is evidently due to the timestamps that
   the notes are recorded with. The newer timestamps make Anki think that the
   cards are newer, hence it updates everything. This causes the following
   problems:

   - Any changes that a user makes to a note get overridden, even if the note
   content is one that the user has intentionally modified.
   - The sync message is misleading, and lacks information that would otherwise
     be useful.
   - The exported package size is unnecessarily large. We need only export the
     new notes.

   If some notes are identical to ones that have already been exported, they
   should retain their old timestamps, and the new notes should acquire new
   timestamps. This should solve all of the problems above.
   `genanki` doesn't have native support for per-note timestamps, neither does
   it support reading an existing package and comparing the new data against
   it. So we will likely have to do lots of manual work to solve the problem.

   One idea that comes to mind is to export **untimestamped** data first to a
   TSV, rather than a package directly, to make processing either. We can use
   **versioning**, and export a new TSV every time we rerun the script. Then we
   can have another script whose sole purpose is:
   1. Compare two TSV's containing notes, and
   1. Use `genanki` to generate a package *containing only the delta* between
      the two versions.

   This will facilitate testing. A developer can `diff` two TSVs to find out
   what changes (if any) their code has introduced. (Although there is an
   existing plan to enable testing by using a dummy timestamp, though this will
   only make it possible to check for equality, rather than print a
   human-readable `diff`).

   Learners who synchronize their data will only have the old notes overridden.

## Credits

The data used here was digitalized and published through the efforts of:

1. Milan Konvicka, creator of [Marcion](https://marcion.sourceforge.net/)

1. Hany Takla, founder of [Saint Shenouda The Archimandrite – Coptic
   Society](http://stshenouda.org/)

1. Osama Thabet, creator of [copticsite.com](https://copticsite.com/)
