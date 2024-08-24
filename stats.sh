#!/bin/bash

# shellcheck disable=SC2140

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

KNOWN_EXTENSIONS="Makefile css jshintrc csslintrc env_INFO helpers gitignore yamlfmt yamllint json mjs keylayout md plist py sh strings txt yaml ts"

SAVE=false
while [ $# -gt 0 ]; do
  case $1 in
  --save)
    SAVE=true
    ;;
  --help)
    echo -e "${BLUE}Report project statistics.${RESET}"
    echo -e "${BLUE}Pass ${GREEN}--save ${BLUE}to also save to the stats file.${RESET}"
    exit
    ;;
  *)
    echo -e "${RED}Unknown flag: ${YELLOW}${1}${RED}.${RESET}"
    exit 1
    ;;
  esac
  shift
done

# NOTE: It's important to notice that the arguments get appended to a long list
# of exclusion arguments below. Thus, be careful when you use an OR clause, as
# it could render some of the exclusion clauses idempotent. Most of the time,
# you will need to wrap your OR clauses inside parentheses, such that the
# exclusion clauses below still take effect. See examples throughout the file.
foc () {
  # Files of code.
  DIR="${1}"
  EXEC="${2}"
  if [ -z "${EXEC}" ]; then
    EXEC="echo"
  fi

  # Code in our current repository setup is everything that is not:
  # - Ignored by Git, or
  # - is data, or
  # - is archived.
  # This calculation is possible because we maintain strict requirements about
  # our repository structure, ensuring that all archived logic does live under
  # `archive/`, and that all data lives under a `data/` directory.
  find "${DIR}" \
    -type f \
    -not -path "./.git/*" \
    -not -name ".DS_Store" \
    -not -path "*/__pycache__/*" \
    -not -path "./coptic.egg-info/*" \
    -not -path "./.mypy_cache/*" \
    -not -path "./node_modules/*" \
    -not -name ".env" \
    -not -name "package-lock.json" \
    -not -name "package.json" \
    -not -path "*/data/*" \
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

# TODO: (#214) Calculate the archived lines of code more rigorously.
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
  diff --suppress-common-lines --speed-large-files --side-by-side "${1}" "${2}"
}

col_num() {
  FILE="${1}"
  TARGET="${2}"
  COL=1
  for NAME in $(head "${FILE}" -n 1); do
    if [ "${NAME}" == "${TARGET}" ]; then
      echo "${COL}"
      return
    else
      COL=$(( COL + 1 ))
    fi
  done
  echo -e "${RED}Unable to find column ${PURPLE}${TARGET} in ${PURPLE}${FILE}${RED}!${RESET}"
  exit 1
}

tsv_nonempty() {
  FILE="${1}"
  FIELD="$(col_num "${FILE}" "${2}")"
  tail -n +2 \
    "${FILE}" \
    | cut --fields="${FIELD}" \
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
LOC_SH=$(loc . -a \( -name "*.sh" -o -name ".env" -o -name ".env_INFO" -o -name ".helpers" \))
LOC_JS=$(loc . -name "*.mjs" )
LOC_MD=$(loc . -name "*.md")
LOC_YAML=$(loc . -a \( -name "*.yaml" -o -name ".yamlfmt" -o -name ".yamllint" \) )
LOC_DOT=$(loc . -name ".gitignore" )
LOC_KEYBOARD_LAYOUT=$(loc . -a \( -name "*.keylayout" -o -name "*.plist" -o -name "*.strings" \) )
LOC_TXT=$(loc . -name "*.txt")
LOC_TS=$(loc . -name "*.ts")
LOC_JSON=$(loc . -a \( -name "*.json" -o -name ".jshintrc" -o -name ".csslintrc" \) )

TOTAL_BY_LANG="$((
  LOC_PYTHON
  + LOC_MAKE
  + LOC_CSS
  + LOC_SH
  + LOC_JS
  + LOC_MD
  + LOC_YAML
  + LOC_DOT
  + LOC_KEYBOARD_LAYOUT
  + LOC_TXT
  + LOC_TS
  + LOC_JSON))"

DISK_USAGE="$(du --apparent-size --summarize . | cut --fields 1)"
DISK_USAGE_HUMAN="$(du --apparent-size --human-readable --summarize . | cut --fields 1)"

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
  "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv" \
  "dawoud-pages" \
  | wc --lines)

CRUM_DAWOUD_SUM=$(tsv_nonempty \
  "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv" \
  "dawoud-pages" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)

CRUM_NOTES=$(tsv_nonempty \
  "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv" \
  "notes" \
  | wc --lines)

CRUM_ROOT_SENSES=$(tsv_nonempty \
  "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv" \
  "senses" \
  | wc --lines)

