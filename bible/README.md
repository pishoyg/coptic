Coptic NT was obtained from http://unbound.biola.edu/.

NKJV was obtained from https://github.com/jplehmann/textbites/blob/master/textbites/data/NKJV.bible.json.

# Changes to Coptic Bohairic NT
[10/25, 2:28 PM] Ⲡⲓϣⲱⲓ: There are two minor misalignments that I found in the data.
1. Acts 19:40-41 in NRSVA are merged into one verse (Acts 19:40) in Coptic. I have manually fixed this by splitting Acts 19:40 into two verses in the Coptic version. Alternatively, we can go for merging the two verses in NRSVA to one so it will match the Coptic version. I found this misalignment by searching for any mismatching entries between the (nrsva_chapter, nrsva_verse) columns and the (orig_chapter, orig_verse) columns in biola.edu's sheet.
2. In Acts 24, half of verse #6, all of #7, and half of #8 are missing from the Coptic version. I found that by looking for an empty verse in the sheet, and found that Acts 24:7 is empty.
Other than that, I have no idea if there are any other misalignments. Anyway, I think that this is a good start.
[10/25, 4:12 PM] Ⲡⲓϣⲱⲓ: 3rd alignment.
In the Coptic version, I had to split 2 Corinthians 13:13 into two verses (numbers #13 and #14), in order to match NKJV.
[10/25, 4:18 PM] Ⲡⲓϣⲱⲓ: 4th alignment.
I had to merge 3 John 14-15 in the Coptic version.
[10/25, 4:22 PM] Ⲡⲓϣⲱⲓ: 5th alignment.
Revelation 12:18 was empty in the Coptic version, and had no corresponding entry in NKJV, so I deleted it.

# Changes to NKJV
21 the signet rings and nose rings,(AW) 22 the fine robes and the capes and cloaks,(AX) the purses 23 and mirrors, and the linen garments(AY) and tiaras(AZ) and shawls

This was merged in Isaiah 3.
