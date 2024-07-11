#!/bin/bash

python -m unittest discover \
	"flashcards"

python -m unittest discover \
	"bible/stshenouda.org"

python -m unittest discover \
	"dictionary/copticsite.com"

python -m unittest discover \
	"dictionary/kellia.uni-goettingen.de"

python -m unittest discover \
	"dictionary/marcion.sourceforge.net"

python -m unittest discover \
	"dictionary/inflect"
