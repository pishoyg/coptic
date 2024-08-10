#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

SAVE=false
while [ $# -gt 0 ]; do
  case $1 in
  --save)
    SAVE=true
    ;;
  --help)
    echo "Pass --save to also save to the stats file."
    exit
    ;;
  *)
    echo "Unknown flag: ${1}"
    exit 1
    ;;
  esac
  shift
done

LOC=$(find . \
  -name "*.py" -o -name "*.java" \
  -o -name "*.proto" -o -name "*.sh" \
  -o -name "*.js" -o -name "*.vba" \
  -o -name "Makefile" \
  -o -name "*.yaml" \
  | grep --invert "^./archive/copticbible.apk/" \
  | xargs cat | wc --lines)

# shellcheck disable=SC2010  # Allow grep after ls.
MARCION_IMG=$(ls dictionary/marcion.sourceforge.net/data/img/ \
  | grep -oE '^[0-9]+' \
  | sort \
  | uniq \
  | wc --lines)

MARCION_DAWOUD=$(cut --fields=2,3 \
  < dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv \
  | grep --invert -E '^[[:space:]]*$' --count)

echo "Number of lines of code:"
echo "${LOC}"
echo "Number of words possessing at least one image:"
echo "${MARCION_IMG}"
echo "Number of words that have at least one page from Dawoud:"
echo "${MARCION_DAWOUD}"

if ${SAVE}; then
  echo -e "$(date)\t$(date +%s)\t${LOC}\t${MARCION_IMG}\t${MARCION_DAWOUD}" \
    >> stats.tsv
fi
