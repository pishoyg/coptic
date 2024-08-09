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
  - [`vault.sh`](#vaultsh)
  - [Planning](#planning)
  - [Technical Guidelines](#technical-guidelines)
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

### `vault.sh`

`vault.sh` (which is hidden by a rule in `.gitignore`) contains variables
that are used inside `Makefile`. Some `make` rules can only run if preceded by
`source vault.sh` in order to export the variables needed for those rules.
You need your own version of `vault.sh` in order to be able to run all the
`make` rules. See `env.sh` for more information.

### Planning

We use GitHub to track our TODO's and plans. See [
Issues](https://github.com/pishoyg/coptic/issues).

To assist our planning, every issue must belong to a milestone. See [
Milestone](https://github.com/pishoyg/coptic/milestones/).

All issues should be labeled. See [
Labels](https://github.com/pishoyg/coptic/labels).

When it comes to prioritization, generally speaking, we assign priorities to
milestones, and those dictate the priorities of their child issues.

Milestone priorities are assigned using due dates. Milestones help make
long-term plans.
Their count should be in a small order of magnitude to make this possible.

We don't assign priorities to individual issues, although, of course, within a
milestone, some issues will be higher-priority than others, and some issues
will be prerequisites for others. But we rely on our own memory for those.

There is also a generic developer experience milestone, that is somewhat
long-living, and has been growing to be synonymous to the `dev` label. Although
in cases when a `dev` task pertains to another milestone, the other milestone
trumps the developer experience milestone.

We assign the following categories of labels to issues:

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

## Credits

The data used here was digitalized and published through the efforts of:

1. Milan Konvicka, creator of [Marcion](https://marcion.sourceforge.net/)

1. Hany Takla, founder of [Saint Shenouda The Archimandrite – Coptic
   Society](http://stshenouda.org/)

1. Osama Thabet, creator of [copticsite.com](https://copticsite.com/)

1. [Kyrillos Wannes](https://twitter.com/kyrilloswannes), author of *Een
   Inleiding tot Bohairisch Koptisch*, who is rigorously
   collecting Marcion-Dawoud mapping for the flashcards project.
