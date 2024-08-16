#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

GOOGLE_TAG='
  <!-- Google tag (gtag.js) -->

  <script async src=
  "https://www.googletagmanager.com/gtag/js?id=G-VCVZFDFZR3"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "G-VCVZFDFZR3");
  </script>
'
ICON_TAG='  <link rel="icon" type="image/x-icon" href="/icon-circle.png">
'

AUTO=false
while [ $# -gt 0 ]; do
  case $1 in
  --auto)
    AUTO=true
    ;;
  *)
    echo "Unknown flag: ${1}"
    exit 1
    ;;
  esac
  shift
done

if [ -n "$(git -C "${SITE_DIR}" status --short)" ]; then
  echo -e "${PURPLE}${SITE_DIR}${RED} is dirty. This should be done in a standalone commit.${RESET}"
  exit 1
fi

find "${SITE_DIR}" -not -path "${SITE_DIR}/.git/*" -not -name ".git" -delete

CRUM_DIR="${SITE_DIR}/crum"
BIBLE_DIR="${SITE_DIR}/bible"

cp \
  "site/data/CNAME" \
  "site/data/icon-circle.png" \
  "${SITE_DIR}/"

mkdir "${CRUM_DIR}"
cp -r \
  flashcards/data/output/html/a_coptic_dictionary__all_dialects/* \
  "${CRUM_DIR}"

mkdir "${BIBLE_DIR}"
cp -r \
  bible/stshenouda.org/data/output/html/bohairic_english \
  bible/stshenouda.org/data/output/html/bohairic \
  bible/stshenouda.org/data/output/html/sahidic \
  "${BIBLE_DIR}"

# TODO: Speed up the pipeline a little bit by merging the copying and
# tag insertions steps. Write the files only once.
find "${SITE_DIR}" -type f -name "*.html" | while read -r FILE; do
  LINE_NUM="$(grep "^<head>$" "${FILE}" --line-number --max-count=1 | cut -f1 -d:)"
  if [ -z "${LINE_NUM}" ]; then
    echo -e "${PURPLE}Can't find <head> in ${RED}${FILE}"
    exit 1
  fi
  NEW="$(head -n "${LINE_NUM}" "${FILE}")${GOOGLE_TAG}${ICON_TAG}$(tail -n "+$((LINE_NUM + 1))" "${FILE}")"
  echo "${NEW}" > "${FILE}"
  tidy -indent -modify -quiet --tidy-mark no -wrap 80 "${FILE}"
done

git -C "${SITE_DIR}" add --all
git -C "${SITE_DIR}" commit --fixup HEAD

if ${AUTO}; then
  make site_push
else
  echo -e "${BLUE}Run ${GREEN}\`make site_push\`${BLUE}.${RESET}"
fi
