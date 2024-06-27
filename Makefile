.PHONY: all
all: validate test build

.PHONY: validate
validate: precommit readme

.PHONY: test
test: unittest

.PHONY: build
build: bible copticsite marcion kellia flashcards

.PHONY: privileged
privileged: drive

.PHONY: pollute
pollute: bible_epub img_resize analysis

.PHONY: redundant
redundant: flashcards_crum_sahidic flashcards_crum flashcards_copticsite flashcards_bible flashcards_kellia_comprehensive flashcards_kellia

.PHONY: verify
verify: verify_identical_flashcards verify_identical_flashcards_crum_sahidic

.PHONY: try
try: try_flashcards try_flashcards_crum_sahidic

.PHONY: stats
stats: loc

.PHONY: clean
clean: git_clean

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

unittest: FORCE
	python -m unittest discover \
		"flashcards"

# BIBLE RULES
bible: FORCE
	python bible/stshenouda.org/main.py \
		--no_epub "true"

bible_epub: FORCE
	# N.B. This is not included in `all`. It unnecessarily pollutes the repo
	# directory.
	python bible/stshenouda.org/main.py

# COPTICSITE_COM RULES
copticsite: FORCE
	python dictionary/copticsite.com/main.py

# MARCION RULES
marcion: FORCE
	python dictionary/marcion.sourceforge.net/main.py

img_resize: FORCE
	# N.B. This is not included in `all`. It unnecessarily pollutes the repo
	# directory.
	bash dictionary/marcion.sourceforge.net/resize.sh

# KELLIA RULES
analysis: FORCE
	python dictionary/kellia.uni-goettingen.de/analysis.py

kellia: FORCE
	python dictionary/kellia.uni-goettingen.de/main.py

# FLASHCARD RULES
TIMESTAMP = 1719485923
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

drive: FORCE
	cp \
		flashcards/data/*.apkg \
		"$${DEST_DIR}"

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

restore_modified_img_300: FORCE
	git status --short \
		| grep "M" \
		| grep "dictionary/marcion.sourceforge.net/data/img-300/" \
		| awk '{ print $$2 }' \
		| xargs git restore

git_clean: FORCE
	git clean \
		-x \
		-d \
		--exclude "flashcards/data/*.apkg" \
		--exclude "secrets.sh" \
		--force

loc:
	find . \
		-name "*.py" -o -name "*.java" \
		-o -name "*.proto" -o -name "*.sh" \
		-o -name "*.js" -o -name "*.vba" \
		| xargs cat | wc -l

