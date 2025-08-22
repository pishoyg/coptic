#!/bin/bash

# _grep runs `grep` but changes the exit code 1 to 0.
# `grep` returns an exit code of 0 if matches are found, 1 if NO matches are
# found, or something else if it runs into an error.
# _grep is essentially a version of `grep` that considers the absence of a
# match to be a success.
_grep() {
  grep "${@}"
  RES=$?
  if [[ "${RES}" == "1" || "${RES}" == "0" ]]; then
    return 0
  fi
  return "${RES}"
}

# Find, excluding "garbage" files and directories.
findex () {
  find "${1}" \
    -not -path "./.git/*" \
    -not -path "./.git" \
    -not -name ".DS_Store" \
    -not -path "./venv/*" \
    -not -path "./venv" \
    -not -path "./.venv/*" \
    -not -path "./.venv" \
    -not -path "*/__pycache__/*" \
    -not -path "*/__pycache__" \
    -not -path "./coptic.egg-info/*" \
    -not -path "./coptic.egg-info" \
    -not -path "./node_modules/*" \
    -not -path "./node_modules" \
    -not -path "./test-results" \
    -not -path "./test-results/*" \
    -not -path "./playwright-report" \
    -not -path "./playwright-report/*" \
    -not -path "./.mypy_cache/*" \
    -not -path "./.mypy_cache" \
    -not -path "./.ruff_cache/*" \
    -not -path "./.ruff_cache" \
    -not -path "./docs/crum/anki/*" \
    -not -path "./docs/crum/anki/" \
    -not -path "./docs/bible/epub/*" \
    -not -path "./docs/bible/epub" \
    -not -name ".envrc" \
    -not -name "google_cloud_keyfile.json" \
    -not -path "./archive/*" \
    -not -path "./archive" \
    -not -name "package-lock.json" \
    -not -name "LICENSE" \
    "${@:2}"
}

# Find, excluding "garbage", and data!
# Code in our current repository setup is everything that is not:
# - Ignored by Git, or
# - is data, or
# - is archived.
# This calculation is possible because we maintain strict requirements about
# our repository structure, ensuring that all archived logic does live under
# `archive/`, and that all data lives under a `data/` directory.
#
# * findex already filters out ignored and archived items.
# * findexx also filters out data files.
#
# NOTE: It's important to notice that any additional arguments get appended to a
# long list of exclusion arguments below. Thus, be careful when you use an OR
# clause, as it could render some of the exclusion clauses idempotent. Most of
# the time, you will need to wrap your OR clauses inside parentheses.
findexx () {
  findex "${1}" \
    -not -name "requirements.txt" \
    -not -path "*/data/*" \
    -not \( -path "docs/*" -not -name "*.ts" -not -name "*.css" \( -path "docs/bible/index.html" -or -not -name "index.html" \) \) \
    -not \( -path "./docs/*" -not -name "*.ts" -not -name "*.css" \( -path "./docs/bible/index.html" -or -not -name "index.html" \) \) \
    "${@:2}"
}

# Find files, excluding "garbage".
ffindex () {
  findex "${1}" -type f "${@:2}"
}

# Find files, excluding "garbage", and data.
ffindexx () {
  findexx "${1}" -type f "${@:2}"
}

# Grep, excluding "garbage" and binary files.
grepex () {
  ffindex "${1}" -exec grep "${@:2}" --binary-files="without-match" --color=auto --with-filename --line-number {} \;
}

# Grep, excluding "garbage", binary files, and data.
grepexx () {
  ffindexx "${1}" -exec grep "${@:2}" --binary-files="without-match" --color=auto --with-filename --line-number {} \;
}
