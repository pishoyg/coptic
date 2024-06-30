SHELL:=/bin/bash

.PHONY: all
all: validate test setup build

.PHONY: allall  # This includes privileged rules.
allall: validate test download setup build deploy stats

.PHONY: allallall  # This includes privileged and pollute rules.
allallall: download setup validate test build deploy stats pollute

.PHONY: download
download: download_marcion_dawoud

.PHONY: setup
setup: marcion_img_convert_resize

.PHONY: validate
validate: precommit readme image_extensions

.PHONY: test
test: unittest

.PHONY: build
build: bible copticsite marcion kellia flashcards

.PHONY: deploy
deploy: cp_flashcards_to_drive

.PHONY: stats
stats: loc img_count

.PHONY: pollute
pollute: bible_epub analysis

# The below rules are only run in special cases, and are not included in any of
# the alls.
.PHONY: clean
clean: git_clean clean_bible_epub clean_analysis

.PHONY: toil
toil: find_images

.PHONY: flashcards_redundant
flashcards_redundant: flashcards_crum_sahidic flashcards_crum flashcards_copticsite flashcards_bible flashcards_kellia_comprehensive flashcards_kellia

.PHONY: flashcards_verify
flashcards_verify: verify_identical_flashcards verify_identical_flashcards_crum_sahidic

.PHONY: flashcards_try
flashcards_try: try_flashcards try_flashcards_crum_sahidic

.PHONY: FORCE
FORCE:

# If you know the secrets, then you can run the privileged tasks. They require
# a set of variables to be exported. These are contained in a `secrets.sh` file
# that you source.
# You can create your own version of `secrets.sh`. There is nothing magical
# there, just some paths and access tokens that belong to me. You can create
# your own so you can run the privileged rules on your account.
# ```
# source secrets.sh && make privileged
# ```
# The rules that run privileged will fail unless `secrets.sh` has already been
# sourced.

precommit: FORCE
	pre-commit run

readme: FORCE
	doctoc \
		"README.md" \
		"bible/README.md" \
		"dictionary/README.md" \
		"flashcards/README.md" 

image_extensions: FORCE
	echo "Checking for unknown image extensions:"
	comm -23 <( ls dictionary/marcion.sourceforge.net/data/img/ | grep -o '\..*' | tr '[:upper:]' '[:lower:]' | sort | uniq ) <( echo .avif .gif .jpeg .jpg .png .webp | tr ' ' '\n' | sort )

unittest: FORCE
	python -m unittest discover \
		"flashcards"

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
download_marcion_dawoud: FORCE
	python utils/download_gsheet.py \
		--json_keyfile_name "$${JSON_KEYFILE_NAME}" \
		--gspread_url "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg" \
		--column_names "key" "dawoud-pages" "dawoud-pages-redone" \
		--out_tsv "dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv"

marcion: FORCE
	python dictionary/marcion.sourceforge.net/main.py

marcion_img_convert_resize: FORCE
	bash dictionary/marcion.sourceforge.net/convert_resize.sh

# KELLIA RULES
analysis: FORCE
	python dictionary/kellia.uni-goettingen.de/analysis.py

kellia: FORCE
	python dictionary/kellia.uni-goettingen.de/main.py

# FLASHCARD RULES
TIMESTAMP = 1719661278
START_AT_KEY = 1249

timestamp: FORCE
	date +%s | pbcopy

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

cp_flashcards_to_drive: FORCE
	cp \
		flashcards/data/*.apkg \
		"$${DEST_DIR}"

# Image collection.
find_images: FORCE
	python dictionary/marcion.sourceforge.net/find_images.py \
		--skip_existing=true \
		--exclude "verb" \
		--start_at_key="${START_AT_KEY}"

img_count: FORCE
	ls dictionary/marcion.sourceforge.net/data/img/ \
		| grep -oE '^[0-9]+' \
		| sort \
		| uniq \
		| wc

# DEVELOPER
verify_identical_flashcards: try_flashcards
	bash utils/ziff.sh \
		"flashcards/data/coptic.apkg"
		"$${TEST_DIR}/coptic.apkg" \

verify_identical_flashcards_crum_sahidic: try_flashcards_crum_sahidic
	bash utils/ziff.sh \
		"flashcards/data/crum_sahidic.apkg" \
		"$${TEST_DIR}/crum_sahidic.apkg"

try_flashcards: FORCE
	python flashcards/main.py \
		--output "$${TEST_DIR}/coptic.apkg" \
		--timestamp "${TIMESTAMP}"

try_flashcards_crum_sahidic: FORCE
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

clean_bible_epub: FORCE
	git restore "bible/stshenouda.org/data/output/epub*/*.epub"

clean_analysis: FORCE
	git restore "dictionary/kellia.uni-goettingen.de/analysis.json"

loc: FORCE
	find . \
		-name "*.py" -o -name "*.java" \
		-o -name "*.proto" -o -name "*.sh" \
		-o -name "*.js" -o -name "*.vba" \
		| xargs cat | wc -l

