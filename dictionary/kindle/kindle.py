import os

import type_enforced
from ebooklib import epub

HTML = """
<html
xmlns:math="http://exslt.org/math"
xmlns:svg="http://www.w3.org/2000/svg"
xmlns:tl="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
xmlns:saxon="http://saxon.sf.net/"
xmlns:xs="http://www.w3.org/2001/XMLSchema"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:cx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
xmlns:dc="http://purl.org/dc/elements/1.1/"
xmlns:mbp="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
xmlns:mmc="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
xmlns:idx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    </head>
    <body>
        <mbp:frameset>
            {ENTRIES}
        </mbp:frameset>
    </body>
</html>
"""

# TODO: Learn more about the spell attribute and wildcard search.
# TODO: Use inflection groups rather than a flat list.
ENTRY = """
<idx:entry name="index" scriptable="yes" spell="yes">
    <idx:short>
        <a id="{ID}"></a>
        <idx:orth value="{ORTH}">
            <b>{ORTH}</b>
            <idx:infl>
                {INFLECTIONS}
            </idx:infl>
        </idx:orth>
        <p>
            {DEFINITION}
        </p>
    </idx:short>
</idx:entry>
"""

INFLECTION = """
<idx:iform value="{FORM}"></idx:iform>
"""


@type_enforced.Enforcer(enabled=True)
def deindent(html: str) -> str:
    lines = html.split("\n")
    lines = [line.strip() for line in lines]
    return "\n".join(lines)


@type_enforced.Enforcer(enabled=True)
class entry:
    def __init__(
        self,
        id: str,
        orth: str,
        definition: str,
        inflections: list[str],
    ) -> None:
        self._id: str = id
        self._orth: str = orth
        self._definition: str = definition
        self._inflections: list[str] = inflections

    def html(self) -> str:
        html = HTML.format(
            ID=self._id,
            ORTH=self._orth,
            DEFINITION=self._definition,
            INFLECTIONS=self._inflections,
        )
        html = deindent(html)
        return html


@type_enforced.Enforcer(enabled=True)
class dictionary:
    def __init__(self, title: str, author: str) -> None:
        self._title: str = title
        self._author: str = author
        self._entries: list[entry] = []

    def epub(self, cover_path: str, path: str) -> None:
        kindle = epub.EpubBook()
        kindle.set_identifier(self._title)
        kindle.set_language("cop")
        kindle.set_title(self._title)
        kindle.add_author(self._author)
        cover_basename = os.path.basename(cover_path)
        cover = epub.EpubCover(file_name=cover_basename)
        with open(cover_path, "rb") as f:
            cover.content = f.read()
        kindle.add_item(cover)
        kindle.add_item(epub.EpubCoverHtml(image_name=cover_basename))
        kindle.add_metadata(
            None,
            "meta",
            "",
            epub.OrderedDict([("name", "cover"), ("content", "cover-img")]),
        )
        kindle.add_metadata("x-metadata", "DictionaryInLanguage", "cop")
        kindle.add_metadata("x-metadata", "DictionaryOutLanguage", "en")
        kindle.add_metadata("x-metadata", "DefaultLookupIndex", "index")

        # TODO: Is the `file_name` attribute needed for epub.EpubHtml()?
        html = HTML.format(ENTRIES="\n".join(e.html() for e in self._entries))
        html = deindent(html)
        content = epub.EpubHtml(title=self._title)
        content.set_content(html)
        kindle.spine = [cover, content]
        # TODO: Is any of the following needed?
        # kindle.add_item(epub.EpubNcx())
        # kindle.add_item(epub.EpubNav())

        epub.write_epub(path, kindle)

    def add_entry(self, e: entry) -> None:
        self._entries.append(e)
