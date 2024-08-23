The file ending in .html gives any known version or copyright information.


The file ending in _utf8.txt is the Bible file in UTF-8 encoding, with the following data format:
Book_Index
Chapter
Verse
SubVerse
Verse_Order_Index
Verse_Text


The file ending in _utf8_mapped_to_NRSVA.txt is the Bible file in UTF-8 encoding, where each verse in the Bible is mapped to the matching verse(s) in the English New Revised Standard Version (with Apocrypha).
This mapping may not be entirely accurate. At this point, it is a first attempt to map verse references of the two Bibles to each other.
The file's data format:
NRSVA_Book_Index
NRSVA_Chapter
NRSVA_Verse
Bible_Book_Index
Bible_Chapter
Bible_Verse
Bible_SubVerse
Bible_Verse_Order_Index
Bible_Verse_Text


The file ending in _mapping_to_NRSVA.txt is a list of the special mappings known to exist between the verse reference system in this Bible and the verse reference system in the NRSVA. The file's format:
NRSVA_Book_Index
NRSVA_Chapter
NRSVA_Verse
Bible_Book_Index
Bible_Chapter
Bible_Verse
Bible_SubVerse
Verse_Exists_In_NRSVA_But_Not_In_This_Bible_Version [Values are 0 or 1]


The book_names.txt file lists the Book_Index codes and the books of the Bible they represent.
