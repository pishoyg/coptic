#!/bin/bash

# shellcheck disable=SC2140

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

tsv_nonempty() {
  FILE="${1}"
  FIELDS="${2}"
  tail -n +2 \
    "${FILE}" \
    | cut --fields="${FIELDS}" \
    | grep '^[[:space:]]*$' --invert --extended-regexp
}

crum_typos() {
  PARENT="dictionary/marcion.sourceforge.net/data"
  diff_lines "${PARENT}/input/${1}" "${PARENT}/raw/${1}"
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

LOC_PYTHON=$(loc . -name "*.py")
LOC_MAKE=$(loc . -name "Makefile")
LOC_CSS=$(loc . -name "*.css")
LOC_SH=$(loc . -a \( -name "*.sh" -o -name ".env" -o -name ".env_INFO" \))
LOC_JS=$(loc . -name "*.js")
LOC_MD=$(loc . -name "*.md")
LOC_YAML=$(loc . -name "*.yaml")
LOC_DOT=$(loc . -a \( -name ".csslintrc" -o -name ".gitignore" \) )
LOC_KEYBOARD_LAYOUT=$(loc . -a \( -name "*.keylayout" -o -name "*.plist" -o -name "*.strings" \) )

TOTAL_BY_LANG="$((
  LOC_PYTHON
  + LOC_MAKE
  + LOC_CSS
  + LOC_SH
  + LOC_JS
  + LOC_MD
  + LOC_YAML
  + LOC_DOT
  + LOC_KEYBOARD_LAYOUT))"

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

CRUM_IMG_SUM=$(find dictionary/marcion.sourceforge.net/data/img/ -type f \
  | wc --lines)

CRUM_DAWOUD=$(tsv_nonempty \
  "dictionary/marcion.sourceforge.net/data/input/appendices.tsv" \
  "3" \
  | wc --lines)

CRUM_DAWOUD_SUM=$(tsv_nonempty \
  "dictionary/marcion.sourceforge.net/data/input/appendices.tsv" \
  "3" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)

CRUM_NOTES=$(tsv_nonempty \
  "dictionary/marcion.sourceforge.net/data/input/appendices.tsv" \
  "4" \
  | wc --lines)

CRUM_TYPOS=$(( $(crum_typos "coptwrd.tsv") + $(crum_typos "coptdrv.tsv") ))

echo -e "${BLUE}Number of lines of code: "\
"${GREEN}${LOC}${BLUE}."\
"\n  ${BLUE}Crum: ${GREEN}${LOC_CRUM}"\
"\n  ${BLUE}copticsite: ${GREEN}${LOC_COPTICSITE}"\
"\n  ${BLUE}KELLIA: ${GREEN}${LOC_KELLIA}"\
"\n  ${BLUE}Bible: ${GREEN}${LOC_BIBLE}"\
"\n  ${BLUE}Flashcards: ${GREEN}${LOC_FLASHCARDS}"\
"\n  ${BLUE}Grammar: ${GREEN}${LOC_GRAMMAR}"\
"\n  ${BLUE}Keyboard: ${GREEN}${LOC_KEYBOARD}"\
"\n  ${BLUE}Morphology: ${GREEN}${LOC_MORPHOLOGY}"\
"\n  ${BLUE}Site: ${GREEN}${LOC_SITE}"\
"\n  ${BLUE}Shared: ${GREEN}${LOC_SHARED}"\
"\n  ${BLUE}Archive: ${GREEN}${LOC_ARCHIVE}"\
"\n  ${BLUE}TOTAL: ${GREEN}${TOTAL}"

echo -e "${BLUE}Number of live lines of code per language: "\
"\n  ${BLUE}Python: ${GREEN}${LOC_PYTHON}"\
"\n  ${BLUE}Make: ${GREEN}${LOC_MAKE}"\
"\n  ${BLUE}CSS: ${GREEN}${LOC_CSS}"\
"\n  ${BLUE}Shell: ${GREEN}${LOC_SH}"\
"\n  ${BLUE}JavaScript: ${GREEN}${LOC_JS}"\
"\n  ${BLUE}Markdown: ${GREEN}${LOC_MD}"\
"\n  ${BLUE}YAML: ${GREEN}${LOC_YAML}"\
"\n  ${BLUE}dot: ${GREEN}${LOC_DOT}"\
"\n  ${BLUE}keyboard: ${GREEN}${LOC_KEYBOARD_LAYOUT}"\
"\n  ${BLUE}TOTAL: ${GREEN}${TOTAL_BY_LANG}"

echo -e "${BLUE}Number of words possessing at least one image: "\
"${GREEN}${CRUM_IMG}${BLUE}."

echo -e "${BLUE}Total number of images: "\
"${GREEN}${CRUM_IMG_SUM}${BLUE}."

echo -e "${BLUE}Number of words that have at least one page from Dawoud: "\
"${GREEN}${CRUM_DAWOUD}${BLUE}."

echo -e "${BLUE}Number of Dawoud pages added: "\
"${GREEN}${CRUM_DAWOUD_SUM}${BLUE}."

echo -e "${BLUE}Number of editor's note added to Crum: "\
"${GREEN}${CRUM_NOTES}${BLUE}."

echo -e "${BLUE}Number of Crum entries changed: "\
  "${GREEN}${CRUM_TYPOS}${BLUE}."

NUM_COMMITS="$(git rev-list --count --all)"
echo -e "${BLUE}Number of commits: "\
  "${GREEN}${NUM_COMMITS}${BLUE}."

NUM_CONTRIBUTORS="$(git shortlog --summary --number --email | wc --lines)"
echo -e "${BLUE}Number of contributors: "\
  "${GREEN}${NUM_CONTRIBUTORS}${BLUE}."

DELTA=$(( LOC - TOTAL ))
if [ "${DELTA}" != "0" ]; then
  echo -e "${PURPLE}The total doesn't equal the sum of the parts, delta is ${RED}${DELTA}${PURPLE}.${RESET}"
  exit 1
fi

DELTA=$(( LOC - TOTAL_BY_LANG - LOC_ARCHIVE ))
if [ "${DELTA}" != "0" ]; then
  echo -e "${PURPLE}The total doesn't equal the sum of the parts, delta is ${RED}${DELTA}${PURPLE}.${RESET}"
  exit 1
fi

if ${SAVE}; then
  echo -e "$(date)\t$(date +%s)\t${LOC}\t${CRUM_IMG}\t${CRUM_DAWOUD}\t${LOC_CRUM}\t${LOC_COPTICSITE}\t${LOC_KELLIA}\t${LOC_BIBLE}\t${LOC_FLASHCARDS}\t${LOC_GRAMMAR}\t${LOC_KEYBOARD}\t${LOC_MORPHOLOGY}\t${LOC_SITE}\t${LOC_SHARED}\t${LOC_ARCHIVE}\t${CRUM_TYPOS}\t${CRUM_IMG_SUM}\t${CRUM_DAWOUD_SUM}\t${NUM_COMMITS}\t${NUM_CONTRIBUTORS}\t${CRUM_NOTES}\t${LOC_PYTHON}\t${LOC_MAKE}\t${LOC_CSS}\t${LOC_SH}\t${LOC_JS}\t${LOC_MD}\t${LOC_YAML}\t${LOC_DOT}\t${LOC_KEYBOARD_LAYOUT}" \
    >> data/stats.tsv
fi
