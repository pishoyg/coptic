#!/bin/bash

find "dictionary/marcion.sourceforge.net/data/img" -type f \
  | while read -r FILE; do

  SOURCE_FILE="${FILE%.*}.txt"
  SOURCE_FILE="${SOURCE_FILE/img/img-sources}"
  if [ ! -f "${SOURCE_FILE}" ]; then
    echo "manual" > "${SOURCE_FILE}"
  fi
done
