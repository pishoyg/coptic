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
  - [`vault.sh`](#vaultsh)
  - [Priorities](#priorities)
  - [Documentation TODO's](#documentation-todos)
  - [Collaborator Convenience TODO's](#collaborator-convenience-todos)
  - [Diplomacy TODO's](#diplomacy-todos)
  - [Learner Convenience TODO's](#learner-convenience-todos)
  - [Inflect / Kindle Content TODO's](#inflect--kindle-content-todos)
  - [Flashcard Content TODO's](#flashcard-content-todos)
  - [Keyboard TODO's](#keyboard-todos)
  - [Rigor / Planning TODO's](#rigor--planning-todos)
  - [Developer Convenience TODO's](#developer-convenience-todos)
  - [Guidelines](#guidelines)
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

   **N.B. The package is updated regularly (almost daily), so make sure
   to save the link and come back occasionally to download the updated version.**

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

1. Collect more explanatory pictures. (**p1**, 100+ hours)

   This will significantly aid the
   learning process, and it will save learners the time that they have to spend
   on looking up the obscure vocabulary or unfamiliar terms.

1. Link KELLIA lemmas to Marcion Keys. (p4)

   This may make it possible to include the meaning, literature citations, and
   perhaps other data.

   It might also make it possible to expand KELLIA's dictionary.

1. Add meanings that would be displayed on top before Crum's translation.
   Some of Crum's translations are obscure or archaic, and some are outdated
   because we understand the meaning of the word better than he did back then.
   We could use St. Shenouda's Simple Bohairic English dictionary for that, or
   KELLIA's dictionary.
   (p4)

1. Collect more explanatory notes. (p4)

1. Fix the typos in the data retrieved from Crum. The current dataset is
   high-quality, and has a very small number of typos. However, they do exist.
   (p4, and it's more of an ongoing byproduct than a task.)

1. Complete the list of suffixes used for copticsite.com's dictionary.
   (p4)

1. Contemplate publishing a version of the flashcards with one derivation per
   note, rather than the entire table. See whether this will aid learning.
   (p4)

1. Contemplate sorting the dictionary words by popularity, somehow.
   (p4)

1. Contemplate dividing the decks to subsets sorted by popularity, so the
   learners can learn the more important words first. (p4)

### Moawad Dawoud's Diciontary

1. Add Moawad Dawoud's page numbers, and add scans to the flashcards. (**p1**,
   in progress)

1. Add Moawad Dawoud's Arabic translations. (p4, 100+ hours, delegate)

1. Add Moawad Dawoud's standard spellings. (p4)

   Crum mentions all spellings, including obscure and rare ones. Dawoud treats
   some as more standard than others, which is helpful. It's worth highlighting
   which spellings are more common.

### Audio

(ambitious goal)

1. Add pronunciations to the notes. (p4, 100+ hours, delegate)

### Learning Curriculum

(ambitious goal)

1. Create Duolingo-like learning curricula for learners at multiple levels.
   (**p1**, 100+ hours, delegate)

### Neologisms

(ambitious goal)

1. Add neologisms. We need to think first of how to create neologisms before
   we add them to our dataset. (**p1**, 1000+ hours, delegate)

## For Developers / Owners

For visibility, planned features and improvements must be documented in this
README file (not in any of the README files in the subdirectories).
Non-learner-facing coding tasks are sometimes documented in the code as TODO's,
and sometimes brought here.

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
`make` rules. See `TEMPLATE_vault.sh` for more information.

### Priorities

The rest of this file lists the current plans or ideas for the project. We use
the prioritization scale described below. Besides priorities, items often have
time estimates and progress statuses, but those are not essential.

_Priority_ is a function of many variables, including the impact, feasibility,
criticality, and nature of the tasks.

*N.B. When in doubt, it is safer to use a higher priority.*

The categories are:

- `p-1`: Ideas that have been proposed, but have not yet been assessed for
impact or feasibility. These should be triaged soon, because they could
potentially change other plans and priorities.

   The action that these items need is not implementation or execution, it's
   triage or contemplation. Once this is done, they should move to one of the
   executable categories below before they get executed.

- `p0`: Tasks that should be done as soon as possible. These should be the ones
that you look up the next time you log in. They generally belong to one of two
categories:

   - Critical coding / documentation tasks, essential for the integrity of
     the project.
   - Items that you were recently working on and are still fresh in your mind,
   or small leftover items that seal off a big project or task that you have
   been working on for a while! In other words, it's items that have a
   disproportionately small cost-to-benefit ratio.

- `p1`: Big, technical or non-technical, milestones, related to the general
direction of the project. These are more of high-level goals, not tasks or
proposed ideas.

- `p2`: Thought-through tasks that have been concluded to be both impactful and
feasible. These are not general goals, but concrete tasks. They do not need
triage or contemplation, we've already decided that we want to implement them.

- `pp2`: Tasks that fit the criteria for `p2`, but are prerequisites for other
`p2` tasks. They should be picked up before the other `p2` items.

- `p3`: Thought-through tasks that are either less impactful or less feasible.

- `pp3`: Tasks that fit the criteria for `p3`, but are prerequisites for other
`p3` tasks.

- `p4`: This is the backlog. It includes ideas that have not yet been thought
through, but from a first glance, they don't show promise. These shouldn't be
implemented, but occasionally contemplated, and then either discarded, or
promoted to a higher priority. If there is something that you already deemed
desirable, and having a decent degree of impact, then it shouldn't be assigned
this priority.

- Besides the `p` prefixes, prerequisites, or the planned order of execution,
is often expressed simply by writing the tasks in a particular order.

- Nature of the task (data collection, documentation, collaborator-oriented,
  learner-oriented, ...) is expressed by the section that the tasks are written
  into.

### Documentation TODO's

(7-8 hours)

1. Add links to the source and sink Drive items (the Bible ebook, Kindle
   dictionary, gsheets, ...). (**p0**)

1. Add docs about obtaining the ebook and kindle dictionary. (**p0**, 1-2 hours)

1. Document the repo in a way that makes it readily shareable. (**p0**)

1. Use "Crum" in place of "Marcion". (**p0**)

1. Add deck descriptions. (p2)

1. Move / reproduce TODO's from Drive in the README files. (p4)

1. Revisit the `bible` and `dictionary` documentation in their respective
   README.md files. (p3)

1. Document the snapshot dates and versions of the apps and data imported
into the repo. (p4)

### Collaborator Convenience TODO's

1. Design the integration between Drive and your scripts. (**p0**, 3-4 hours)

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

   1. Marcion's pipeline should retrieve the data manually collected /
      overridden for `dawoud-pages` and `crum-last-page`, rather than simply
      write an empty placeholder column. (p2, 1-2 hours)

1. Find / design a software to help users record their pronunciations. (p4, 20
   hours, delegate)

   Candidates:
   - https://github.com/padmalcom/ttsdatasetcreator
   - https://github.com/hollygrimm/voice-dataset-creation
   - https://www.phon.ucl.ac.uk/resource/prorec/

1. Find / design a software to help users collect explanatory images. (p4)

### Diplomacy TODO's

1. Find one or two co-owners of the project. (**p1**)

1. Publicize the project, and find an audience of learners. (**p1**)

1. Find contributors, in coding and data collection. (**p1**)

1. Get a cleaner, more recent scan of Dawoud's dictionary. Obtain the source
   file if possible. The current scan is low-quality. At the same time, it's
   outdated, and the pages sometimes don't align! (p3)

1. Look at [tekinged.com](https://tekinged.com/) for inspiration on what you
   can do for an incubated language. (p4)

1. Obtain an updated version of [copticsite.com](https://copticsite.com/)'s dictionary. (p4)

1. Get a cleaner scan of Crum's dictionary. [coptot](
https://coptot.manuscriptroom.com/) has a nice version. Try to obtain it. (p4)

1. Obtain the source file for St. Shenouda The Archimandrite Coptic Society's
   Simple Bohairic English Dictionary. (p4)

1. Obtain the Naqlun dictionary's data. It is poor-quality, but it might
   be attractive for some learners. (p4)

1. Survey the field one more time. See if there is something else out there
   that you can integrate. (p4)

### Learner Convenience TODO's

1. Deploy the flashcards on a standalone app. (**p1**, 100+ hours, delegate)

   This will vastly increase the app's popularity.

1. Until then, reassess whether Anki is your best bet. (**p1**, 20 hours, delegate)

   Anki has the following limitations. Perhaps try to find a platform that
   doesn't have some of them. (Though keep in mind that they are not equally
   problematic.)
   - A paid iOS version. (This one is particularly problematic, and will deter
   many potential learners.)
   - No possibility to automatically sync when a new version of the package is
   released.
   - A primitive UI.
   - The possibility to sync notes selectively. (See the note about exporting
   accurate timestamps below.)

1. Export accurate timestamps. (p4, 50 hours)

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
      1. Use `genanki` to generate a package containing only the delta between
         the two versions, or
      1. Use a new version of `genanki` to generate a new package containing
         accurate timestamps.

   This will facilitate testing. A developer can `diff` two TSVs to find out
   what changes (if any) their code has introduced. (Although there is an
   existing plan to enable testing by using a dummy timestamp, though this will
   only make it possible to check for equality, rather than print a
   human-readable `diff`).

   Another big advantage of the introduction of an intermediate state is
   facilitating a fanout to multiple platforms. Our generators should start by
   generating the TSV package, then our platform-specific generators can take
   that package snapshot and produce an package for different platforms such as
   Anki, Cloze, or something else.

   Learners who synchronize their data will only have the old notes overridden.

1. Fix the model sync issues. (p4)

   In the current design, updating the CSS of a deck doesn't get reflected when
   the package is imported. The notes retain the old CSS.

   Changing the model ID results in synchronization difficulties due to the
   note type having changed.

### Inflect / Kindle Content TODO's

1. Inflect: Redesign the inflection module. (p2)

   To supported compound prefixes, and given the exponentially growing number
   of possible combinations of prefixes, it has to be done recursively. A quick
   draft looks like this:

```py
MAX_DEPTH = 7
class Word:
   def __init__(spelling, depth):
      self._spelling = spelling
      self._depth = depth
   def inflect(self):
      raise NotImplementedError("Not Implemented!")

class Verb(Word):
   def inflect(self):
      if self._depth == MAX_DEPTH:
         return [self]
      children = [
         Noun(...),
         Noun(...),
         Verb(...),
      ]
      return sum(c.inflect() for c in children, children)

class Noun(Word):
   pass
```

   This means that you have to reimplement some of your existing inflections
   (such as the circumstantial and relative) using the new method, which is
   easier.

   Write intermediate output to a TSV for visibility and debuggability.

1. Kindle: Investigate the possibility of cross referencing definitions. (p4)

   [The docs](https://kdp.amazon.com/en_US/help/topic/G2HXJS944GL88DNV)
   explicitly mention that cross referencing is possible. One idea comes to
   mind:

   - The dictionary should be orthography-oriented, rather than Crum
   entry-oriented.

   - Perhaps the dictionary should include each orthography only once, and
   cross reference all its possible morphological analyses. For example, list
   the orthography (ⲛⲛⲁⲓ) once, with ⲛ̀-ⲛⲁ-ⲓ̀ as a possible analysis referencing
   the definition of the root ⲓ̀, and ⲛ̀-ⲛⲁⲓ as a second analysis referencing the
   definition of the root root ⲛⲁⲓ. This will need some planning!

1. Inflect: Expand the newly-refurbished inflection module. (p2)

   1. Add relative ⲉⲑ and ⲉⲧ verb constructions.

   1. Add relative ⲫⲏ, ⲑⲏ, and ⲛⲏ constructions.

   1. Add copula relative ⲡⲉⲧ and ⲛⲉⲧ (and ⲧⲉⲧ?) constructions.

   1. Add ⲕⲉ constructions for both verbs and nouns.

   1. Add negative ⲁⲧ / ⲁⲑ constructions.

   1. Handle compound prefixes.

1. Marcion: Redesign the Marcion pipeline to support the upcoming inflection
   work. (p2)

   There is currently no way to communicate the `lexical.structured_word`
   classes to the inflection module. You're sending a mere `pandas.DataFrame`
   object upstream. Change the pipeline structure to allow the use of the
   parsed `lexical.structured_word` objects in more locations.

   You also need to make it possible to add inflections for derivations.

   Use some OOP! Python's convenience has led you to implement everything as a
   raw object or a `pandas` object!

1. Marcion: Add inflections for derivations. (p2)

1. Marcion: Improve Marcion's inflection-driven rigor: (p2)

   1. Implement normalization of the remaining annotations, namely `-` for
      prenominal forms, `=` for pronominal, `+` for qualitative, and `―` for
      _same as above_.

      Just carry them on a separate field in `lexical.structured_word`, just
      like you did with attestations.

   1. Implement normalization for English-within-Coptic.

      Just carry them on a separate field in `lexical.structured_word`, just
      like you did with attestations.

   1. Control `constants.ACCEPTED_UNKNOWN_CHARACTERS*`. It should be possible
      to exercise more rigor once the extra normalization steps have been
      implemented.

   1. Detached types override / invalidate root types. Investigate.

   *Thought: The current state of Marcion data is imperfect. We will likely have
   to introduce new types (e.g. articled vs. non-articled nouns) in order to
   build an accurate inflection module. We might also have to populate the
   derivations data differently.*

1. Kindle: Design a Kindle dictionary generation pipeline (pp2)

1. copticsite.com: Create a dictionary from copticsite.com's data. (p2)

1. KELLIA: Create a dictionary from KELLIA's data. (p2)

   This will include the Greek loanwords. :))

1. Rethink the Kindle dictionary generation tooling. (p4)

   1. Stop using `kindlegen`. It's obsolete.

   - We should perhaps follow the docs and generate the
   dictionary using Kindle Previewer 3. We will have to convert the
   dictionary to EPUB format first, but that should be doable.

   1. Trying to include all inflections produces the following errors:

   - `Warning(index build):W15001: inflection rule or rule group too long (max=255). Discarded.`

   From a first glance, it seems that including a comprehensive list of
   inflections is infeasible, and should be abandoned. This is what `runehol`
   concluded as well, and it makes some sense.

   1. For reference, here are the successful examples that you've come across:

   - [https://github.com/runehol/kindlearadict/](https://github.com/runehol/kindlearadict/)
   - [https://hanzihero.com/blog/custom-kindle-dictionary](https://hanzihero.com/blog/custom-kindle-dictionary)
   - [https://github.com/tekinged/tekinged.com/blob/main/scripts/mk_kindle_dict.py](https://github.com/tekinged/tekinged.com/blob/main/scripts/mk_kindle_dict.py)

   Note: We have, unsuccessfully, experimented with putting words under
   multiple orthographies (`<idx:orth>` tags). The experimentation wasn't
   extensive, and the Kindle docs clearly state that multiple orthographies are
   supported (though it's not clear whether we can find a workaround to include
   all inflections by using multiple orthographies). Revisit.

1. Display the Bible data in a table format. (p4, 7-8 hours)

   The reason the Bible was chosen to be displayed is that it showed difficulty
   with highlighting. There is some information about this
   [here](https://kdp.amazon.com/en_US/help/topic/GZ8BAXASXKB5JVML), and a
   workaround may be possible.

### Flashcard Content TODO's

1. Add links to CDO from Crum. (p4, 3-4 hou4s)

   The url is `https://coptic-dictionary.org/results.cgi?quick_search={key}`.

1. Revisit the Greek dictionary used, and allow spaces between words.
   (p4, 3-4 hours)

1. Prettify and expand the flashcards from [KELLIA](
https://coptic-dictionary.org/). (p4, 7-8 hours)

   1. Group `geo`s by `orth` and `gram_grp`.
   1. Add the entity types. (low-priority)
   1. Include IDs in comments. (low-priority)

   Look at the results page on [coptic-dictionary.org](
   https://coptic-dictionary.org/) for inspiration.
   It is generated by [
   https://github.com/KELLIA/dictionary/blob/master/entry.cgi](
   https://github.com/KELLIA/dictionary/blob/master/entry.cgi).

   Some data may require interactions with Scriptorium tools.

1. Create dialect-oriented versions of the KELLIA decks. (p4, 7-8 hours)

1. Incorporate [Scriptorium](https://copticscriptorium.org/)'s data and NLP
tools. (p4, 50 hours, delegate)

   - Start by gaining familiarity with their products, and selecting the ones
   that will be useful for you. From a quick look, the part-of-speech tagger,
   and automatic segmentation, entity visualizer, lemmatizer,
   language-of-origin tagger, are all good candidates.

1. Crawl [Wiktionary - Category:Coptic lemmas](
https://en.wiktionary.org/wiki/Category:Coptic_lemmas). (p4, 20+ hours, delegate)

1. Incorporate the ⲛⲓⲣⲉϥⲤⲁϫⲓ ⲛ̀ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ Group's neologisms. (p4, 3-4 hours)

1. Group the derivations by dialect. (p4, 2 days)

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

   The best way to accomplish this is through a proper construction of an
   annotated tree, meaning that the notes shouldn't only bear the raw data, but
   the parsing results as well. This will provide the `tree` module with the
   data needed to implement a better heuristic.

### Keyboard TODO's

1. complete your [keyboard
proposal](
https://docs.google.com/document/d/1-pvMfGssGK22F9bPyjUv7_siwIf932NYROSKgXM0DDk/edit
). (**p1**, 100+ hours)

### Rigor / Planning TODO's

1. The `stats` pre-commit is not working! Fix it! (**p0**)

1. Assign task priorities one more time. (**p0**)

1. Design the pipeline, sources and sinks, and add a diagram for the new
proposed pipeline. (**p0**)

1. Rethink the directory structure. (**p0**)

   One suggestion was to move the `kindle` and `inflect` directories to the
   root directory, because they both represent new types of sinks, besides the
   `flashcards` and `keyboard`. On the other hand, `dictionary` and `bible`
   represent sources rather than sinks. Think the whole thing through!

1. Introduce a new priority for the `p2` items that are prerequisites for other
   `p2` items.

1. Crum: Write the parsing output to JSON / protobuf files. (p2)

   This will enable:
   - Storage of the parsing results.
   - Manual inspection of the parsing results.
   - Splitting the parsing pipeline from the output generation pipeline.

1. Crum: Take derivations into consideration when deciding whether a given
   root belongs to a dialect. (p2, 1-2 hours)

1. Crum: English post-processing likely shouldn't apply to
   Coptic-within-English. Neither should Coptic-within-English be treated as
   words with spellings. (p2)

1. Crum: Detached types, references, and English-within-Coptic, should
   perhaps be spelling-specific rather than word-specific. (p2)

1. Crum: Detached types override / invalidate root types. Investigate. (p2)

1. Triage the Easter eggs left around the code. (**p0**)

   - Run `make todo` to find them.
   - Move them to README files when more visibility is warranted.
   - Delete them when they are deemed irrelevant.

### Developer Convenience TODO's

1. Revisit the currently-assigned tasks and priorities. (p3, occasionally)

1. Write the flashcard data to an intermediate format before `.apkg`. (p2,
   20 hours)

   This has the following advantages:
   - It becomes easier to verify what changes a commit introduces to the
   flashcards.
   - Git will track the history of the flashcard content.
   - Significantly reduce the running time, as writing the flashcards to a
   database currently takes more than 70% of the running time of
   `flashcards/main.py`. Splitting the two steps would make it possible to run
   the first one (which is being more actively developed) in a fraction of the
   time.
   - It is a plausible solution for the timestamping problem currently faced.
   - Support a fanout to platforms other than Anki.

1. Running `make bible` and then `pre-commit run tidy-html` produces a lot of
   warnings. Fix them to eliminate the linting noise. (p2)

   To start with, lots of `<span>` elements are apparently empty and they end
   up getting trimmed. Prevent your code from generating those in the first
   place.

1. Run `checkmake`, `doctoc`, and `tidy` using pre-commits that download the
   hooks from a remote repo, so you won't have to assume the existence of the
   binaries on your local machine. (p2)

1. Set up a more robust CI/CD pipelines. (p3, 20 hours)

   To start with, set up proper dependencies in Makefile.

   Note: This is proving difficult! We could perhaps consider migrating to
   CMake or even Bazel.

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
