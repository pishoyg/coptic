#!/bin/bash

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

readonly DOMAIN="metremnqymi.com"

readonly GOOGLE_TAG='
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
BUILD=false
OBF=false
TIDY=false
COMMIT=false
PUSH=false
while [ $# -gt 0 ]; do
  case $1 in
  --clean)
    CLEAN=true
    ;;
  --build)
    BUILD=true
    ;;
  --obf)
    OBF=true
    ;;
  --tidy)
    TIDY=true
    ;;
  --commit)
    COMMIT=true
    ;;
  --push)
    PUSH=true
    ;;
  --help)
    echo -e "${GREEN}--clean ${BLUE}CLEANES uncommitted changes from the site repo.${RESET}"
    echo -e "${GREEN}--build ${BLUE}regenerates the site in the site repo.${RESET}"
    echo -e "${GREEN}--obf ${BLUE}obfuscates the files.${RESET}"
    echo -e "${GREEN}--tidy ${BLUE}tidies the HTML files.${RESET}"
    echo -e "${GREEN}--commit ${BLUE}creates a FIXUP commit, and rebases it.${RESET}"
    echo -e "${GREEN}--push ${BLUE}FORCE-pushes the commit to the repo.${RESET}"
    echo -e "${BLUE}You can use any combination of flags that you want.${RESET}"
    exit
    ;;
  *)
    echo "Unknown flag: ${1}"
    exit 1
    ;;
  esac
  shift
done

clean() {
  echo -e "${GREEN}Cleaning.${RESET}"
  git -C "${SITE_DIR}" clean -d --force && git -C "${SITE_DIR}" reset --hard
}

build() {
  echo -e "${GREEN}Building.${RESET}"
  if [ -n "$(git -C "${SITE_DIR}" status --short)" ]; then
    echo -e "${RED}The site repo is dirty. This should be done in a standalone commit.${RESET}"
    echo -e "${RED}You can (irreversibly) clean it by running the following:${RESET}"
    echo -e "${PURPLE}git -C '${SITE_DIR}' clean -d --force${RESET}"
    echo -e "${PURPLE}git -C '${SITE_DIR}' reset --hard${RESET}"
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

  mkdir "${IMG_DIR}"
  cp -r \
    site/data/img/* \
    "${IMG_DIR}/"

  mkdir "${CRUM_DIR}"
  cp -r \
    flashcards/data/output/web/a_coptic_dictionary__all_dialects/* \
    "${CRUM_DIR}"

  mkdir "${BIBLE_DIR}"
  cp -r \
    bible/stshenouda.org/data/output/html/bohairic_english \
    bible/stshenouda.org/data/output/html/bohairic \
    bible/stshenouda.org/data/output/html/sahidic \
    "${BIBLE_DIR}"

  _html() {
    FILE="${1}"
    LINE_NUM="$(grep "^<head>$" "${FILE}" --line-number --max-count=1 | cut -f1 -d:)"
    if [ -z "${LINE_NUM}" ]; then
      echo -e "${PURPLE}Can't find <head> in ${RED}${FILE}"
      exit 1
    fi
    NEW="$(head -n "${LINE_NUM}" "${FILE}")${GOOGLE_TAG}${ICON_TAG}$(tail -n "+$((LINE_NUM + 1))" "${FILE}")"
    echo "${NEW}" > "${FILE}"
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

obf() {
  echo -e "${GREEN}Obfuscating.${RESET}"
  python site/obfuscate_paths.py \
    --dir="${CRUM_DIR}"

  python site/obfuscate_classes.py \
    --dir="${CRUM_DIR}"

  find "${SITE_DIR}" -type f -name "*.js" | while read -r FILE; do
    # NOTE: Some of the flags below have strong warnings regarding their
    # possibility to break your code. Check the docs if something doesn't work.
    npx javascript-obfuscator "${FILE}" \
      --output "${FILE}" \
      --options-preset "high-obfuscation" \
      --domain-lock "${DOMAIN}" \
      --rename-globals "true" \
      --rename-properties "true" \
      --rename-properties-mode "unsafe" \
      --unicode-escape-sequence "true"
  done
}

tidy() {
  echo -e "${GREEN}Tidying.${RESET}"
  find "${SITE_DIR}" -type f -name "*.html" | while read -r FILE; do
    command tidy -config "tidy_config.txt" "${FILE}"
  done
}

commit() {
  echo -e "${GREEN}Committing.${RESET}"
  git -C "${SITE_DIR}" add --all
  git -C "${SITE_DIR}" commit --fixup HEAD
}

push() {
  echo -e "${GREEN}Pushing.${RESET}"
  git -C "${SITE_DIR}" rebase --root --autosquash
  git -C "${SITE_DIR}" push --force
}

if ${CLEAN}; then
  clean
fi

if ${BUILD}; then
  build
fi

if ${OBF}; then
  obf
fi

if ${TIDY}; then
  tidy
fi

if ${COMMIT}; then
  commit
fi

if ${PUSH}; then
  push
fi
