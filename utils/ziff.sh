#!/bin/bash

# Diff the contents of two zip files.
# Use as bash ziff.sh "${FIRST_FILE}" "${SECOND_FILE}"
#
DIFF=$(diff \
  <(unzip -vqq "${1}" | awk '{$2=""; $3=""; $4=""; $5=""; $6=""; print}' | sort -k3) \
  <(unzip -vqq "${2}" | awk '{$2=""; $3=""; $4=""; $5=""; $6=""; print}' | sort -k3))

echo "${DIFF}"
test -z "${DIFF}"
