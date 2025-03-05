#!/bin/bash
# Create a copy of the Lexicon page without `copticsite`, and without search
# engine indexing.

set -o errexit  # Exit upon encountering a failure.
set -o nounset  # Consider an undefined variable to be an error.

readonly LEXICON="docs/crum/index.html"
readonly BASHANDY="docs/crum/bashandy.html"

readonly HIDE_COPTICSITE='
  <style>
    #copticsite, #copticsite-title {
      display: none;
    }
  </style>
'

# See https://developers.google.com/search/docs/crawling-indexing/block-indexing.
readonly NO_INDEX='
<meta name="robots" content="noindex, nofollow" />
'

LINE_NUM="$(grep "^<head>$" "${LEXICON}" --line-number --max-count=1 \
  | cut -f1 -d:)"
if [ -z "${LINE_NUM}" ]; then
  echo -e "${PURPLE}Can't find <head> in ${RED}${LEXICON}"
  exit 1
fi

{
  head -n "${LINE_NUM}" "${LEXICON}"
  echo "${HIDE_COPTICSITE}"
  echo "${NO_INDEX}"
  tail -n "+$((LINE_NUM + 1))" "${LEXICON}"
} > "${BASHANDY}"
