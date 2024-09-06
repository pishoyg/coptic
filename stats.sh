#!/bin/bash

# shellcheck disable=SC2140

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

readonly KNOWN_EXTENSIONS="Makefile css csslintrc env_INFO helpers gitignore yamlfmt yamllint json mjs keylayout md plist py sh strings txt yaml toml ts"
readonly KNOWN_EXTENSIONS_ARCHIVE="gitignore java js md proto py sh sql vba"
readonly KNOWN_ARCHIVE_SUBDIRS="bible dictionary ipa-transliteration unicode-converters"

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
  local -r DIR="${1}"
  local -r EXEC="${2}"

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
    -not -path "./.ruff_cache/*" \
    -not -path "./node_modules/*" \
    -not -name ".env" \
    -not -name "package-lock.json" \
    -not -name "package.json" \
    -not -path "*/data/*" \
    -not -name "LICENSE" \
    -not -path "./archive/*" "${@:3}" -exec "${EXEC}" {} \;
}

loc () {
  # Lines of code
  foc "${1}" cat "${@:2}" | wc --lines
}

foc_count () {
  foc "${1}" echo "${@:2}" | wc --lines
}

loc_shared () {
  echo $(( $(loc . -depth 1) + $(loc test) + $(loc pre-commit) ))
}

extensions () {
  foc "${1}" basename | while read -r BASENAME; do
    echo "${BASENAME##*.}"
  done | sort | uniq
}

foc_archive() {
  local -r DIR="./archive"
  local -r EXEC="${1}"

  find "${DIR}" \
    -type f \
    -not -name "*.txt" \
    -not -name "*.DOC" \
    -not -name "*.docx" \
    -not -name "*.xml" \
    -not -name "*.html" \
    -not -name "*.TTF" \
    -not -name "*.doc" \
    -not -name "*.tsv" \
    -not -name "*.jar" \
    -not -name "*.db" \
    -not -name "*.csv" \
    -not -name "*.msql" \
    -not -name "*.pdf" \
    -not -name "*.tab" \
    -not -name "*.json" \
    -not -name ".DS_Store" \
    -not -path "./archive/copticbible.apk/*" \
    -not -path "./archive/moheb.de/*" \
    -not -path "./archive/copticagpeya.apk/*" \
    -not -path "./archive/kindlegen/*" \
    -not -path "./archive/marcion-1.8.3-src/*" \
    -not -path "./archive/fonts/*" \
    "${@:2}" -exec "${EXEC}" {} \;
}

loc_archive () {
  foc_archive cat | wc --lines
}

EXTENSIONS_ARCHIVE=$(foc_archive basename | while read -r BASENAME; do echo "${BASENAME##*.}"; done | sort | uniq)
DIFF=$(comm -23 <(echo "${EXTENSIONS_ARCHIVE}") <(echo "${KNOWN_EXTENSIONS_ARCHIVE}" | tr ' ' '\n') | tr '\n' ' ')
if [ -n "${DIFF}" ]; then
  echo -e "${PURPLE}Unknown extensions in the archive:"
  echo -e "${RED}  ${DIFF}"
  echo -e "${PURPLE}Lines of code statistics may become inaccurate. Add them to"
  echo -e "list of known archive extension if they represent code, otherwise"
  echo -e "exclude them from the stat.${RESET}"
  exit 1
fi

ARCHIVE_SUBDIRS=$(foc_archive echo | grep -oE '\./archive/[^/]+/' | sort | uniq | while read -r LINE; do basename "${LINE}"; done)
DIFF=$(comm -23 <(echo "${ARCHIVE_SUBDIRS}") <(echo "${KNOWN_ARCHIVE_SUBDIRS}" | tr ' ' '\n') | tr '\n' ' ')
if [ -n "${DIFF}" ]; then
  echo -e "${PURPLE}Unknown subdirectories in the archive:"
  echo -e "${RED}  ${DIFF}"
  echo -e "${PURPLE}Lines of code statistics may become inaccurate. Add them to"
  echo -e "list of known archive subdirectories if they represent code,"
  echo -e "otherwise exclude them from the stat.${RESET}"
  exit 1
fi

diff_lines() {
  diff --suppress-common-lines --speed-large-files --side-by-side "${1}" "${2}"
}

col_num() {
  local -r FILE="${1}"
  local -r TARGET="${2}"
  local COL=1
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
  local -r FILE="${1}"
  local -r FIELD="$(col_num "${FILE}" "${2}")"
  tail -n +2 \
    "${FILE}" \
    | cut --fields="${FIELD}" \
    | grep '^[[:space:]]*$' --invert --extended-regexp
}

crum_typos() {
  local -r PARENT="dictionary/marcion.sourceforge.net/data"
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

readonly TOTAL="$((
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
LOC_TOML=$(loc . -name "*.toml")
LOC_DOT=$(loc . -name ".gitignore" )
LOC_KEYBOARD_LAYOUT=$(loc . -a \( -name "*.keylayout" -o -name "*.plist" -o -name "*.strings" \) )
LOC_TXT=$(loc . -name "*.txt")
LOC_TS=$(loc . -name "*.ts")
LOC_JSON=$(loc . -a \( -name "*.json" -o -name ".csslintrc" \) )

readonly TOTAL_BY_LANG="$((
  LOC_PYTHON
  + LOC_MAKE
  + LOC_CSS
  + LOC_SH
  + LOC_JS
  + LOC_MD
  + LOC_YAML
  + LOC_TOML
  + LOC_DOT
  + LOC_KEYBOARD_LAYOUT
  + LOC_TXT
  + LOC_TS
  + LOC_JSON))"

FOC=$(foc_count .)
FOC_PYTHON=$(foc_count . -name "*.py")
FOC_MAKE=$(foc_count . -name "Makefile")
FOC_CSS=$(foc_count . -name "*.css")
FOC_SH=$(foc_count . -a \( -name "*.sh" -o -name ".env" -o -name ".env_INFO" -o -name ".helpers" \))
FOC_JS=$(foc_count . -name "*.mjs" )
FOC_MD=$(foc_count . -name "*.md")
FOC_YAML=$(foc_count . -a \( -name "*.yaml" -o -name ".yamlfmt" -o -name ".yamllint" \) )
FOC_TOML=$(foc_count . -name "*.toml")
FOC_DOT=$(foc_count . -name ".gitignore" )
FOC_KEYBOARD_LAYOUT=$(foc_count . -a \( -name "*.keylayout" -o -name "*.plist" -o -name "*.strings" \) )
FOC_TXT=$(foc_count . -name "*.txt")
FOC_TS=$(foc_count . -name "*.ts")
FOC_JSON=$(foc_count . -a \( -name "*.json" -o -name ".csslintrc" \) )

readonly TOTAL_FOC="$((
  FOC_PYTHON
  + FOC_MAKE
  + FOC_CSS
  + FOC_SH
  + FOC_JS
  + FOC_MD
  + FOC_YAML
  + FOC_TOML
  + FOC_DOT
  + FOC_KEYBOARD_LAYOUT
  + FOC_TXT
  + FOC_TS
  + FOC_JSON))"

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

CRUM_IMG=$(find "dictionary/marcion.sourceforge.net/data/img/" -type f -exec basename {} \; \
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
readonly CRUM_TYPOS=$(( CRUM_WRD_TYPOS + CRUM_DRV_TYPOS ))
crum_root_keys () {
  crum_typos "coptwrd.tsv" | cut -f1
  crum_typos "coptdrv.tsv" | cut -f2
}
CRUM_PAGES_CHANGED=$(crum_root_keys | sort | uniq | wc --lines)

# TODO: (#231) It's confusing to print the number of lines of code as two
# distinct values, one including the archive and one excluding it! Remove the
# archive from both. We're only interested in the live lines.
echo -e "${BLUE}Number of lines of code: ${GREEN}${LOC}${BLUE}."\
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

echo -e "${BLUE}Live lines of code: ${BLUE}$((LOC - LOC_ARCHIVE))"\
"\n  ${BLUE}Python: ${GREEN}${LOC_PYTHON}"\
"\n  ${BLUE}Make: ${GREEN}${LOC_MAKE}"\
"\n  ${BLUE}CSS: ${GREEN}${LOC_CSS}"\
"\n  ${BLUE}Shell: ${GREEN}${LOC_SH}"\
"\n  ${BLUE}JavaScript: ${GREEN}${LOC_JS}"\
"\n  ${BLUE}Markdown: ${GREEN}${LOC_MD}"\
"\n  ${BLUE}YAML: ${GREEN}${LOC_YAML}"\
"\n  ${BLUE}TOML: ${GREEN}${LOC_TOML}"\
"\n  ${BLUE}dot: ${GREEN}${LOC_DOT}"\
"\n  ${BLUE}keyboard: ${GREEN}${LOC_KEYBOARD_LAYOUT}"\
"\n  ${BLUE}txt: ${GREEN}${LOC_TXT}"\
"\n  ${BLUE}TypeScript: ${GREEN}${LOC_TS}"\
"\n  ${BLUE}JSON: ${GREEN}${LOC_JSON}"\
"\n  ${BLUE}TOTAL: ${GREEN}${TOTAL_BY_LANG}"

echo -e "${BLUE}Number of files of code: ${GREEN}${FOC}${BLUE}."\
"\n  ${BLUE}Python: ${GREEN}${FOC_PYTHON}"\
"\n  ${BLUE}Make: ${GREEN}${FOC_MAKE}"\
"\n  ${BLUE}CSS: ${GREEN}${FOC_CSS}"\
"\n  ${BLUE}Shell: ${GREEN}${FOC_SH}"\
"\n  ${BLUE}JavaScript: ${GREEN}${FOC_JS}"\
"\n  ${BLUE}Markdown: ${GREEN}${FOC_MD}"\
"\n  ${BLUE}YAML: ${GREEN}${FOC_YAML}"\
"\n  ${BLUE}TOML: ${GREEN}${FOC_TOML}"\
"\n  ${BLUE}dot: ${GREEN}${FOC_DOT}"\
"\n  ${BLUE}keyboard: ${GREEN}${FOC_KEYBOARD_LAYOUT}"\
"\n  ${BLUE}txt: ${GREEN}${FOC_TXT}"\
"\n  ${BLUE}TypeScript: ${GREEN}${FOC_TS}"\
"\n  ${BLUE}JSON: ${GREEN}${FOC_JSON}"\
"\n  ${BLUE}TOTAL: ${GREEN}${TOTAL_FOC}"

echo -e "${BLUE}Disk usage: \
${GREEN}${DISK_USAGE}${BLUE} (${GREEN}${DISK_USAGE_HUMAN}${BLUE})${RESET}"

((DISK_USAGE >= 8800000 && DISK_USAGE <= 88000000 )) || (echo -e "${PURPLE}${DISK_USAGE} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Number of words possessing at least one image: "\
"${GREEN}${CRUM_IMG}${BLUE}."

((CRUM_IMG >= 700 && CRUM_IMG <= 3357 )) || (echo -e "${PURPLE}${CRUM_IMG} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Total number of images: "\
"${GREEN}${CRUM_IMG_SUM}${BLUE}."

((CRUM_IMG_SUM >= 1200 && CRUM_IMG_SUM <= 33570 )) || (echo -e "${PURPLE}${CRUM_IMG_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Number of words that have at least one page from Dawoud: "\
"${GREEN}${CRUM_DAWOUD}${BLUE}."

((CRUM_DAWOUD >= 2600 && CRUM_DAWOUD <= 3357 )) || (echo -e "${PURPLE}${CRUM_DAWOUD} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Number of Dawoud pages added: "\
"${GREEN}${CRUM_DAWOUD_SUM}${BLUE}."

((CRUM_DAWOUD_SUM >= 4300 && CRUM_DAWOUD_SUM <= 5000 )) || (echo -e "${PURPLE}${CRUM_DAWOUD_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Number of roots with at least one sense: "\
"${GREEN}${CRUM_ROOT_SENSES}${BLUE}."

((CRUM_ROOT_SENSES >= 70 && CRUM_ROOT_SENSES <= 3357 )) || (echo -e "${PURPLE}${CRUM_ROOT_SENSES} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Total number of root senses: "\
"${GREEN}${CRUM_ROOT_SENSES_SUM}${BLUE}."

((CRUM_ROOT_SENSES_SUM >= 160 && CRUM_ROOT_SENSES_SUM <= 33570 )) || (echo -e "${PURPLE}${CRUM_ROOT_SENSES_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Number of editor's note added to Crum: "\
"${GREEN}${CRUM_NOTES}${BLUE}."

((CRUM_NOTES >= 4 && CRUM_NOTES <= 3357 )) || (echo -e "${PURPLE}${CRUM_NOTES} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Number of Crum WRD entries changed: "\
  "${GREEN}${CRUM_WRD_TYPOS}${BLUE}."

((CRUM_WRD_TYPOS >= 33 && CRUM_WRD_TYPOS <= 335 )) || (echo -e "${PURPLE}${CRUM_WRD_TYPOS} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Number of Crum DRV entries changed: "\
  "${GREEN}${CRUM_DRV_TYPOS}${BLUE}."

((CRUM_DRV_TYPOS >= 24 && CRUM_DRV_TYPOS <= 335 )) || (echo -e "${PURPLE}${CRUM_DRV_TYPOS} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Total number of Crum lins changed: "\
  "${GREEN}${CRUM_TYPOS}${BLUE}."

((CRUM_TYPOS >= 57 && CRUM_TYPOS <= 335 )) || (echo -e "${PURPLE}${CRUM_TYPOS} ${RED}looks suspicious.${RESET}" && exit 1)

echo -e "${BLUE}Number of Crum pages changed: "\
  "${GREEN}${CRUM_PAGES_CHANGED}${BLUE}."

((CRUM_PAGES_CHANGED >= 51 && CRUM_PAGES_CHANGED <= 335 )) || (echo -e "${PURPLE}${CRUM_PAGES_CHANGED} ${RED}looks suspicious.${RESET}" && exit 1)

NUM_COMMITS="$(git rev-list --count --all)"
echo -e "${BLUE}Number of commits: "\
  "${GREEN}${NUM_COMMITS}${BLUE}."

((NUM_COMMITS >= 1300 && NUM_COMMITS <= 10000 )) || (echo -e "${PURPLE}${NUM_COMMITS} ${RED}looks suspicious.${RESET}" && exit 1)

NUM_CONTRIBUTORS="$(git shortlog --summary --number --email | wc --lines)"
echo -e "${BLUE}Number of contributors: "\
  "${GREEN}${NUM_CONTRIBUTORS}${BLUE}."

((NUM_CONTRIBUTORS >= 1 && NUM_CONTRIBUTORS <= 10 )) || (echo -e "${PURPLE}${NUM_CONTRIBUTORS} ${RED}looks suspicious.${RESET}" && exit 1)

DELTA=$(( LOC - TOTAL ))
if [ "${DELTA}" != "0" ]; then
  echo -e "${PURPLE}The total doesn't equal the sum of the parts, delta is ${RED}${DELTA}${PURPLE}.${RESET}"
  exit 1
fi

DELTA=$(( FOC - TOTAL_FOC ))
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
  # We separate the fields by spaces in the string below, then we replace those
  # spaces with tabs using `sed`.
  # We have to exclude the first field (`data`) from this though, because it
  # has spaces within it that would be unintentionally replaced with tabs if we
  # were to include it.
  echo "$(date)$(echo " $(date +%s) ${LOC} ${CRUM_IMG} ${CRUM_DAWOUD} ${LOC_CRUM} ${LOC_COPTICSITE} ${LOC_KELLIA} ${LOC_BIBLE} ${LOC_FLASHCARDS} ${LOC_GRAMMAR} ${LOC_KEYBOARD} ${LOC_MORPHOLOGY} ${LOC_SITE} ${LOC_SHARED} ${LOC_ARCHIVE} ${CRUM_TYPOS} ${CRUM_IMG_SUM} ${CRUM_DAWOUD_SUM} ${NUM_COMMITS} ${NUM_CONTRIBUTORS} ${CRUM_NOTES} ${LOC_PYTHON} ${LOC_MAKE} ${LOC_CSS} ${LOC_SH} ${LOC_JS} ${LOC_MD} ${LOC_YAML} ${LOC_DOT} ${LOC_KEYBOARD_LAYOUT} ${LOC_TXT} ${CRUM_WRD_TYPOS} ${CRUM_DRV_TYPOS} ${CRUM_PAGES_CHANGED} ${CRUM_ROOT_SENSES} ${CRUM_ROOT_SENSES_SUM} ${LOC_TS} ${LOC_JSON} ${DISK_USAGE} ${DISK_USAGE_HUMAN} ${LOC_TOML} ${FOC} ${FOC_PYTHON} ${FOC_MAKE} ${FOC_CSS} ${FOC_SH} ${FOC_JS} ${FOC_MD} ${FOC_YAML} ${FOC_TOML} ${FOC_DOT} ${FOC_KEYBOARD_LAYOUT} ${FOC_TXT} ${FOC_TS} ${FOC_JSON}" | sed 's/ /\t/g')" \
    >> data/stats.tsv
fi
