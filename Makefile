all: test bible_stshenouda dictionary_copticsite dictionary_crum readme flashcards

test: FORCE
	python -m unittest discover flashcards

bible_stshenouda: FORCE
	python bible/stshenouda.org/main.py --no_epub=true

# N.B. This doesn't run by default.
bible_stshenouda_epub: FORCE
	python bible/stshenouda.org/main.py

dictionary_copticsite: FORCE
	python dictionary/copticsite.com/main.py

dictionary_crum: FORCE
	python dictionary/marcion.sourceforge.net/main.py

readme: FORCE
	doctoc README.md bible/README.md dictionary/README.md flashcards/README.md 

flashcards: FORCE
	# This defaults to generating all flashcards.
	python flashcards/main.py

flashcards_crum_bohairic: FORCE
	python flashcards/main.py --decks="A Coptic Dictionary::Bohairic" --output="flashcards/data/crum_bohairic.apkg"

flashcards_crum_sahidic: FORCE
	python flashcards/main.py --decks="A Coptic Dictionary::Sahidic" --output="flashcards/data/crum_sahidic.apkg"

flashcards_crum_all: FORCE
	python flashcards/main.py --decks="A Coptic Dictionary::All Dialects" --output="flashcards/data/crum_all.apkg"

flashcards_bible_bohairic: FORCE
	python flashcards/main.py --decks="Bible::Bohairic" --output="flashcards/data/bible_bohairic.apkg"

flashcards_bible_sahidic: FORCE
	python flashcards/main.py --decks="Bible::Sahidic" --output="flashcards/data/bible_sahidic.apkg"

flashcards_bible_all: FORCE
	python flashcards/main.py --decks="Bible::All Dialects" --output="flashcards/data/bible_all.apkg"

flashcards_copticsite: FORCE
	python flashcards/main.py --decks="copticsite.com" --output="flashcards/data/copticsite.apkg"


FORCE:
