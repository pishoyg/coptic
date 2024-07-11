SHELL:=/bin/bash

# SECRETS
#
# If you know the secrets, then you can run the privileged tasks. They require
# a set of variables to be exported. These are contained in a `secrets.sh` file
# that you need to source before running the privileged make rules.
# ```
# source secrets.sh && make ${PRIVILEGED_RULE}
# ```
# See TEMPLATE_secrets.sh for more information.


# LEVELS
#
# Level-3 rules use level-2 rules.
# Level-2 rules use level-1 rules.

# LEVEL 3 RULES ###############################################################

.PHONY: all
all: install generate_1 validate generate_2 generate_3 publish stats

.PHONY: flash
flash: validate generate_2 generate_3 publish stats

# LEVEL 2 RULES ###############################################################

.PHONY: install
install: pip_install python_install

.PHONY: generate_1
generate_1: bible copticsite marcion marcion_dawoud marcion_img kellia kellia_analysis

.PHONY: validate
validate: precommit

.PHONY: generate_2
generate_2: flashcards flashcards_redundant

.PHONY: generate_3
	# This is a placeholder for an upcoming `anki` rule that will exist after we
	# split the flashcard TSV generation from Anki package generation pipelines.
generate_3:

.PHONY: publish
publish: flashcards_cp_to_drive

.PHONY: stats
stats: loc marcion_img_count marcion_dawoud_count

# The following level-2 rules are not included in any of the level-3 rules
# above. They are relevant only during development, but not for deployment.

.PHONY: clean
clean: git_clean bible_epub_clean kellia_analysis_clean

.PHONY: toil
toil: marcion_img_find

.PHONY: verify
verify: flashcards_verify flashcards_crum_sahidic_verify

.PHONY: try
try: flashcards_try flashcards_crum_sahidic_try

.PHONY: precommit_scripts
precommit_scripts: readme_doctoc marcion_img_validate python_unittest

.PHONY: organize
organize: py_dirs

# LEVEL 1 RULES ###############################################################

pip_install: requirements.txt
	python -m pip install --upgrade pip "$${BREAK_SYSTEM_PACKAGES}"
	python -m pip install -r requirements.txt "$${BREAK_SYSTEM_PACKAGES}"

python_install:
	python3 -m pip install -e . "$${BREAK_SYSTEM_PACKAGES}"

precommit: FORCE
	pre-commit run

# BIBLE RULES
bible: FORCE
	python bible/stshenouda.org/main.py

# COPTICSITE_COM RULES
copticsite: FORCE
	python dictionary/copticsite.com/main.py

# MARCION RULES
marcion_dawoud: FORCE
	curl -L \
		"https://docs.google.com/spreadsheets/d/e/2PACX-1vTItxV4E4plQrzjWLSea85ZFQWcQ4ba-p2BBIDG9h5yI0i9URn9GD9zZhxEj8kVI7jhCoPWPEapd9D7/pub?output=tsv" \
		> "dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv"

marcion_dawoud_count: FORCE
	# Number of words that have at least one page from Dawoud:
	cat dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv \
		| awk -F"\t" '{ print $$2 $$3 }'  \
		| grep --invert '^$$'  \
		| wc --lines

marcion: $(shell find dictionary/marcion.sourceforge.net/ -type f)
	python dictionary/marcion.sourceforge.net/main.py

marcion_img: $(shell find dictionary/marcion.sourceforge.net/data/ -type f)
	bash dictionary/marcion.sourceforge.net/img_setup.sh \
		$${SKIP_EXISTING}

# KELLIA RULES
kellia_analysis: FORCE
	python dictionary/kellia.uni-goettingen.de/analysis.py

kellia: FORCE
	python dictionary/kellia.uni-goettingen.de/main.py

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
		"$${DEST_DIR}"

# Image collection.
marcion_img_find: FORCE
	python dictionary/marcion.sourceforge.net/img_find.py \
		--skip_existing=true \
		--exclude "type:verb" \
		--exclude "dialect-B:" \
		--start_at_key="$${START_AT_KEY}"

marcion_img_count: FORCE
	# Number of words possessing at least one image:
	ls dictionary/marcion.sourceforge.net/data/img/ \
		| grep -oE '^[0-9]+' \
		| sort \
		| uniq \
		| wc --lines

# DEVELOPER
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

git_clean: FORCE
	git clean \
		-x \
		-d \
		--exclude "flashcards/data/*.apkg" \
		--exclude "secrets.sh" \
		--force

bible_epub_clean: $(shell ls bible/stshenouda.org/data/output/epub*/*.epub)
	git restore "bible/stshenouda.org/data/output/epub*/*.epub"

kellia_analysis_clean: dictionary/kellia.uni-goettingen.de/analysis.json
	git restore "dictionary/kellia.uni-goettingen.de/analysis.json"

loc: FORCE
	# Number of lines of code:
	find . \
		-name "*.py" -o -name "*.java" \
		-o -name "*.proto" -o -name "*.sh" \
		-o -name "*.js" -o -name "*.vba" \
		| grep --invert "^./archive/copticbible.apk/" \
		| xargs cat | wc --lines

readme_doctoc: FORCE
	bash doctoc_readme.sh

marcion_img_validate: FORCE
	bash dictionary/marcion.sourceforge.net/img_validate.sh

python_unittest: FORCE
	bash python_unittest.sh

py_dirs: FORCE
	find . -name "*.py" | xargs dirname | grep --invert "^./archive" | sort | uniq
# FORCE

# LEVEL-0 rules ###############################################################
.PHONY: FORCE
FORCE:

