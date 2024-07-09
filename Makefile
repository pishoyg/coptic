SHELL:=/bin/bash

TIMESTAMP = $(shell cat timestamp.txt)

.PHONY: all
all: install setup validate generate stats

.PHONY: allall  # This includes privileged rules.
allall: install download setup validate generate publish stats

.PHONY: allallall  # This includes privileged and pollute rules.
allallall: install download setup validate generate publish stats pollute

.PHONY: install
install: pip_install 

.PHONY: download
download: marcion_dawoud_download

.PHONY: setup
setup: marcion_img_setup

.PHONY: validate
validate: precommit

.PHONY: generate
generate: bible copticsite marcion kellia flashcards flashcards_redundant

.PHONY: publish
publish: flashcards_cp_to_drive

.PHONY: stats
stats: loc marcion_img_count marcion_dawoud_count

.PHONY: pollute
pollute: bible_epub kellia_analysis

# The rules below are not included in any of the "all" rules above. They are
# intended to be run as one-offs.

.PHONY: increment
increment: flashcards_timestamp

.PHONY: clean
clean: git_clean bible_epub_clean kellia_analysis_clean

.PHONY: toil
toil: marcion_find_images

.PHONY: verify
verify: flashcards_verify flashcards_crum_sahidic_verify

.PHONY: try
try: flashcards_try flashcards_crum_sahidic_try

# The rules below are not included in any of the "all" rules above. They run in
# pre-commit.

.PHONY: doctoc_readme
doctoc_readme: FORCE
	bash doctoc_readme.sh

.PHONY: marcion_img_validate
marcion_validate: FORCE
	bash dictionary/marcion.sourceforge.net/img_validate.sh

.PHONY: python_unittest
python_unittest: FORCE
	bash python_unittest.sh

# FORCE

.PHONY: FORCE
FORCE:

# If you know the secrets, then you can run the privileged tasks. They require
# a set of variables to be exported. These are contained in a `secrets.sh` file
# that you need to source before running the privileged make rules.
# ```
# source secrets.sh && make ${PRIVILEGED_RULE}
# ```
# You can create your own version of `secrets.sh`. There is nothing magical
# in that file - just some paths and access tokens that belong to me.
# Check secrets_template.sh for more information.
# Rules that use exported variables are generally privileged, though sometimes
# they can run even if the variables are unpopulated.

pip_install: FORCE
	python -m pip install --upgrade pip "$${BREAK_SYSTEM_PACKAGES}"
	python -m pip install -r requirements.txt "$${BREAK_SYSTEM_PACKAGES}"

precommit: FORCE
	pre-commit run

# BIBLE RULES
bible: FORCE
	python bible/stshenouda.org/main.py \
		--no_epub "true"

bible_epub: FORCE
	python bible/stshenouda.org/main.py

# COPTICSITE_COM RULES
copticsite: FORCE
	python dictionary/copticsite.com/main.py

# MARCION RULES
marcion_dawoud_download: FORCE
	python utils/download_gsheet.py \
		--json_keyfile_name "$${JSON_KEYFILE_NAME}" \
		--gspread_url "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg" \
		--column_names "key" "dawoud-pages" "dawoud-pages-redone" \
		--out_tsv "dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv"

marcion_dawoud_count: FORCE
	# Number of words that have at least one page from Dawoud:
	cat dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv \
		| awk '{ print $$2 }'  \
		| grep --invert '^$$'  \
		| wc

marcion: FORCE
	python dictionary/marcion.sourceforge.net/main.py

marcion_img_setup: FORCE
	bash dictionary/marcion.sourceforge.net/img_setup.sh

# KELLIA RULES
kellia_analysis: FORCE
	python dictionary/kellia.uni-goettingen.de/analysis.py

kellia: FORCE
	python dictionary/kellia.uni-goettingen.de/main.py

# FLASHCARD RULES
flashcards_timestamp: FORCE
	date +%s > timestamp.txt

flashcards: FORCE
	python flashcards/main.py \
		--timestamp "${TIMESTAMP}"

flashcards_crum_sahidic: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Sahidic" \
		--output "flashcards/data/crum_sahidic.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_crum: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" "A Coptic Dictionary::Sahidic" "A Coptic Dictionary::Bohairic / Sahidic" "A Coptic Dictionary::All Dialects" \
		--output "flashcards/data/crum.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_copticsite: FORCE
	python flashcards/main.py \
		--decks "copticsite.com" \
		--output "flashcards/data/copticsite.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_bible: FORCE
	python flashcards/main.py \
		--decks "Bible::Bohairic" "Bible::Sahidic" "Bible::All Dialects" \
		--output "flashcards/data/bible.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_kellia: FORCE
	python flashcards/main.py \
		--decks "KELLIA::Comprehensive" "KELLIA::Egyptian" "KELLIA::Greek"\
		--output "flashcards/data/kellia.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_kellia_comprehensive: FORCE
	python flashcards/main.py \
		--decks "KELLIA::Comprehensive" \
		--output "flashcards/data/kellia_comprehensive.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_redundant: flashcards_crum_sahidic flashcards_crum flashcards_copticsite flashcards_bible flashcards_kellia_comprehensive flashcards_kellia

flashcards_cp_to_drive: FORCE
	cp \
		flashcards/data/*.apkg \
		"$${DEST_DIR}"

# Image collection.
marcion_find_images: FORCE
	python dictionary/marcion.sourceforge.net/find_images.py \
		--skip_existing=true \
		--exclude "verb" \
		--start_at_key="$${START_AT_KEY}"

marcion_img_count: FORCE
	# Number of words possessing at least one image:
	ls dictionary/marcion.sourceforge.net/data/img/ \
		| grep -oE '^[0-9]+' \
		| sort \
		| uniq \
		| wc

# DEVELOPER
flashcards_verify: flashcards_try
	bash utils/ziff.sh \
		"flashcards/data/coptic.apkg"
		"$${TEST_DIR}/coptic.apkg" \

flashcards_crum_sahidic_verify: flashcards_crum_sahidic_try
	bash utils/ziff.sh \
		"flashcards/data/crum_sahidic.apkg" \
		"$${TEST_DIR}/crum_sahidic.apkg"

flashcards_try: FORCE
	python flashcards/main.py \
		--output "$${TEST_DIR}/coptic.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_crum_sahidic_try: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Sahidic" \
		--output "$${TEST_DIR}/crum_sahidic.apkg" \
		--timestamp "${TIMESTAMP}"

git_clean: FORCE
	git clean \
		-x \
		-d \
		--exclude "flashcards/data/*.apkg" \
		--exclude "secrets.sh" \
		--force

bible_epub_clean: FORCE
	git restore "bible/stshenouda.org/data/output/epub*/*.epub"

kellia_analysis_clean: FORCE
	git restore "dictionary/kellia.uni-goettingen.de/analysis.json"

loc: FORCE
	# Number of lines of code:
	find . \
		-name "*.py" -o -name "*.java" \
		-o -name "*.proto" -o -name "*.sh" \
		-o -name "*.js" -o -name "*.vba" \
		| xargs cat | wc -l

