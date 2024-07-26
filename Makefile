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
generate_1: bible copticsite marcion marcion_dawoud marcion_img kellia kellia_analysis

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
amazon: precommit marcion kindle kindle_cp_to_drive

.PHONY: clean
clean: git_clean bible_epub_clean kellia_analysis_clean

.PHONY: toil
toil: marcion_img_find

.PHONY: verify
verify: flashcards_verify flashcards_crum_sahidic_verify

.PHONY: try
try: flashcards_try flashcards_crum_sahidic_try

.PHONY: todo
todo: todo_aux

.PHONY: marcion_img_validate
marcion_img_validate: marcion_img_validate_aux

.PHONY: update
update: precommit_update pip_update

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

# MARCION RULES
marcion: $(shell find dictionary/marcion.sourceforge.net/ -type f)
	python dictionary/marcion.sourceforge.net/main.py

marcion_dawoud: FORCE
	curl -L \
		"https://docs.google.com/spreadsheets/d/e/2PACX-1vTItxV4E4plQrzjWLSea85ZFQWcQ4ba-p2BBIDG9h5yI0i9URn9GD9zZhxEj8kVI7jhCoPWPEapd9D7/pub?output=tsv" \
		| cut --fields 1,2,3 \
		> "dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv"

marcion_img: $(shell find dictionary/marcion.sourceforge.net/data/ -type f)
	bash dictionary/marcion.sourceforge.net/img_setup.sh \
		$${SKIP_EXISTING}

marcion_img_find: FORCE
	python dictionary/marcion.sourceforge.net/img_find.py \
		--skip_existing=true \
		--exclude "type-parsed:verb" "dialect-B:" \
		--start_at_key="$${START_AT_KEY}"

marcion_img_validate_aux: FORCE
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
	python flashcards/main.py

flashcards_crum_sahidic: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Sahidic" \
		--output "flashcards/data/crum_sahidic.apkg"

flashcards_crum: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" "A Coptic Dictionary::Sahidic" "A Coptic Dictionary::Bohairic / Sahidic" "A Coptic Dictionary::All Dialects" \
		--output "flashcards/data/crum.apkg"

flashcards_copticsite: FORCE
	python flashcards/main.py \
		--decks "copticsite.com" \
		--output "flashcards/data/copticsite.apkg"

flashcards_bible: FORCE
	python flashcards/main.py \
		--decks "Bible::Bohairic" "Bible::Sahidic" "Bible::All Dialects" \
		--output "flashcards/data/bible.apkg"

flashcards_kellia: FORCE
	python flashcards/main.py \
		--decks "KELLIA::Comprehensive" "KELLIA::Egyptian" "KELLIA::Greek"\
		--output "flashcards/data/kellia.apkg"

flashcards_kellia_comprehensive: FORCE
	python flashcards/main.py \
		--decks "KELLIA::Comprehensive" \
		--output "flashcards/data/kellia_comprehensive.apkg"

flashcards_redundant: flashcards_crum_sahidic flashcards_crum flashcards_copticsite flashcards_bible flashcards_kellia_comprehensive flashcards_kellia

flashcards_cp_to_drive: $(shell find flashcards/data/ -type f)
	cp \
		flashcards/data/*.apkg \
		"$${FLASHCARD_DIR}"

flashcards_verify: flashcards_try
	bash ziff.sh \
		"flashcards/data/coptic.apkg"
		"$${TEST_DIR}/coptic.apkg" \

flashcards_crum_sahidic_verify: flashcards_crum_sahidic_try
	bash ziff.sh \
		"flashcards/data/crum_sahidic.apkg" \
		"$${TEST_DIR}/crum_sahidic.apkg"

flashcards_try: FORCE
	python flashcards/main.py \
		--output "$${TEST_DIR}/coptic.apkg"

flashcards_crum_sahidic_try: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Sahidic" \
		--output "$${TEST_DIR}/crum_sahidic.apkg"

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
	python3 -m pip install -e . "$${BREAK_SYSTEM_PACKAGES}"

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
		--exclude "flashcards/data/*.apkg" \
		--exclude "vault.sh" \
		--force

stats_aux: FORCE
	bash stats.sh

# LEVEL-0 rules ###############################################################

# FORCE
.PHONY: FORCE
FORCE:
