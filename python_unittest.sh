#!/bin/bash

python -m unittest discover \
	"flashcards"

python -m unittest discover \
	"bible/stshenouda.org/test/"

python -m unittest discover \
	"dictionary/copticsite.com/test/"

python -m unittest discover \
	"dictionary/kellia.uni-goettingen.de/test/"

python -m unittest discover \
	"dictionary/marcion.sourceforge.net/test/"
