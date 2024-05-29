.PHONY: all
all: validate test build

.PHONY: validate
validate: precommit readme

.PHONY: test
test: unittest

.PHONY: build
build: bible copticsite marcion flashcards

.PHONY: privileged
privileged: drive

.PHONY: pollute
pollute: bible_epub img_resize

.PHONY: redundant
redundant: flashcards_crum_bohairic flashcards_crum flashcards_copticsite flashcards_bible

.PHONY: verify
verify: verify_identical_flashcards verify_identical_flashcards_crum_bohairic

.PHONY: try
try: try_flashcards try_flashcards_crum_bohairic

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

# FLASHCARD RULES
TIMESTAMP = 1716990272


flashcards: FORCE
	python flashcards/main.py \
		--timestamp "${TIMESTAMP}"

flashcards_crum_bohairic: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" \
		--output "flashcards/data/crum_bohairic.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_copticsite: FORCE
	python flashcards/main.py \
		--decks "copticsite.com" \
		--output "flashcards/data/copticsite.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_crum: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" "A Coptic Dictionary::Sahidic" "A Coptic Dictionary::Bohairic / Sahidic" "A Coptic Dictionary::All Dialects" \
		--output "flashcards/data/crum.apkg" \
		--timestamp "${TIMESTAMP}"

flashcards_bible: FORCE
	python flashcards/main.py \
		--decks "Bible::Bohairic" "Bible::Sahidic" "Bible::All Dialects" \
		--output "flashcards/data/bible.apkg" \
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

verify_identical_flashcards_crum_bohairic: try_flashcards_crum_bohairic
	bash utils/ziff.sh \
		"flashcards/data/crum_bohairic.apkg" \
		"$${TEST_DIR}/crum_bohairic.apkg"

try_flashcards: FORCE
	python flashcards/main.py \
		--output "$${TEST_DIR}/coptic.apkg" \
		--timestamp "${TIMESTAMP}"

try_flashcards_crum_bohairic: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" \
		--output "$${TEST_DIR}/crum_bohairic.apkg" \
		--timestamp "${TIMESTAMP}"

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