CRUM_ROOT_SENSES_SUM=$(tsv_nonempty \
  "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv" \
  "senses" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)

CRUM_WRD_TYPOS=$(crum_typos "coptwrd.tsv" | wc --lines)
CRUM_DRV_TYPOS=$(crum_typos "coptdrv.tsv" | wc --lines)
CRUM_TYPOS=$(( CRUM_WRD_TYPOS + CRUM_DRV_TYPOS ))
crum_root_keys () {
  crum_typos "coptwrd.tsv" | cut -f1
  crum_typos "coptdrv.tsv" | cut -f2
}
CRUM_PAGES_CHANGED=$(crum_root_keys | sort | uniq | wc --lines)

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
"\n  ${BLUE}txt: ${GREEN}${LOC_TXT}"\
"\n  ${BLUE}TypeScript: ${GREEN}${LOC_TS}"\
"\n  ${BLUE}JSON: ${GREEN}${LOC_JSON}"\
"\n  ${BLUE}TOTAL: ${GREEN}${TOTAL_BY_LANG}"

echo -e "${BLUE}Disk usage: \
${GREEN}${DISK_USAGE}${BLUE} (${GREEN}${DISK_USAGE_HUMAN}${BLUE})${RESET}"

echo -e "${BLUE}Number of words possessing at least one image: "\
"${GREEN}${CRUM_IMG}${BLUE}."

echo -e "${BLUE}Total number of images: "\
"${GREEN}${CRUM_IMG_SUM}${BLUE}."

echo -e "${BLUE}Number of words that have at least one page from Dawoud: "\
"${GREEN}${CRUM_DAWOUD}${BLUE}."

echo -e "${BLUE}Number of Dawoud pages added: "\
"${GREEN}${CRUM_DAWOUD_SUM}${BLUE}."

echo -e "${BLUE}Number of roots with at least one sense: "\
"${GREEN}${CRUM_ROOT_SENSES}${BLUE}."

echo -e "${BLUE}Total number of root senses: "\
"${GREEN}${CRUM_ROOT_SENSES_SUM}${BLUE}."

echo -e "${BLUE}Number of editor's note added to Crum: "\
"${GREEN}${CRUM_NOTES}${BLUE}."

echo -e "${BLUE}Number of Crum WRD entries changed: "\
  "${GREEN}${CRUM_WRD_TYPOS}${BLUE}."

echo -e "${BLUE}Number of Crum DRV entries changed: "\
  "${GREEN}${CRUM_DRV_TYPOS}${BLUE}."

echo -e "${BLUE}Total number of Crum lins changed: "\
  "${GREEN}${CRUM_TYPOS}${BLUE}."

echo -e "${BLUE}Number of Crum pages changed: "\
  "${GREEN}${CRUM_PAGES_CHANGED}${BLUE}."

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
  # The first field (data) has 5 spaces within it, so we skip them in `sed`.
  # The rest doesn't have any spaces, so we can safely assume that any spaces
  # are ones that we inserted between the cells, and they should be converted
  # to tab characters.
  # We do this by first converting all spaces to tabs, then converting five
  # tabs to spaces.
  echo -e "$(date) $(date +%s) ${LOC} ${CRUM_IMG} ${CRUM_DAWOUD} ${LOC_CRUM} ${LOC_COPTICSITE} ${LOC_KELLIA} ${LOC_BIBLE} ${LOC_FLASHCARDS} ${LOC_GRAMMAR} ${LOC_KEYBOARD} ${LOC_MORPHOLOGY} ${LOC_SITE} ${LOC_SHARED} ${LOC_ARCHIVE} ${CRUM_TYPOS} ${CRUM_IMG_SUM} ${CRUM_DAWOUD_SUM} ${NUM_COMMITS} ${NUM_CONTRIBUTORS} ${CRUM_NOTES} ${LOC_PYTHON} ${LOC_MAKE} ${LOC_CSS} ${LOC_SH} ${LOC_JS} ${LOC_MD} ${LOC_YAML} ${LOC_DOT} ${LOC_KEYBOARD_LAYOUT} ${LOC_TXT} ${CRUM_WRD_TYPOS} ${CRUM_DRV_TYPOS} ${CRUM_PAGES_CHANGED} ${CRUM_ROOT_SENSES} ${CRUM_ROOT_SENSES_SUM} ${LOC_TS} ${LOC_JSON} ${DISK_USAGE} ${DISK_USAGE_HUMAN}" \
    | sed 's/ /\t/g' \
    | sed 's/\t/ /' \
    | sed 's/\t/ /' \
    | sed 's/\t/ /' \
    | sed 's/\t/ /' \
    | sed 's/\t/ /' \
    >> data/stats.tsv
fi
