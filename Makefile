SHELL := /bin/bash

# VAULT
#
# If you know the secrets, then you can run the privileged tasks. They require
# a set of variables to be exported. These are contained in a file,
# (referred to as `vault.sh` although you can call it whatever you want), that
# you need to source before running the privileged make rules.
# ```
# source vault.sh && make ${PRIVILEGED_RULE}
# ```
# Some variables are used by rules below, but they are not necessary for the
# rules to run.
# Most variables are trivial to replace with viable values. Some variables
# (such as the Google Cloud API access token, required for communication with
# Drive) require setting up your own account and destination in Drive. Relevant
# scripts will have more information.
#
# See TEMPLATE_vault.sh for more information.

# LEVELS
#
# Level-3 rules use level-2 rules.
# Level-2 rules use level-1 rules.

# LEVEL 3 RULES ###############################################################

.PHONY: all
# You might want to run `make clean` following this.
all: install generate_1 test generate_2 generate_3 publish stats

# LEVEL 2 RULES ###############################################################

.PHONY: install
install: bin_install pip_install python_install precommit_install

# generate_1 rules are prerequisites for generate_2 rules.
.PHONY: generate_1
generate_1: bible copticsite crum crum_dawoud crum_img kellia kellia_analysis

.PHONY: test
test: precommit

# generate_2 rules are prerequisites for generate_3 rules.
.PHONY: generate_2
generate_2: flashcards flashcards_redundant kindle

# This is a placeholder for an upcoming `anki` rule that will exist after we
# split the flashcard pipeline into two stages. Flashcards will be written by
# to an intermediate format before being written as Anki packages.
.PHONY: generate_3
generate_3:

.PHONY: publish
publish: flashcards_cp_to_drive kindle_cp_to_drive bible_cp_to_drive

.PHONY: stats
stats: stats_aux

# The following level-2 rules are not included in any of the level-3 rules
# above. This is because they are mainly relevant during development, but are
# not part of the main deployment pipeline.

.PHONY: flash
flash: precommit flashcards flashcards_redundant flashcards_cp_to_drive

.PHONY: amazon
amazon: precommit crum kindle kindle_cp_to_drive

.PHONY: clean
clean: git_clean bible_epub_clean kellia_analysis_clean

.PHONY: toil
toil: crum_img_find

.PHONY: todo
todo: todo_aux

.PHONY: crum_img_validate
crum_img_validate: crum_img_validate_aux

.PHONY: update
update: precommit_update pip_update

.PHONY: camera
camera: camera_aux

# LEVEL 1 RULES ###############################################################

# BIBLE RULES
bible: FORCE
	python bible/stshenouda.org/main.py

bible_cp_to_drive: FORCE
	cp \
	"bible/stshenouda.org/data/output/epub/bohairic_english.epub" \
	"$${BIBLE_DIR}/2. bohairic_english - single-column - Kindle.epub"

