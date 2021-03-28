# $1: Parent directory under /data/.
# $2: Book name.
# $3: Number of chapters.

DATA_DIR="/Users/bishoyboshra/Desktop/GitHub/coptic/bible/data"

python3 main.py \
  --book_name="${2}" \
  --num_chapter=${3} \
  --coptic_book_path="${DATA_DIR}/${1}/${2}/${2} (Bohairic).txt" \
  --greek_book_path="${DATA_DIR}/${1}/${2}/${2} (Greek).txt" \
  --english_book_path="${DATA_DIR}/${1}/${2}/${2} (English).txt"
