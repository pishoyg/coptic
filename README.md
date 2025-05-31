<div align="center">
   <figure>
      <a href="https://remnqymi.com/" target="_blank"><img src="docs/img/icon/icon.png" alt="ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ"
      /></a>
   </figure>
</div>


# [ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ](https://remnqymi.com/)

This is the backing repo for [ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ](https://remnqymi.com/), a project
that aims to make the Coptic language more **learnable**.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Technical Docs](#technical-docs)
  - [Hosting](#hosting)
  - [Getting started](#getting-started)
  - [Planning](#planning)
    - [Components](#components)
    - [Milestones](#milestones)
    - [Issues](#issues)
    - [Labels](#labels)
    - [Project](#project)
    - [Commits](#commits)
  - [Guidelines](#guidelines)
    - [Languages](#languages)
  - [`stats`](#stats)
- [Project-specific](#project-specific)
  - [`dictionary/`](#dictionary)
    - [`marcion.sourceforge.net/`](#marcionsourceforgenet)
      - [Image Collection](#image-collection)
        - [Why?](#why)
        - [Technical Guidelines](#technical-guidelines)
      - [Undialected Entries](#undialected-entries)
      - [Entries that are Absent in Crum](#entries-that-are-absent-in-crum)
    - [`copticocc.org/`](#copticoccorg)
    - [`kellia.uni-goettingen.de/`](#kelliauni-goettingende)
    - [`copticsite.com/`](#copticsitecom)
  - [`bible/`](#bible)
    - [`stshenouda.org/`](#stshenoudaorg)
  - [`flashcards/`](#flashcards)
  - [`morphology/`](#morphology)
  - [`docs/`](#docs)
- [Data Collection](#data-collection)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
# Technical Docs

## Hosting

We use:

- [GitHub](https://github.com/pishoyg/coptic/) for our code base.
- [GitHub Pages](https://github.com/pishoyg/coptic/settings/pages) for our
[website](https://remnqymi.com/).
- [AWS Route 53](https://us-east-1.console.aws.amazon.com/route53/v2/hostedzones)
for domain registration and DNS.
- [Google
Drive](https://drive.google.com/drive/folders/17jI92CKumjYQTXghThaaejPeD8ZbifPm?usp=drive_link) and [Google Cloud](https://console.cloud.google.com/welcome) for cloud storage.
- [Google Analytics](https://analytics.google.com/analytics/web/#/p454349148)
and [Google Search
Console](https://search.google.com/search-console?resource_id=sc-domain%3Aremnqymi.com)
for traffic tracking and analysis.

## Getting started

1. Setting up the environment is necessary for a lot of pipelines to work.

   In general, you should run this at the beginning of each development session:

   ```sh
   source .env
   ```

   Equivalently:

   ```sh
   . ./.env
   ```

   This sets up the Python virtual environment; and exports many environment
   variables and helpers, some of which are used by the pipelines, and some are
   simply intended for developer convenience.

   Alternatively, you can define a hook that would source it automatically once
   you `cd` into the directory. If you use ZSH, you can add the following to your
   `.zshrc` (replacing `${PATH_TO_COPTIC_REPO}` with the path to this repo):

   ```sh
   coptic_source_hook() {
     if [[ $PWD == "${PATH_TO_COPTIC_REPO}" ]]; then
       source ./.env
       chpwd_functions[(Ie)$0]=() # remove ourselves from the array
     fi
   }
   chpwd_functions+=(coptic_source_hook)
   ```

   For Bash, add this to your `.bashrc` (replacing `${PATH_TO_COPTIC_REPO}`
   appropriately):
   ```sh
   coptic_source_hook() {
   if [[ "$PWD" == "$PATH_TO_COPTIC_REPO" ]]; then
     source ./.env
     PROMPT_COMMAND=${PROMPT_COMMAND//coptic_source_hook;}/
   fi
   }

   PROMPT_COMMAND="coptic_source_hook; $PROMPT_COMMAND"
   ```

   Keep in mind that the Python `venv` will continue to be activated afterwards,
   and the environment variables will still be set, as long as you're in the same
   shell session. You can deactivate the environment by running `deactivate`.
   Alternatively, you can just exit the shell window and start a new one.

1. Running `make install` should take care of most of the installations.
   Sourcing `.env` is necessary for this to work. Though `make install` only
needs to be run once, while `.env` needs to be sourced for each session.

   If there are missing binaries that you need to download them, `make install`
   will let you know. You *may* also need to log in with
   [`gh`](https://cli.github.com/).

1. Our pipelines are defined in [`Makefile`](Makefile). Though some pipelines in
   [`Makefile`](Makefile) are only used during development and testing, and are
not relevant for output (re)generation.

1. Keep in mind that parameters are written with the assumption that they are
   being invoked from the repo's root directory, rather than from the directory
where the script lives. You should do most of your development from within the
root directory.

1. This file is the only `README.md` in the repo (and this is enforced by a
   pre-commit hook). Technical documentation is intentionally centralized.
Besides this file, docs can be found in:

   - In-code comments
   - [Planning framework](#planning)
   - [Commit messages](https://github.com/pishoyg/coptic/commits/) (*albeit
   less significantly*)

   User-facing documentation shouldn't live on the repo, but should go on [the
   website](http://remnqymi.com/) instead.

1. We use pre-commit hooks extensively, and they have helped us discover a lot
   of bugs and issues with our code, and also keep our repo organized. They are
not optional, and many of our pipelines assume that the pre-commits have done
their job. Their installation should be covered by `make install`. They are
defined in [`.pre-commit-config.yaml`](.pre-commit-config.yaml). They run
automatically before a commit. You can execute the following to appease them
(keep running them and applying their changes until they all pass):

   ```sh
   make test`
   ```

   Our pipelines currently have minimal dependencies. For a pair of dependent
   pipelines (where one downstream pipeline consumes the output of another upstream
   pipeline), the downstream will fare well even if pre-commits haven't been
   executed on the output of the upstream pipeline.
   If this were to change, reopen [#120](https://github.com/pishoyg/coptic/issues/120).

   [![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit)](https://github.com/pre-commit/pre-commit)


1. Some of our projects have a `data` subdirectory. Pay attention to the following
distinction:

   - `raw/`: Data that is **copied** from elsewhere. This would, for example,
   include the Marcion SQL tables copied as is, unmodified. The contents of this
   directory remain true to the original source.

   - `input/`: Data that we either *modified* or *created*. If we want to fix
   typos to data that we copied, we don't touch the data under `raw/`, but we take
   the liberty to modify the copies that live under `input/`.

## Planning

We use GitHub to track our plans and TODO's.

### Components

This list of components helps us group our work into a number of well-defined
focus areas. Milestones usually concern themselves with one of the components,
and issues and commit messages should be prefixed with a component name between
square brackets.

1. Crum: Crum's dictionary
1. KELLIA: KELLIA's dictionary
1. copticsite: copticsite's dictionary
1. Dawoud: Dawoud's dictionary
1. Bible: The Coptic Bible
1. Lexicon: [ⲡⲓⲖⲉⲝⲓⲕⲟⲛ](http://remnqymi.com/crum/)
1. Site: [Our website](http://remnqymi.com/)
1. Morphology: Our morphological analysis pipelines
1. platform: The development platform and tooling.
1. Community: Community of contributors and users.

### [Milestones](https://github.com/pishoyg/coptic/milestones?direction=asc&sort=due_date&state=open)

- Milestones represent long-term, complex goals or deliverables. They help us
draw our project path, and what it is that we're trying to achieve in the long
run. Milestones are a translation of the project's mission.

- Besides the more specific milestones that represent concrete goals, we have
  `(Backlog)` milestones, that represent miscellaneous pending improvements,
technical debt, optimizations, or desired changes; but which don't block the
achievement of one of the project's main goals.

- Milestone priorities are assigned using **due dates**.

- The number of milestones should remain _under control_.

- When work on a milestone is good enough, it's closed, the achievement is
celebrated, and its remaining issues move to an appropriate backlog milestone.

- As much as possible, each milestone should be concerned with a given
_component_.

### [Issues](https://github.com/pishoyg/coptic/issues/)

- Every issue [must belong to a
milestone](https://github.com/pishoyg/coptic/issues/?q=is%3Aissue%20state%3Aopen%20no%3Amilestone).

- Issues need to be as specific and isolated as possible. Most of the time, they
span a single component and involve a local change or set of local changes,
although they can sometimes work mainly in one component and spill to others,
and sometimes they're generic and span one aspect of multiple components (such
as the conventions set for the whole repo).

- High-priority issues are marked in a number of ways:
   - The [`favorable` label](https://github.com/pishoyg/coptic/labels/favorable).
   - Assignment to a developer
   - Belonging to a high-priority milestone.

- Add `TODO`s to the code whenever appropriate, always following `TODO` with a
colon, a space, and an issue number (with the pound sign) surrounded by
parenthesis. This format is enforced by a pre-commit hook, though the hook only
picks up a `TODO` if it's immediately followed by `:`. If the `TODO` is
low-priority, and isn't worth an associated issue, you can assign it to the
pseud-issue `#0`.

### [Labels](https://github.com/pishoyg/coptic/labels)

Wherever possible, use labels to help track and organize issues. Issues mostly
have exactly one *How*, and usually one *Why*.

Refer to [labels](https://github.com/pishoyg/coptic/labels/) for the most recent
definitions, but they should belong to the following categories:
   - `How`
     - How can the task be achieved?
       - `architect`: Planning and design.
       - `diplomacy`: Diplomacy, connections, and reachout.
       - `documentation`: Writing documentation.
       - `labor`: Manual data collection.
       - `code`: There is no `code` label, because that includes most tasks. A task
         that doesn't have another `How` label is probably a `code` task.
   - `Who`
     - Is the issue user-facing or developer-oriented?
       - `user`: A user-oriented improvement.
       - `dev`: A developer-oriented, not user-visible, improvement.
   - `Why`
     - What is the purpose of this issue?
       - `data`: Expand the data that we own.
       - `rigor`: Improve the rigor (particularly when it comes to such issues
       parsing, or inflection generation).
       - `UI`: Improve the user interface.
       - `bug`: Fix a bug.
       - `community`: Grow the ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ community.
   - `What`:
       A generic set of labels:
       - `favorable`: Nice to do soon.
       - `backlog`: Low-impact / low-priority.
       - `reports`: User reports.

### [Project](https://github.com/users/pishoyg/projects/3)

The [project](https://github.com/users/pishoyg/projects/3) page offers
alternative *views* of the issues, which can come in handy for planning
purposes.

### [Commits](https://github.com/pishoyg/coptic/commits/)

- Use the following format for the first line of the commit message:
   ```
   [#${ISSUE}][${COMPONENT}/${SUBCOMPONENT}] ${DESCRIPTION}
   ```

- Use proper punctuation and capitalization.
- The subcomponent is optional.
- Use `fix #${ISSUE}` to automatically close an issue with the commit.
- Besides the description line, include more details in the body of the commit
message, though make sure that the more important docs live in the code.

## Guidelines

1. Add excessive in-code assertions, and validate your assumptions whenever
   possible. This is our first line of defense, and has been the champion when
it comes to ensuring correctness and catching bugs.

1. Document the code.

1. Use type hints extensively.

1. Minimize dependence on HTML, and implement behaviours in TypeScript when
   possible.

1. Color the outputs whenever you can. It keeps your programmers entertained!

1. Avoid using a generic `utils` package. It can easily become a catch-all for
unrelated logic, grow excessively large, and lose clear purpose. Instead,
organize utilities into purpose-specific packages based on functionality.

### Languages

- Our pipelines are primarily written in Python. There is minimal logic in
  Bash.

- We have a strong bias for Python over Bash. Use Bash if you expect the number
of lines of code of an equivalent Python piece to be significantly more.

- We use TypeScript for static site logic. It then gets transpiled to
JavaScript by running `make transpile`. We don't write JavaScript directly.

- We expect to make a similar platform-specific expansion into another
territory for the app.

- In the past, we voluntarily used Java (for an archived project). Won't happen
again! We also used VBA and JS for Microsoft Excel and Google Sheet macros
(also archived at the moment) because they were required by the platform.

- It is desirable to strike a balance between the benefits of focusing on a
small number of languages, and the different powers that different language can
uniquely exhibit. We won't compromise the latter for the former. Use the
*right* language for a task. When two languages can do a job equally well,
uncompromisingly choose the one that is more familiar.

## [`stats`](data/stats.tsv)

- We collect extensive stats, and we remind you of them using a pre-commit. The
primary targets of our statistics are:
  - The size of our code (represented by the number of lines of code). We also
  collect this stat for each subproject or pipeline step independently.
  - The number of data items we've collected for data collection tasks.
  - We also record the number of commits, and the number of contributors.

# Project-specific

## [`dictionary/`](dictionary/)

This directory contains the data and logic for processing our dictionaries.

### [`marcion.sourceforge.net/`](dictionary/marcion_sourceforge_net)

#### Image Collection

##### Why?

There are many reasons we have decided to add pictures to our dictionary, and
heavily invested in the image pipeline. They have become one of the integral
pieces of our dictionary framework.

1. The meaning of a word is much more strongly and concretely conveyed by an
   image than by a word. Learning is not about knowing vocabulary or grammar.
Learning is ultimately about creating the neural pathways that enable language
to flow out of you naturally. A given word needs to settle and connect with
nodes in your [associative
memory](https://en.wikipedia.org/wiki/Associative_memory_(psychology)) in order
for you to be able to use it. If our goal is to create or strengthen the neural
pathways between a Coptic word and related nodes in your brain, then it aids
the learning process to achieve as much neural activation as possible during
learning. This is much better achieved by an image than by a mere translation,
given the way human brains work. After all, the visual processing areas of
our brains are bigger, faster, and far more ancient and primordial (even
reptiles can see) compared to the language processing areas. You will often
find that, when you learn a new word, the associated images pop up in your
brain more readily than the translation. Thus the use of images essentially
revolutionizes the language learning process.

2. Oftentimes, the words describe an entity or concept that is unfamiliar to
   many users. Things like ancient crafts, plant or fish species, farmer's
tools, and the like, are unfamiliar. Showing a user the English translation of
a word doesn't suffice for the user to understand what it is, and they would
often look up images themselves in order to find out what the word actually
means. By embedding the pictures in the dictionary, we save users some time so
they don't have to look it up themselves.

3. Translations are often taken lightly by users. Pictures are not. When a
   dictionary author translates a given Coptic word into different English
words, for example, the extra translations are often seen by users as
auxiliary - tokens added there to convey a meaning that the dictionary author
couldn't convey using fewer words.

   That's not the case for pictures. Pictures are taken seriously by users, and
   are more readily accepted as bearing a true, authentic, independent meaning
   of the word. Listing images (especially after we have started ascribing each
   image to a *sense* that the word conveys) is a way to recognize and
   legitimize those different senses and meanings that a word possesses.

   It's for this reason that images must be deeply contemplated, and a word must
   be digested well, before we add explanatory images for it. Collecting images
   is tantamount to authoring a dictionary.

##### Technical Guidelines

Our experience collecting images has taught us a few lessons. We tend to
follow the following guidelines when we search for pictures:

1. Each image ends up being resized to a width of 300 pixel and a height
proportional to the original. We prefer images with a minimum width of 300
pixels, though down to 200 is acceptable.

1. As for image height, short images are rarely ugly, but long images usually
are. So we set a generously low lower bound of 100 pixels on the resized
height, but set a stricter upper bound of 500 pixels. Although we tend to
prefer the height to fall within a range of 200 to 400 pixels.

1. Collecting sources is mandatory. We always record the URL that an image is
retrieved from. Our [`img_helper`](
dictionary/marcion_sourceforge_net/img_helper.py) script, which we use to
process images, can be supplied by a URL, and it will download the image and
store the source (and also resize the image to the final version). This
simplifies the process.

1. We make extensive use of *icons*. They can capture the meaning of a word in
situations when it's otherwise hard to describe a word using an image
([example](https://remnqymi.com/crum/11.html)).

1. This hasn't been contemplated, but when given a choice, prefer an ancient
Egyptian explanatory image, followed by an old (not necessarily Egyptian)
image, followed by a modern image ([example](
https://remnqymi.com/crum/1436.html)). We prefer to keep the images as close
as possible to their reflections in the mind of a native speaker. We also want
to stress the fact that those Coptic words can be equally used to refer to
entities from other cultures, or modern entities.

   This could be revisited later.

#### Undialected Entries

Some entries have no dialect specified in Crum, so they get treated as belonging
to all dialects. More information at
[#237](https://github.com/pishoyg/coptic/issues/237).

#### Entries that are Absent in Crum

The following entries are absent from Crum's dictionary. They were added to our
database from other sources:

1. https://remnqymi.com/crum/3380.html
2. https://remnqymi.com/crum/3381.html
3. https://remnqymi.com/crum/3382.html
4. https://remnqymi.com/crum/3385.html

### [`copticocc.org/`](dictionary/copticocc_org)

[`copticocc_org/`](dictionary/copticocc_org/) contains a digital scan of
Moawad Dawoud's dictionary.

### [`kellia.uni-goettingen.de/`](dictionary/kellia_uni_goettingen_de)

### [`copticsite.com/`](dictionary/copticsite_com/)

## [`bible/`](bible/)

This directory contains the data and logic for processing the Bible corpus.

### [`stshenouda.org/`](bible/stshenouda_org/)

There are several published versions of the Coptic Bible. The most
recent, and most complete, is that of [St. Shenouda the Archmandrite
Coptic Society](http://stshenouda.org). It is the Coptic Bible project that is
most worthy of investment at the moment.

## [`flashcards/`](flashcards/)

This directory contains the data and logic for processing dictionaries into
*flashcards* and Lexicon. It is named as such because our first use case was a
flashcard app, although our use of the dictionaries has since become more
versatile.

## [`morphology/`](morphology/)

This directory contains the data and logic for generating the morphological
dictionaries (to support inflections).

## [`docs/`](docs/)

This directory contains the static data for [our website](http://remnqymi.com/).

# Data Collection

We need data collectors. Data collection tasks bear the [`labor`
label](https://github.com/pishoyg/coptic/labels/labor). The [`data`
label](https://github.com/pishoyg/coptic/labels/data) is related, but is more
generic.

As of today, we need collectors for the following:

- Crum ([#303](https://github.com/pishoyg/coptic/issues/303)):
  - Review our [Crum dataset](https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg) ([#9](https://github.com/pishoyg/coptic/issues/9), [#320](https://github.com/pishoyg/coptic/issues/320)).
  - Populate [appendices](https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg):
    - Categories ([#321](https://github.com/pishoyg/coptic/issues/321))
    - Sisters ([#227](https://github.com/pishoyg/coptic/issues/227))
    - Last pages ([#255](https://github.com/pishoyg/coptic/issues/255))
    - Senses ([#189](https://github.com/pishoyg/coptic/issues/189))
    - Override types ([#126](https://github.com/pishoyg/coptic/issues/126))[^1]
  - Collect explanatory images
  ([#5](https://github.com/pishoyg/coptic/issues/5),
  [#263](https://github.com/pishoyg/coptic/issues/263), [#258](https://github.com/pishoyg/coptic/issues/258)).
- Lexicon:
  - Populate
  [sentinels](https://drive.google.com/drive/u/0/folders/1Wlz6RXzozyypXtYV1Hq58uQAfJQV97Oo)
- Bible:
  - Rewrite the text ([#131](https://github.com/pishoyg/coptic/issues/131))
  - Review morphological analysis[^2].
- Dawoud (Future):
  - [#117](https://github.com/pishoyg/coptic/issues/117)
  - [#2](https://github.com/pishoyg/coptic/issues/2)
  - [#3](https://github.com/pishoyg/coptic/issues/3)
- Pronunciations (Future):
  - [#216](https://github.com/pishoyg/coptic/issues/216)

Other labor tasks may be less relevant as of the time of writing, and are not
included.

[^1]: *pending [#196](https://github.com/pishoyg/coptic/issues/196)*

[^2]: *No issue! Pending
  [#159](https://github.com/pishoyg/coptic/issues/159); or, more likely, a
  new Sheets-based Bible pipeline
  ([38](https://github.com/pishoyg/coptic/milestone/38), maybe
[#193](http://github.com/pishoyg/coptic/issues/193))!*

***
Ⲉ̀ϣⲱⲡ ⲁⲓϣⲁⲛⲉⲣⲡⲉⲱⲃϣ Ⲓⲗ̅ⲏ̅ⲙ̅, ⲉⲓⲉ̀ⲉⲣⲡⲱⲃϣ ⲛ̀ⲧⲁⲟⲩⲓⲛⲁⲙ: Ⲡⲁⲗⲁⲥ ⲉϥⲉ̀ϫⲱⲗϫ ⲉ̀ⲧⲁϣ̀ⲃⲱⲃⲓ ⲉ̀ϣⲱⲡ
ⲁⲓϣ̀ⲧⲉⲙⲉⲣⲡⲉⲙⲉⲩⲓ.