bible_epub_clean: $(shell ls bible/stshenouda.org/data/output/epub*/*.epub)
	git restore "bible/stshenouda.org/data/output/epub*/*.epub"

# COPTICSITE_COM RULES
copticsite: FORCE
	python dictionary/copticsite.com/main.py

# CRUM RULES
crum: $(shell find dictionary/marcion.sourceforge.net/ -type f)
	python dictionary/marcion.sourceforge.net/main.py

crum_dawoud: FORCE
	curl -L \
		"https://docs.google.com/spreadsheets/d/e/2PACX-1vTItxV4E4plQrzjWLSea85ZFQWcQ4ba-p2BBIDG9h5yI0i9URn9GD9zZhxEj8kVI7jhCoPWPEapd9D7/pub?output=tsv" \
		| cut --fields 1,2,3 \
		> "dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv"

crum_notes: FORCE
	curl -L \
		"https://docs.google.com/spreadsheets/d/e/2PACX-1vRi-3twJ_GWXhvbeXU9cxtmHc6j1rY8XJI7pggMyG3EP5KZHrK__S7GQmwMm8tGelPHU2ye6mZMo831/pub?output=tsv" \
		| cut --fields 1,2 \
		> "dictionary/marcion.sourceforge.net/data/notes/notes.tsv"

crum_img: $(shell find dictionary/marcion.sourceforge.net/data/ -type f)
	bash dictionary/marcion.sourceforge.net/img_setup.sh \
		$${SKIP_EXISTING} $${MANUAL_SOURCES}

crum_img_find: FORCE
	# TODO: Remove the filters. Do all the words.
	python dictionary/marcion.sourceforge.net/img_find.py \
		--skip_existing=true \
		--exclude "type-parsed:verb" "dialect-B:" \
		--start_at_key="$${START_AT_KEY}" \
		--thenounproject_key="$${THENOUNPROJECT_KEY}" \
		--thenounproject_secret="$${THENOUNPROJECT_SECRET}"


crum_img_validate_aux: FORCE
	bash dictionary/marcion.sourceforge.net/img_validate.sh

# KELLIA RULES
kellia: FORCE
	python dictionary/kellia.uni-goettingen.de/main.py

kellia_analysis: FORCE
	python dictionary/kellia.uni-goettingen.de/analysis.py

kellia_analysis_clean: dictionary/kellia.uni-goettingen.de/analysis.json
	git restore "dictionary/kellia.uni-goettingen.de/analysis.json"

# FLASHCARD RULES
flashcards: FORCE
	python flashcards/main.py \
		--dir "flashcards/data/output/dir"

flashcards_crum_bohairic: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" \
		--anki "flashcards/data/output/anki/crum_bohairic.apkg"

flashcards_crum: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" "A Coptic Dictionary::Sahidic" "A Coptic Dictionary::Bohairic / Sahidic" "A Coptic Dictionary::All Dialects" \
		--anki "flashcards/data/output/anki/crum.apkg"

flashcards_copticsite: FORCE
	python flashcards/main.py \
		--decks "copticsite.com" \
		--anki "flashcards/data/output/anki/copticsite.apkg"

flashcards_kellia: FORCE
	python flashcards/main.py \
		--decks "KELLIA::Comprehensive" "KELLIA::Egyptian" "KELLIA::Greek"\
		--anki "flashcards/data/output/anki/kellia.apkg"

flashcards_kellia_comprehensive: FORCE
	python flashcards/main.py \
		--decks "KELLIA::Comprehensive" \
		--anki "flashcards/data/output/anki/kellia_comprehensive.apkg"

flashcards_redundant: flashcards_crum_bohairic flashcards_crum flashcards_copticsite flashcards_kellia_comprehensive flashcards_kellia

flashcards_cp_to_drive: $(shell find flashcards/data/output/anki/ -type f)
	cp \
		flashcards/data/output/anki/*.apkg \
		"$${FLASHCARD_DIR}"

# KINDLE RULES
kindle: FORCE
	./archive/kindlegen/kindlegen \
	-gen_ff_mobi7 \
	-dont_append_source \
	-c0 \
	"dictionary/marcion.sourceforge.net/data/output/dialect-B/dialect-B.opf"

kindle_cp_to_drive:
	cp \
	"dictionary/marcion.sourceforge.net/data/output/dialect-B/dialect-B.mobi" \
	"$${KINDLE_DIR}"

# INFRASTRUCTURE RULES
bin_install:
	if ! command -v tidy &> /dev/null; then echo "Please install tidy from https://www.html-tidy.org/." && exit 1; fi
	if ! command -v magick &> /dev/null; then echo "Please install magick from https://imagemagick.org/." && exit 1; fi

pip_install: requirements.txt
	python -m pip install --upgrade pip "$${BREAK_SYSTEM_PACKAGES}"
	python -m pip install -r requirements.txt "$${BREAK_SYSTEM_PACKAGES}"

pip_update: FORCE
	pip-review --local --auto

python_install:
	python -m pip install -e . "$${BREAK_SYSTEM_PACKAGES}"

precommit_install:
	pre-commit install

precommit: FORCE
	pre-commit run

precommit_update: FORCE
	pre-commit autoupdate

todo_aux: FORCE
	grep TODO -R bible dictionary keyboard flashcards kindle

git_clean: FORCE
	git clean \
		-x \
		-d \
		--exclude "flashcards/data/output/anki/*.apkg" \
		--exclude "vault.sh" \
		--force

stats_aux: FORCE
	bash stats.sh

camera_aux: FORCE
	grep \
		--invert \
		-E "^manual$$|^http.*$$" \
		-R "dictionary/marcion.sourceforge.net/data/img-sources" \
		| grep -oE "[^/]+$$" \
		| sed 's/\.txt:/ /' \
		| awk '{ printf "\033[32m%-15s\t\033[31m%-15s\033[0;39m\n", $$1, $$2 }'

	grep \
		--invert \
		-E "^manual$$|^http.*$$" \
		-R "dictionary/marcion.sourceforge.net/data/img-sources" \
		--files-with-matches \
		| sed 's/img-sources/img/' \
		| sed "s/\.txt$$/\.*/" \
		| while read -r GLOB; do ls $${GLOB} | xargs open; done

# LEVEL-0 rules ###############################################################

# FORCE
.PHONY: FORCE
FORCE:
