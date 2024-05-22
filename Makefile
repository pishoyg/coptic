flashcards: test bible_stshenouda dictionary_copticsite dictionary_crum readme
	python flashcards/main.py

test: FORCE
	python -m unittest discover flashcards

bible_stshenouda: FORCE
	python bible/stshenouda.org/main.py --no_epub=true

dictionary_copticsite: FORCE
	python dictionary/copticsite.com/main.py

dictionary_crum: FORCE
	python dictionary/marcion.sourceforge.net/main.py

readme: FORCE
	doctoc README.md bible/README.md dictionary/README.md flashcards/README.md 

FORCE:
