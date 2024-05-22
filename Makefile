flashcards: test dictionary_crum dictionary_copticsite bible_stshenouda readme
	python flashcards/main.py

test: FORCE
	python -m unittest discover flashcards

dictionary_crum: FORCE
	python dictionary/marcion.sourceforge.net/main.py

dictionary_copticsite: FORCE
	python dictionary/copticsite.com/main.py

bible_stshenouda: FORCE
	python bible/stshenouda.org/main.py --no_epub=true

readme: FORCE
	doctoc README.md

FORCE:
