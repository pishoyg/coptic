#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

readonly GOOGLE_TAG='
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

readonly ICON_TAG='  <link rel="icon" type="image/x-icon" href="/img/icon/icon-circle.png">
'

CLEAN=false
PRE=false
POST=false
while [ $# -gt 0 ]; do
  case $1 in
  --clean)
    CLEAN=true
    ;;
  --pre)
    PRE=true
    ;;
  --post)
    POST=true
    ;;
  --help)
    echo -e "${GREEN}--pre${BLUE} regenerates the site in the site directory.${RESET}"
    echo -e "${GREEN}--post${YELLOW} (1) ${BLUE}obfuscates the files, then ${YELLOW}(2) ${BLUE}creates, rebases, and force-pushes a fixup commit.${RESET}"
    exit
    ;;
  *)
    echo "Unknown flag: ${1}"
    exit 1
    ;;
  esac
  shift
done

# TODO: Run as `until tidy "${FILE}"; do : ; done` to force it.
# The current blocker is that the Home page has a blank `title` element.
tidy () {
  command tidy -indent -modify -quiet --tidy-mark no -wrap 80 "${1}"
}

clean () {
  git -C "${SITE_DIR}" clean -d --force && git -C "${SITE_DIR}" reset --hard
}

pre () {
  if [ -n "$(git -C "${SITE_DIR}" status --short)" ]; then
    echo -e "${PURPLE}${SITE_DIR}${RED} is dirty. This should be done in a standalone commit.${RESET}"
    exit 1
  fi

  find "${SITE_DIR}" -not -path "${SITE_DIR}/.git/*" -not -name ".git" -delete

  readonly CRUM_DIR="${SITE_DIR}/crum"
  readonly BIBLE_DIR="${SITE_DIR}/bible"
  readonly IMG_DIR="${SITE_DIR}/img"

  cp \
    "site/data/CNAME" \
    "${SITE_DIR}/"

  BODY="$(python -m markdown \
    "site/home.md" \
    --output_format="html")" envsubst < "site/data/home.html" > "${SITE_DIR}/index.html"
  tidy "${SITE_DIR}/index.html" ||  # Suppress the failure.

  mkdir "${IMG_DIR}"
  cp -r \
    site/data/img/* \
    "${IMG_DIR}/"

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

  _html () {
    FILE="${1}"
    LINE_NUM="$(grep "^<head>$" "${FILE}" --line-number --max-count=1 | cut -f1 -d:)"
    if [ -z "${LINE_NUM}" ]; then
      echo -e "${PURPLE}Can't find <head> in ${RED}${FILE}"
      exit 1
    fi
    NEW="$(head -n "${LINE_NUM}" "${FILE}")${GOOGLE_TAG}${ICON_TAG}$(tail -n "+$((LINE_NUM + 1))" "${FILE}")"
    echo "${NEW}" > "${FILE}"
    tidy "${FILE}"
  }

  COUNTER=0
  readonly PARALLEL=10
  find "${SITE_DIR}" -type f -name "*.html" | while read -r FILE; do
    _html "${FILE}" &
    if (( ++COUNTER % PARALLEL == 0 )); then
      wait
    fi
  done
  wait
}

post() {
  find "${SITE_DIR}" -type f -name "*.js" | while read -r FILE; do
    npx javascript-obfuscator "${FILE}" --output "${FILE}"
  done

  git -C "${SITE_DIR}" add --all
  git -C "${SITE_DIR}" commit --fixup HEAD

  git -C "${SITE_DIR}" rebase --root --autosquash
  git -C "${SITE_DIR}" push --force
}

if ${CLEAN}; then
  clean
fi
if ${PRE}; then
  pre
fi
if ${POST}; then
  post
fi
