#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

KNOWN_EXTENSIONS="Makefile css csslintrc env env_INFO gitignore js keylayout md plist py sh strings yaml"

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

foc () {
  # Files of code.
  DIR="${1}"
  EXEC="${2}"
  if [ -z "${EXEC}" ]; then
    EXEC="echo"
  fi

  find "${DIR}" \
    -type f \
    -not -name "*.tsv" \
    -not -name "*.html" \
    -not -name "*.xml" \
    -not -name "*.xsd" \
    -not -name "*.txt" \
    -not -name "*.json" \
    -not -name "*.pdf" \
    -not -name "*.tab" \
    -not -name "*.msql" \
    -not -name "*.avif" \
    -not -name "*.gif" \
    -not -name "*.jpeg" \
    -not -name "*.jpg" \
    -not -name "*.png" \
    -not -name "*.webp" \
    -not -name "*.svg" \
    -not -name "*.JPG" \
    -not -name "*.xlsx" \
    -not -name "*.csv" \
    -not -name "*.m4a" \
    -not -name "*.epub" \
    -not -name "Icon*" \
    -not -name "*.apkg" \
    -not -name "PKG-INFO" \
    -not -name ".DS_Store" \
    -not -path "./.git/*" \
    -not -path "*/__pycache__/*" \
    -not -path "./coptic.egg-info/*" \
    -not -path "./archive/*" "${@:3}" -exec "${EXEC}" {} \;
}

loc () {
  # Lines of code
  foc "${1}" cat "${@:2}" | wc --lines
}

loc_shared () {
  echo $(( $(loc . -depth 1) + $(loc test) ))
}

extensions () {
  foc "${1}" basename | while read -r FILE; do
    echo "${FILE##*.}"
  done | sort | uniq
}

loc_archive () {
  find archive \
    -type f \
    -a \( \
      -name "*.py" \
      -o -name "*.java" \
      -o -name "*.proto" \
      -o -name "*.sh" \
      -o -name "*.js" \
      -o -name "*.vba" \
      -o -name "Makefile" \
      -o -name "*.yaml" \
    \) \
    -a \( \
    \( -path "archive/*" -a -depth 1 \) \
      -o -path "archive/bible/*" \
      -o -path "archive/dictionary/*" \
      -o -path "archive/ipa-transliteration/*" \
      -o -path "archive/unicode-converters/*" \
    \) \
    | while read -r FILE; do cat "${FILE}"; done | wc --lines
}

diff_lines() {
  diff --suppress-common-lines --speed-large-files --side-by-side "${1}" "${2}" | wc --lines
}

crum_typos() {
  PARENT="dictionary/marcion.sourceforge.net/data"
  diff_lines "${PARENT}/marcion-input/${1}" "${PARENT}/marcion-raw/${1}"
}

LOC_ARCHIVE=$(loc_archive)

LOC=$(( $(loc .) + LOC_ARCHIVE))

LOC_CRUM=$(loc "dictionary/marcion.sourceforge.net")
LOC_COPTICSITE=$(loc "dictionary/copticsite.com")
LOC_KELLIA=$(loc "dictionary/kellia.uni-goettingen.de")
LOC_BIBLE=$(loc "bible")
LOC_FLASHCARDS=$(loc "flashcards")
LOC_GRAMMAR=$(loc "grammar")
LOC_KEYBOARD=$(loc "keyboard")
LOC_MORPHOLOGY=$(loc "morphology")
LOC_SITE=$(loc "site")
LOC_SHARED=$(loc_shared)

TOTAL="$((
  LOC_ARCHIVE
  + LOC_CRUM
  + LOC_COPTICSITE
  + LOC_KELLIA
  + LOC_BIBLE
  + LOC_FLASHCARDS
  + LOC_GRAMMAR
  + LOC_KEYBOARD
  + LOC_MORPHOLOGY
  + LOC_SITE
  + LOC_SHARED))"

# shellcheck disable=SC2140
EXTENSIONS="$(extensions .)"
DIFF=$(comm -23 <(echo "${EXTENSIONS}") <(echo "${KNOWN_EXTENSIONS}" | tr ' ' '\n' | sort) | tr '\n' ' ')
if [ -n "${DIFF}" ]; then
  echo -e "${PURPLE}Unknown extensions:"
  echo -e "${RED}  ${DIFF}"
  echo -e "${PURPLE}Lines of code statistics may become inaccurate. Add them to"
  echo -e "list of known extension if they represent code, otherwise exclude them"
  echo -e "from the stat.${RESET}"
  exit 1
fi

# shellcheck disable=SC2010  # Allow grep after ls.
CRUM_IMG=$(ls dictionary/marcion.sourceforge.net/data/img/ \
  | grep -oE '^[0-9]+' \
  | sort \
  | uniq \
  | wc --lines)

CRUM_DAWOUD=$(cut --fields=2,3 \
  < dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv \
  | grep --invert -E '^[[:space:]]*$' --count)

CRUM_TYPOS=$(( $(crum_typos "coptwrd.tsv") + $(crum_typos "coptdrv.tsv") ))

# shellcheck disable=SC2140
echo -e "${BLUE}Number of lines of code: "\
"${GREEN}${LOC}${BLUE}."\
"\n  ${BLUE}CRUM: ${GREEN}${LOC_CRUM}"\
"\n  ${BLUE}COPTICSITE: ${GREEN}${LOC_COPTICSITE}"\
"\n  ${BLUE}KELLIA: ${GREEN}${LOC_KELLIA}"\
"\n  ${BLUE}BIBLE: ${GREEN}${LOC_BIBLE}"\
"\n  ${BLUE}FLASHCARDS: ${GREEN}${LOC_FLASHCARDS}"\
"\n  ${BLUE}GRAMMAR: ${GREEN}${LOC_GRAMMAR}"\
"\n  ${BLUE}KEYBOARD: ${GREEN}${LOC_KEYBOARD}"\
"\n  ${BLUE}MORPHOLOGY: ${GREEN}${LOC_MORPHOLOGY}"\
"\n  ${BLUE}SITE: ${GREEN}${LOC_SITE}"\
"\n  ${BLUE}SHARED: ${GREEN}${LOC_SHARED}"\
"\n  ${BLUE}ARCHIVE: ${GREEN}${LOC_ARCHIVE}"\
"\n  ${BLUE}Total: ${GREEN}${TOTAL}"\
"\n  ${BLUE}Delta: ${GREEN}$(( LOC - TOTAL ))"

# shellcheck disable=SC2140
echo -e "${BLUE}Number of words possessing at least one image: "\
"${GREEN}${CRUM_IMG}${BLUE}."

# shellcheck disable=SC2140
echo -e "${BLUE}Number of words that have at least one page from Dawoud: "\
"${GREEN}${CRUM_DAWOUD}${BLUE}."

# shellcheck disable=SC2140
echo -e "${BLUE}Number of Crum typos fixed: "\
  "${GREEN}${CRUM_TYPOS}${BLUE}."

if ${SAVE}; then
  echo -e "$(date)\t$(date +%s)\t${LOC}\t${CRUM_IMG}\t${CRUM_DAWOUD}\t${LOC_CRUM}\t${LOC_COPTICSITE}\t${LOC_KELLIA}\t${LOC_BIBLE}\t${LOC_FLASHCARDS}\t${LOC_GRAMMAR}\t${LOC_KEYBOARD}\t${LOC_MORPHOLOGY}\t${LOC_SITE}\t${LOC_SHARED}\t${LOC_ARCHIVE}\t${CRUM_TYPOS}" \
    >> stats.tsv
fi
