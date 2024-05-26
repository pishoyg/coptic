# All tasks.
.PHONY: all
all: test bible copticsite marcion readme flashcards

# Redundant flashcard decks.
.PHONY: flashcards_redundant
flashcards_redundant: flashcards_crum_bohairic flashcards_crum_sahidic flashcards_crum_all flashcards_bible_bohairic flashcards_bible_sahidic flashcards_bible_all flashcards_copticsite flashcards_crum flashcards_bible

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
.PHONY: privileged
privileged: drive

# Polluting tasks.
.PHONY: pollute
pollute: bible_epub img_resize

.PHONY: allall
allall: all flashcards_redundant privileged

.PHONY: allallall
allallall: all flashcards_redundant privileged pollute

.PHONY: test
test: FORCE
	python -m unittest discover \
		"flashcards"

bible: FORCE
	python bible/stshenouda.org/main.py \
		--no_epub "true"

bible_epub: FORCE
	# N.B. This is not included in `all`. It unnecessarily pollutes the repo
	# directory.
	python bible/stshenouda.org/main.py

copticsite: FORCE
	python dictionary/copticsite.com/main.py

marcion: FORCE
	python dictionary/marcion.sourceforge.net/main.py

img_resize: FORCE
	# N.B. This is not included in `all`. It unnecessarily pollutes the repo
	# directory.
	python dictionary/marcion.sourceforge.net/resize.sh

readme: FORCE
	doctoc \
		"README.md" \
		"bible/README.md" \
		"dictionary/README.md" \
		"flashcards/README.md" 

flashcards: FORCE
	python flashcards/main.py  # Default to generating all flashcards in one big package.


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
loc:
	find . -name "*.py" -o -name "*.java" -o -name "*.proto" -o -name "*.sh" -o -name "*.js" -o -name "*.vba" | xargs cat | wc -l


drive: FORCE
	cp \
		flashcards/data/*.apkg \
		"$${DEST}"

# Maintenance tasks.
.PHONY: clean
clean:

.PHONY: FORCE
FORCE:
