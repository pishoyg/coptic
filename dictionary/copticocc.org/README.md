`dawoud-D100/` contains scans of Moawad Dawoud's dictionary. They are obtained
from the PDF using the following imagemagick command (The density used is 100,
hence the prefix `-D100`.):

```
convert -density 100 -colorspace sRGB dawoud.pdf %d.jpg
```

The original PDF was obtained [from the Coptic Treasures
website](https://coptic-treasures.com/book/coptic-dictionary-moawad-abd-al-nour/).

*TODO: Use the original PDF instead of a scanned version.*
