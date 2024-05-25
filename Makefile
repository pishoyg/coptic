# All tasks.
.PHONY: all
all: test bible copticsite marcion readme flashcards

all_all: all flashcards_redundant

all_all_all: all flashcards_redundant privileged

all_all_all_all: all flashcards_redundant privileged bible_epub

# Main tasks.
.PHONY: test
test: FORCE
	python -m unittest discover \
		"flashcards"

bible: FORCE
	python bible/stshenouda.org/main.py \
		--no_epub "true"

bible_epub: FORCE
	# N.B. This is not included in `all`.
	python bible/stshenouda.org/main.py

copticsite: FORCE
	python dictionary/copticsite.com/main.py

marcion: FORCE
	python dictionary/marcion.sourceforge.net/main.py

readme: FORCE
	doctoc \
		"README.md" \
		"bible/README.md" \
		"dictionary/README.md" \
		"flashcards/README.md" 

flashcards: FORCE
	python flashcards/main.py  # Default to generating all flashcards in one big package.

# Redundant flashcard decks.
# N.B. These are not included in `all`.
flashcards_redundant: flashcards_crum_bohairic flashcards_crum_sahidic flashcards_crum_all flashcards_bible_bohairic flashcards_bible_sahidic flashcards_bible_all flashcards_copticsite flashcards_crum flashcards_bible

# Flashcards, one deck at a time.
flashcards_crum_bohairic: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" \
		--output "flashcards/data/crum_bohairic.apkg"

flashcards_crum_sahidic: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Sahidic" \
		--output "flashcards/data/crum_sahidic.apkg"

flashcards_crum_all: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::All Dialects" \
		--output "flashcards/data/crum_all.apkg"

flashcards_bible_bohairic: FORCE
	python flashcards/main.py \
		--decks "Bible::Bohairic" \
		--output "flashcards/data/bible_bohairic.apkg"

flashcards_bible_sahidic: FORCE
	python flashcards/main.py \
		--decks "Bible::Sahidic" \
		--output "flashcards/data/bible_sahidic.apkg"

flashcards_bible_all: FORCE
	python flashcards/main.py \
		--decks "Bible::All Dialects" \
		--output "flashcards/data/bible_all.apkg"

flashcards_copticsite: FORCE
	python flashcards/main.py \
		--decks "copticsite.com" \
		--output "flashcards/data/copticsite.apkg"

# Flashcards, a category at a time.
flashcards_crum: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::Bohairic" "A Coptic Dictionary::Sahidic" "A Coptic Dictionary::All Dialects" \
		--output "flashcards/data/crum.apkg"

flashcards_bible: FORCE
	python flashcards/main.py \
		--decks "Bible::Bohairic" "Bible::Sahidic" "Bible::All Dialects" \
		--output "flashcards/data/bible.apkg"

# Count the number of lines of code in the repo.
# Note: This isn't all.
pishoy:
	find . -name "*.py" -o -name "*.java" -o -name "*.proto" -o -name "*.sh" -o -name "*.js" -o -name "*.vba" | xargs cat | wc -l

# If you know the secrets, then you can run the privileged tasks. They require
# a set of variables to be exported, typically from a `secrets.sh` file that
# you source.
# ```
# source secrets.sh && make privileged
# ```
.PHONY: privileged
privileged: drive

drive: FORCE
	cp \
		flashcards/data/* \
		"$${DEST}"

# Maintenance tasks.
.PHONY: clean
clean:

.PHONY: FORCE
FORCE:
