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
	python flashcards/main.py

FORCE:
