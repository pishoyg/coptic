#!/bin/bash

# shellcheck disable=SC2140

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

# We need to source `.env` because it contains some helpers that we use. Even if
# it has been sourced in the shell where this script is invoked, this exports
# the variables but not the functions.
source .env

# shellcheck disable=SC2016
readonly COMMIT_MESSAGE='[Stats] Run `make stats`.'

readonly KNOWN_EXTENSIONS="Makefile css env gitignore yamlfmt yamllint pylintrc checkmake json mjs js keylayout md plist py sh strings txt yaml toml ts html npmrc"
readonly KNOWN_EXTENSIONS_ARCHIVE="gitignore java js md proto py sh sql vba"
readonly KNOWN_ARCHIVE_SUBDIRS="bible dictionary ipa-transliteration unicode-converters"

COMMIT=false
while [ $# -gt 0 ]; do
  case $1 in
  --commit)
    COMMIT=true
    ;;
  --help)
    echo -e "${BLUE}Report project statistics.${RESET}"
    echo -e "${BLUE}Pass ${GREEN}--commit ${BLUE}to also save to the stats file and create a commit.${RESET}"
    exit
    ;;
  *)
    echo -e "${RED}Unknown flag: ${YELLOW}${1}${RED}.${RESET}"
    exit 1
    ;;
  esac
  shift
done

if ${COMMIT} && [ -n "$(git status --short)" ]; then
  echo -e "${RED}The repo is dirty. This should be done with a clean worktree.${RESET}"
  echo -e "${RED}Please stash your changes.${RESET}"
  echo -e "${RED}Ideally, you should also run it on a commit that has already been pushed to the origin.${RESET}"
  exit 1
fi

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
  findexx "${DIR}" -type f "${@:3}" -exec "${EXEC}" {} \;
}

loc () {
  # Lines of code
  foc "${1}" cat "${@:2}" | wc --lines
}

foc_count () {
  foc "${1}" echo "${@:2}" | wc --lines
}

loc_shared () {
  echo $(( $(loc . -depth 1) + $(loc test) + $(loc pre-commit) + $(loc .github) ))
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
    -not -path "./archive/com.xpproductions.copticLiterature/*" \
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

# NOTE: This function, for some reason, is unable to find the last (rightmost)
# in the sheet, so we added a dummy EMPTY column to make it work for the last
# column as well!
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

LOC_ARCHIVE=$(loc_archive)

LOC=$(( $(loc .) + LOC_ARCHIVE))

LOC_CRUM=$(loc "dictionary/marcion_sourceforge_net")
LOC_COPTICSITE=$(loc "dictionary/copticsite.com")
LOC_KELLIA=$(loc "dictionary/kellia_uni_goettingen_de")
LOC_DAWOUD="$(loc "dictionary/copticocc.org")"
LOC_BIBLE=$(loc "bible")
LOC_FLASHCARDS=$(loc "flashcards")
LOC_GRAMMAR=$(loc "grammar")
LOC_KEYBOARD=$(loc "keyboard")
LOC_MORPHOLOGY=$(loc "morphology")
LOC_SITE=$(( $(loc "web") + $(loc "docs") ))
LOC_SHARED=$(loc_shared)

readonly TOTAL="$((
  LOC_ARCHIVE
  + LOC_CRUM
  + LOC_COPTICSITE
  + LOC_KELLIA
  + LOC_DAWOUD
  + LOC_BIBLE
  + LOC_FLASHCARDS
  + LOC_GRAMMAR
  + LOC_KEYBOARD
  + LOC_MORPHOLOGY
  + LOC_SITE
  + LOC_SHARED))"

DELTA=$(( LOC - TOTAL ))
if [ "${DELTA}" != "0" ]; then
  echo -e "${PURPLE}The total doesn't equal the sum of the parts, delta is ${RED}${DELTA}${PURPLE}.${RESET}"
  exit 1
fi

echo -e "${BLUE}Number of lines of code (including archive): ${GREEN}${LOC}${BLUE}."\
"\n  ${BLUE}Crum: ${GREEN}${LOC_CRUM}"\
"\n  ${BLUE}copticsite: ${GREEN}${LOC_COPTICSITE}"\
"\n  ${BLUE}KELLIA: ${GREEN}${LOC_KELLIA}"\
"\n  ${BLUE}Dawoud: ${GREEN}${LOC_DAWOUD}"\
"\n  ${BLUE}Bible: ${GREEN}${LOC_BIBLE}"\
"\n  ${BLUE}Flashcards: ${GREEN}${LOC_FLASHCARDS}"\
"\n  ${BLUE}Grammar: ${GREEN}${LOC_GRAMMAR}"\
"\n  ${BLUE}Keyboard: ${GREEN}${LOC_KEYBOARD}"\
"\n  ${BLUE}Morphology: ${GREEN}${LOC_MORPHOLOGY}"\
"\n  ${BLUE}Site: ${GREEN}${LOC_SITE}"\
"\n  ${BLUE}Shared: ${GREEN}${LOC_SHARED}"\
"\n  ${BLUE}Archive: ${GREEN}${LOC_ARCHIVE}"\
"\n  ${BLUE}TOTAL: ${GREEN}${TOTAL}${RESET}"

LOC_PYTHON=$(loc . -name "*.py")
LOC_MAKE=$(loc . -name "Makefile")
LOC_CSS=$(loc . -name "*.css")
LOC_SH=$(loc . -a \( -name "*.sh" -o -name ".env" \))
LOC_JS=$(loc . -a \( -name "*.mjs" -o -name "*.js" \) )
LOC_MD=$(loc . -name "*.md")
LOC_YAML=$(loc . -a \( -name "*.yaml" -o -name ".yamlfmt" -o -name ".yamllint" \) )
LOC_TOML=$(loc . -name "*.toml")
LOC_DOT=$(loc . -a \( -name ".gitignore" -o -name ".npmrc" -o -name "pylintrc" -o -name ".checkmake" \)  )
LOC_KEYBOARD_LAYOUT=$(loc . -a \( -name "*.keylayout" -o -name "*.plist" -o -name "*.strings" \) )
LOC_TXT=$(loc . -name "*.txt")
LOC_TS=$(loc . -name "*.ts")
LOC_JSON=$(loc . -name "*.json" )
LOC_HTML=$(loc . -name "*.html")

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
  + LOC_JSON
  + LOC_HTML))"

DELTA=$(( LOC - TOTAL_BY_LANG - LOC_ARCHIVE ))
if [ "${DELTA}" != "0" ]; then
  echo -e "${PURPLE}The total doesn't equal the sum of the parts, delta is ${RED}${DELTA}${PURPLE}.${RESET}"
  exit 1
fi

echo -e "${BLUE}Live lines of code: ${GREEN}$((LOC - LOC_ARCHIVE))"\
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
"\n  ${BLUE}HTML: ${GREEN}${LOC_HTML}"\
"\n  ${BLUE}TOTAL: ${GREEN}${TOTAL_BY_LANG}${RESET}"

FOC=$(foc_count .)
FOC_PYTHON=$(foc_count . -name "*.py")
FOC_MAKE=$(foc_count . -name "Makefile")
FOC_CSS=$(foc_count . -name "*.css")
FOC_SH=$(foc_count . -a \( -name "*.sh" -o -name ".env" \))
FOC_JS=$(foc_count . -a \( -name "*.mjs" -o -name "*.js" \) )
FOC_MD=$(foc_count . -name "*.md")
FOC_YAML=$(foc_count . -a \( -name "*.yaml" -o -name ".yamlfmt" -o -name ".yamllint" \) )
FOC_TOML=$(foc_count . -name "*.toml")
FOC_DOT=$(foc_count . -a \( -name ".gitignore" -o -name ".npmrc" -o -name "pylintrc" -o -name ".checkmake" \) )
FOC_KEYBOARD_LAYOUT=$(foc_count . -a \( -name "*.keylayout" -o -name "*.plist" -o -name "*.strings" \) )
FOC_TXT=$(foc_count . -name "*.txt")
FOC_TS=$(foc_count . -name "*.ts")
FOC_JSON=$(foc_count . -name "*.json" )
FOC_HTML=$(foc_count . -name "*.html")

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
  + FOC_JSON
  + FOC_HTML))"

DELTA=$(( FOC - TOTAL_FOC ))
if [ "${DELTA}" != "0" ]; then
  echo -e "${PURPLE}The total doesn't equal the sum of the parts, delta is ${RED}${DELTA}${PURPLE}.${RESET}"
  exit 1
fi

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
"\n  ${BLUE}HTML: ${GREEN}${FOC_HTML}"\
"\n  ${BLUE}TOTAL: ${GREEN}${TOTAL_FOC}${RESET}"

DISK_USAGE="$(du --apparent-size --summarize . | cut --fields 1)"
DISK_USAGE_HUMAN="$(du --apparent-size --human-readable --summarize . | cut --fields 1)"
echo -e "${BLUE}Disk usage: \
${GREEN}${DISK_USAGE}${BLUE} (${GREEN}${DISK_USAGE_HUMAN}${BLUE})${RESET}"
((DISK_USAGE >= 6291456 && DISK_USAGE <= 88000000 )) || (echo -e "${PURPLE}${DISK_USAGE} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_IMG=$(find "dictionary/marcion_sourceforge_net/data/img/" -type f -exec basename {} \; \
  | grep -oE '^[0-9]+' \
  | sort \
  | uniq \
  | wc --lines)
echo -e "${BLUE}Number of words possessing at least one image: "\
"${GREEN}${CRUM_IMG}${BLUE}.${RESET}"
((CRUM_IMG >= 700 && CRUM_IMG <= 3357 )) || (echo -e "${PURPLE}${CRUM_IMG} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_IMG_SUM=$(find dictionary/marcion_sourceforge_net/data/img/ -type f \
  | wc --lines)
echo -e "${BLUE}Total number of images: "\
"${GREEN}${CRUM_IMG_SUM}${BLUE}.${RESET}"
((CRUM_IMG_SUM >= 1200 && CRUM_IMG_SUM <= 33570 )) || (echo -e "${PURPLE}${CRUM_IMG_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_DAWOUD=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "dawoud-pages" \
  | wc --lines)
echo -e "${BLUE}Number of words that have at least one page from Dawoud: "\
"${GREEN}${CRUM_DAWOUD}${BLUE}.${RESET}"
((CRUM_DAWOUD >= 2600 && CRUM_DAWOUD <= 3357 )) || (echo -e "${PURPLE}${CRUM_DAWOUD} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_DAWOUD_SUM=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "dawoud-pages" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)
echo -e "${BLUE}Number of Dawoud pages added: "\
"${GREEN}${CRUM_DAWOUD_SUM}${BLUE}.${RESET}"
((CRUM_DAWOUD_SUM >= 4300 && CRUM_DAWOUD_SUM <= 5000 )) || (echo -e "${PURPLE}${CRUM_DAWOUD_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_NOTES=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "notes" \
  | wc --lines)
echo -e "${BLUE}Number of editor's note added to Crum: "\
"${GREEN}${CRUM_NOTES}${BLUE}.${RESET}"
((CRUM_NOTES >= 4 && CRUM_NOTES <= 3357 )) || (echo -e "${PURPLE}${CRUM_NOTES} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_ROOT_SENSES=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "senses" \
  | wc --lines)
echo -e "${BLUE}Number of roots with at least one sense: "\
"${GREEN}${CRUM_ROOT_SENSES}${BLUE}.${RESET}"
((CRUM_ROOT_SENSES >= 70 && CRUM_ROOT_SENSES <= 3357 )) || (echo -e "${PURPLE}${CRUM_ROOT_SENSES} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_ROOT_SENSES_SUM=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "senses" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)
echo -e "${BLUE}Total number of root senses: "\
"${GREEN}${CRUM_ROOT_SENSES_SUM}${BLUE}.${RESET}"
((CRUM_ROOT_SENSES_SUM >= 160 && CRUM_ROOT_SENSES_SUM <= 33570 )) || (echo -e "${PURPLE}${CRUM_ROOT_SENSES_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_LAST_PAGES=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "crum-last-page" \
  | wc --lines)
echo -e "${BLUE}Number of Crum last pages overridden: "\
"${GREEN}${CRUM_LAST_PAGES}${BLUE}.${RESET}"
((CRUM_LAST_PAGES >= 4 && CRUM_LAST_PAGES <= 3357 )) || (echo -e "${PURPLE}${CRUM_LAST_PAGES} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_OVERRIDE_TYPES=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "override-type" \
  | wc --lines)
echo -e "${BLUE}Number of types overridden: "\
"${GREEN}${CRUM_OVERRIDE_TYPES}${BLUE}.${RESET}"
((CRUM_OVERRIDE_TYPES >= 0 && CRUM_OVERRIDE_TYPES <= 3357 )) || (echo -e "${PURPLE}${CRUM_OVERRIDE_TYPES} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_SISTERS=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "sisters" \
  | wc --lines)
echo -e "${BLUE}Number of words with sisters: "\
"${GREEN}${CRUM_SISTERS}${BLUE}.${RESET}"
((CRUM_SISTERS >= 37 && CRUM_SISTERS <= 3357 )) || (echo -e "${PURPLE}${CRUM_SISTERS} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_SISTERS_SUM=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "sisters" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)
echo -e "${BLUE}Total number of sisters: "\
"${GREEN}${CRUM_SISTERS_SUM}${BLUE}.${RESET}"
((CRUM_SISTERS_SUM >= 58 && CRUM_SISTERS_SUM <= 33570 )) || (echo -e "${PURPLE}${CRUM_SISTERS_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_ANTONYMS=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "antonyms" \
  | wc --lines)
echo -e "${BLUE}Number of words with antonyms: "\
"${GREEN}${CRUM_ANTONYMS}${BLUE}.${RESET}"
((CRUM_ANTONYMS >= 2 && CRUM_ANTONYMS <= 3357 )) || (echo -e "${PURPLE}${CRUM_ANTONYMS} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_ANTONYMS_SUM=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "antonyms" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)
echo -e "${BLUE}Total number of antonyms: "\
"${GREEN}${CRUM_ANTONYMS_SUM}${BLUE}.${RESET}"
((CRUM_ANTONYMS_SUM >= 2 && CRUM_ANTONYMS_SUM <= 33570 )) || (echo -e "${PURPLE}${CRUM_ANTONYMS_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_HOMONYMS=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "homonyms" \
  | wc --lines)
echo -e "${BLUE}Number of words with homonyms: "\
"${GREEN}${CRUM_HOMONYMS}${BLUE}.${RESET}"
((CRUM_HOMONYMS >= 7 && CRUM_HOMONYMS <= 3357 )) || (echo -e "${PURPLE}${CRUM_HOMONYMS} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_HOMONYMS_SUM=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "homonyms" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)
echo -e "${BLUE}Total number of homonyms: "\
"${GREEN}${CRUM_HOMONYMS_SUM}${BLUE}.${RESET}"
((CRUM_HOMONYMS_SUM >= 7 && CRUM_HOMONYMS_SUM <= 33570 )) || (echo -e "${PURPLE}${CRUM_HOMONYMS_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_GREEK_SISTERS=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "greek-sisters" \
  | wc --lines)
echo -e "${BLUE}Number of words with Greek sisters: "\
"${GREEN}${CRUM_GREEK_SISTERS}${BLUE}.${RESET}"
((CRUM_GREEK_SISTERS >= 1 && CRUM_GREEK_SISTERS <= 3357 )) || (echo -e "${PURPLE}${CRUM_GREEK_SISTERS} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_GREEK_SISTERS_SUM=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "greek-sisters" \
  | grep '[0-9]+' --only-matching --extended-regexp \
  | wc --lines)
echo -e "${BLUE}Total number of Greek sisters: "\
"${GREEN}${CRUM_GREEK_SISTERS_SUM}${BLUE}.${RESET}"
((CRUM_GREEK_SISTERS_SUM >= 1 && CRUM_GREEK_SISTERS_SUM <= 3357 )) || (echo -e "${PURPLE}${CRUM_GREEK_SISTERS_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_CATEGORIES=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "categories" \
  | wc --lines)
echo -e "${BLUE}Number of words with categories: "\
"${GREEN}${CRUM_CATEGORIES}${BLUE}.${RESET}"
((CRUM_CATEGORIES >= 30 && CRUM_CATEGORIES <= 3357 )) || (echo -e "${PURPLE}${CRUM_CATEGORIES} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_CATEGORIES_SUM=$(tsv_nonempty \
  "dictionary/marcion_sourceforge_net/data/input/coptwrd.tsv" \
  "categories" \
  | grep '[^,]+' --only-matching --extended-regexp \
  | wc --lines)
echo -e "${BLUE}Total number of categories: "\
"${GREEN}${CRUM_CATEGORIES_SUM}${BLUE}.${RESET}"
((CRUM_CATEGORIES_SUM >= 30 && CRUM_CATEGORIES_SUM <= 6714 )) || (echo -e "${PURPLE}${CRUM_CATEGORIES_SUM} ${RED}looks suspicious.${RESET}" && exit 1)

CRUM_WRD_TYPOS=0
echo -e "${YELLOW}Number of Crum WRD entries changed (broken): "\
  "${GREEN}${CRUM_WRD_TYPOS}${YELLOW}.${RESET}"

CRUM_DRV_TYPOS=0
echo -e "${YELLOW}Number of Crum DRV entries changed (broken): "\
  "${GREEN}${CRUM_DRV_TYPOS}${YELLOW}.${RESET}"

readonly CRUM_TYPOS=0
echo -e "${YELLOW}Total number of Crum lines changed (broken): "\
  "${GREEN}${CRUM_TYPOS}${YELLOW}.${RESET}"

CRUM_PAGES_CHANGED=0
echo -e "${YELLOW}Number of Crum pages changed (broken): "\
  "${GREEN}${CRUM_PAGES_CHANGED}${YELLOW}.${RESET}"

NUM_COMMITS="$(git rev-list --count --all)"
echo -e "${BLUE}Number of commits: "\
  "${GREEN}${NUM_COMMITS}${BLUE}.${RESET}"
((NUM_COMMITS >= 1300 && NUM_COMMITS <= 10000 )) || (echo -e "${PURPLE}${NUM_COMMITS} ${RED}looks suspicious.${RESET}" && exit 1)

NUM_CONTRIBUTORS="$(git shortlog --summary --group=author | wc --lines)"
echo -e "${BLUE}Number of contributors: "\
  "${GREEN}${NUM_CONTRIBUTORS}${BLUE}.${RESET}"
((NUM_CONTRIBUTORS >= 1 && NUM_CONTRIBUTORS <= 10 )) || (echo -e "${PURPLE}${NUM_CONTRIBUTORS} ${RED}looks suspicious.${RESET}" && exit 1)

NUM_OPEN_ISSUES=$(gh issue list --state open --json number --jq length --limit 10000)
echo -e "${BLUE}Number of open issues: "\
  "${GREEN}${NUM_OPEN_ISSUES}${BLUE}.${RESET}"
((NUM_OPEN_ISSUES >= 1 && NUM_OPEN_ISSUES <= 300 )) || (echo -e "${PURPLE}${NUM_OPEN_ISSUES} ${RED}looks suspicious.${RESET}" && exit 1)

NUM_CLOSED_ISSUES=$(gh issue list --state closed --json number --jq length --limit 10000)
echo -e "${BLUE}Number of closed issues: "\
  "${GREEN}${NUM_CLOSED_ISSUES}${BLUE}.${RESET}"
((NUM_CLOSED_ISSUES >= 1 && NUM_CLOSED_ISSUES <= 300 )) || (echo -e "${PURPLE}${NUM_CLOSED_ISSUES} ${RED}looks suspicious.${RESET}" && exit 1)

if ${COMMIT}; then
  # We separate the fields by spaces in the string below, then we replace those
  # spaces with tabs using `sed`.
  # We have to exclude the first field (`data`) from this though, because it
  # has spaces within it that would be unintentionally replaced with tabs if we
  # were to include it.
  echo "$(date)$(echo " $(date +%s) ${LOC} ${CRUM_IMG} ${CRUM_DAWOUD} ${LOC_CRUM} ${LOC_COPTICSITE} ${LOC_KELLIA} ${LOC_BIBLE} ${LOC_FLASHCARDS} ${LOC_GRAMMAR} ${LOC_KEYBOARD} ${LOC_MORPHOLOGY} ${LOC_SITE} ${LOC_SHARED} ${LOC_ARCHIVE} ${CRUM_TYPOS} ${CRUM_IMG_SUM} ${CRUM_DAWOUD_SUM} ${NUM_COMMITS} ${NUM_CONTRIBUTORS} ${CRUM_NOTES} ${LOC_PYTHON} ${LOC_MAKE} ${LOC_CSS} ${LOC_SH} ${LOC_JS} ${LOC_MD} ${LOC_YAML} ${LOC_DOT} ${LOC_KEYBOARD_LAYOUT} ${LOC_TXT} ${CRUM_WRD_TYPOS} ${CRUM_DRV_TYPOS} ${CRUM_PAGES_CHANGED} ${CRUM_ROOT_SENSES} ${CRUM_ROOT_SENSES_SUM} ${LOC_TS} ${LOC_JSON} ${DISK_USAGE} ${DISK_USAGE_HUMAN} ${LOC_TOML} ${FOC} ${FOC_PYTHON} ${FOC_MAKE} ${FOC_CSS} ${FOC_SH} ${FOC_JS} ${FOC_MD} ${FOC_YAML} ${FOC_TOML} ${FOC_DOT} ${FOC_KEYBOARD_LAYOUT} ${FOC_TXT} ${FOC_TS} ${FOC_JSON} ${LOC_HTML} ${FOC_HTML} ${CRUM_LAST_PAGES} ${CRUM_OVERRIDE_TYPES} ${CRUM_SISTERS} ${CRUM_SISTERS_SUM} ${CRUM_ANTONYMS} ${CRUM_ANTONYMS_SUM} ${CRUM_HOMONYMS} ${CRUM_HOMONYMS_SUM} ${CRUM_GREEK_SISTERS} ${CRUM_GREEK_SISTERS_SUM} ${NUM_OPEN_ISSUES} ${NUM_CLOSED_ISSUES} ${CRUM_CATEGORIES} ${CRUM_CATEGORIES_SUM} ${LOC_DAWOUD}" | sed 's/ /\t/g')" \
    >> "data/stats.tsv"
  git add "data/stats.tsv"
  git commit --message "${COMMIT_MESSAGE}"
fi
