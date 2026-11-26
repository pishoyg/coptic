---
name: kasser-complements-scan-offset
description: docs/kasser/complements/N.png shows Compléments page N − 17; OCR with tesseract to find entries
metadata:
  type: reference
---

`docs/kasser/complements/N.png` shows Compléments page `N − 17`, both
columns: page 8 is `25.png`, page 13 is `30.png`. The roman front matter
comes first (`16.png` is page XVII).

To find an entry on a scan, OCR it with `tesseract <png> - -l eng tsv` and
search for its reference, e.g. `Ch.Ap.42` or `16,27`, then crop around the
word's box. The Coptic and the sub/superscripts OCR poorly, so read the marks
from the cropped image.

Related: [[kasser-oldstyle-line-numbers]]
