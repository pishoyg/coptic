#!/bin/bash

export SITE_DIR="docs/"

export DOMAIN="remnqymi.com"

export GITHUB="https://github.com/pishoyg/coptic"

# crum opens a Crum page on ⲣⲉⲙⲛ̀Ⲭⲏⲙⲓ.
crum () {
  for KEY in "${@}"; do
    open "https://${DOMAIN}/crum/${KEY}.html"
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
issues () {
  for ISSUE in "${@}"; do
    open "${GITHUB}/issues/${ISSUE}"
  done
}

# github opens the GitHub page for the project.
github () {
  open "${GITHUB}"
}

# commits opens the commits in GitHub.
commits () {
  for ISSUE in "${@}"; do
    open "${GITHUB}/commit/$(git rev-parse "${ISSUE}")"
  done
}
