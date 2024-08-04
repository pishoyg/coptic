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
  - [`vault.sh`](#vaultsh)
  - [Planning](#planning)
    - [Priorities](#priorities)
    - [Nature of Tasks](#nature-of-tasks)
    - [Audience](#audience)
  - [Guidelines](#guidelines)
- [Credits](#credits)

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

### `vault.sh`

`vault.sh` (which is hidden by a rule in `.gitignore`) contains variables
that are used inside `Makefile`. Some `make` rules can only run if preceded by
`source vault.sh` in order to export the variables needed for those rules.
You need your own version of `vault.sh` in order to be able to run all the
`make` rules. See `env.sh` for more information.

### Planning

We use GitHub to track our TODO's and plans. See [
https://github.com/pishoyg/coptic/issues](https://github.com/pishoyg/coptic/issues).

Here are some information about the labels and conventions:

*N.B. When in doubt, it is safer to use a higher priority.*

*N.B. We can have at most one label from each category.*

#### Priorities

- `p-1`: Ideas that have been proposed, but have not yet been assessed for
impact or feasibility. These should be triaged *soon*, because they could
potentially change other plans and priorities.

   The action that these items need is not implementation or execution, it's
   triage or contemplation. Once this is done, they should move to one of the
   executable categories below before they get executed.

- `p0`: Tasks that should be done _as soon as possible_. These should be the
ones that you look up the next time you log in. They generally belong to one of
two categories:

   - Critical coding / documentation tasks, essential for the integrity of
     the project. Bug fixes, major blockers, vulnerabilities, ...
   - Items that you were recently working on and are still fresh in your mind,
   or small leftover items that seal off a big project or task that you have
   been working on for a while! In other words, it's items that have a
   disproportionately small cost-to-benefit ratio.

- `p2`: Thought-through tasks that have been concluded to be both impactful and
feasible. These are not general goals, but concrete tasks. They do not need
triage or contemplation, we've already decided that we want to implement them.

In other words, these are items that we _will_ do.

- `p3`: Thought-through tasks that are either less impactful or less feasible.

In other words, these are items that we _want_ to do.

- `p4`: This is the backlog. It includes ideas that have not yet been thought
through, but from a first glance, don't show promise. These shouldn't be
implemented, but occasionally contemplated, and then either discarded, or
promoted to a higher priority. If there is something that you already deemed
desirable, and having a decent degree of impact, then it shouldn't be assigned
this priority.

In other words, these are items that we _might_ do.

#### Nature of Tasks

This is somewhat self-explanatory, but we define some labels below:

- `data collection`: Manual data collection, rather than coding. Coding tasks
that aim to facilitate data collection tasks do NOT belong in this category.

#### Audience

Either developer-oriented or user-oriented improvements.

### Guidelines

1. While unit tests are low-priority right now given the feasibility of other
   methods of testing, such as the code assertions, and visual inspections of
   the output, unit tests are still desirable. Consider expanding them.

1. Use pre-commit hooks.

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

## Credits

The data used here was digitalized and published through the efforts of:

1. Milan Konvicka, creator of [Marcion](https://marcion.sourceforge.net/)

1. Hany Takla, founder of [Saint Shenouda The Archimandrite – Coptic
   Society](http://stshenouda.org/)

1. Osama Thabet, creator of [copticsite.com](https://copticsite.com/)

1. [Kyrillos Wannes](https://twitter.com/kyrilloswannes), author of *Een
   Inleiding tot Bohairisch Koptisch*, who is rigorously
   collecting Marcion-Dawoud mapping for the flashcards project.
