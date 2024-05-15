# $1: Parent directory under /data/.
# $2: English book name.
# $3: Coptic book name.
# $4: Greek book name.
# $5: Number of chapters.

DATA_DIR="data"

set -o xtrace

python3 main.py \
  --books \
  "coptic_book:Bohairic:${3}:${DATA_DIR}/${1}/${2}/${2} (Bohairic).txt" \
  "greek_book:Greek:${4}:${DATA_DIR}/${1}/${2}/${2} (Greek).txt" \
  "english_book:English:${2}:${DATA_DIR}/${1}/${2}/${2} (English).txt" \
  --name="${2}" \
  --author="mmakar_book_json" \
  --num_chapter=${5}

set +o xtrace
