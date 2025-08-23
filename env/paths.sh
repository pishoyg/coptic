#!/bin/bash

export SITE_DIR="docs"
export DOMAIN="remnqymi.com"
export GITHUB="https://github.com/pishoyg/coptic"

CRUM="https://${DOMAIN}/crum"

# PORT is used by the local server.
export PORT="8000"
LOC_CRUM="http://localhost:${PORT}/crum"

# crum opens a Crum page on ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ.
crum () {
  if [ $# -eq 0 ]; then
    open "${CRUM}"
  fi
  for KEY in "${@}"; do
    open "${CRUM}/${KEY}.html"
  done
}

# loc opens a Crum page on the local server.
loc () {
  if [ $# = 0 ]; then
    open "${LOC_CRUM}"
  fi
  for KEY in "${@}"; do
    open "${LOC_CRUM}/${KEY}.html"
  done
}

dawoud () {
  for KEY in "${@}"; do
    open "https://${DOMAIN}/dawoud/?page=$((KEY + 16))"
  done
}

# The GitHub helpers below work, but also consider using the `gh` CLI.
# See https://cli.github.com/.

# issues opens issue pages in GitHub.
issue () {
  for ISSUE in "${@}"; do
    open "${GITHUB}/issues/${ISSUE}"
  done
}

# github opens the GitHub page for the project.
github () {
  open "${GITHUB}"
}

# commits opens the commits in GitHub.
commit () {
  for COMMIT in "${@}"; do
    open "${GITHUB}/commit/$(git rev-parse "${COMMIT}")"
  done
}
