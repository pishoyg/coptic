#!/bin/bash

(find bible dictionary flashcards utils -name '*.py' | xargs cat | grep -E '^(import |from .* import .*)' | grep -oE '^(import|from) [^ .]+' | awk '{print $2}' && cat requirements.txt) | sort --ignore-case | uniq
