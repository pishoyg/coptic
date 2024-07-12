# TODO: Learn more about the spell attribute and wildcard search. See ENTRY.
# TODO: Use inflection groups rather than a flat list. See ENTRY below.
# TODO: Add a check for valid XHTML.
import os

import type_enforced
from ebooklib import epub

TYPE_ENFORCED = True
STEP = 100
ZFILL = 4

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
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    </head>
    <body>
        <mbp:frameset>
            {ENTRIES}
        </mbp:frameset>
    </body>
</html>
"""

ENTRY = """
<idx:entry name="index" scriptable="yes" spell="yes">
    <idx:short>
        <a id="{ID}"></a>
        <idx:orth value="{ORTH}">
            <b>{ORTH_DISPLAY}</b>
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

INFLECTION = """<idx:iform value="{FORM}"></idx:iform>"""


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def _deindent(html: str) -> str:
    lines = html.split("\n")
    lines = [line.strip() for line in lines]
    return "\n".join(lines)


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def _nothing_to_escape(text: str) -> bool:
    return all(x not in text for x in ["<", ">", "&"])


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def _not_escaped(text: str) -> bool:
    return all(x not in text for x in ["&lt;", "&gt;", "&amp;"])


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def _no_tags(text: str) -> bool:
    return all(x not in text for x in ["<", ">"])


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def _escape_amp(text: str) -> str:
    """
    Escape the special characters inside this string.
    """
    assert _not_escaped(text)
    return text.replace("&", "&amp;")


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
class entry:
    def __init__(
        self,
        id: str,
        orth: str,
        orth_display: str,
        definition: str,
        inflections: list[str],
    ) -> None:
        assert _nothing_to_escape(id)
        assert _no_tags(orth)
        orth = _escape_amp(orth)
        orth_display = _escape_amp(orth_display)
        definition = _escape_amp(definition)
        assert all(_nothing_to_escape(i) for i in inflections)
        inflections = [INFLECTION.format(FORM=i) for i in inflections]
        html = ENTRY.format(
            ID=id,
            ORTH=orth,
            ORTH_DISPLAY=orth_display,
            DEFINITION=definition,
            INFLECTIONS="\n".join(inflections),
        )
        html = _deindent(html)
        self._html: str = html

    def html(self) -> str:
        return self._html


def html(entries: list[entry]) -> str:
    html = "\n".join(e.html() for e in entries)
    html = HTML.format(ENTRIES=html)
    html = _deindent(html)
    return html


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
class dictionary:
    def __init__(self, title: str, author: str) -> None:
        self._title: str = title
        self._author: str = author
        self._entries: list[entry] = []

    def xhtml(self, path: str) -> None:
        content = html(self._entries)
        with open(path, "w") as f:
            f.write(content)

    def epub(self, identifier: str, cover_path: str, path: str) -> None:
        kindle = epub.EpubBook()
        kindle.set_identifier(identifier)
        kindle.set_language("cop")
        kindle.set_title(self._title)
        kindle.add_author(self._author)

        kindle.add_metadata(
            None,
            "meta",
            "",
            epub.OrderedDict([("name", "cover"), ("content", "cover-img")]),
        )
        kindle.add_metadata("x-metadata", "DictionaryInLanguage", "cop")
        kindle.add_metadata("x-metadata", "DictionaryOutLanguage", "en")
        kindle.add_metadata("x-metadata", "DefaultLookupIndex", "index")

        kindle.spine = []

        cover_basename = os.path.basename(cover_path)
        cover = epub.EpubCover(file_name=cover_basename)
        with open(cover_path, "rb") as f:
            cover.content = f.read()
        kindle.add_item(cover)
        kindle.spine.append(cover)
        kindle.add_item(epub.EpubCoverHtml(image_name=cover_basename))

        for i in range(0, len(self._entries), STEP):
            entries = self._entries[i : i + STEP]
            start = str(i + 1).zfill(ZFILL)
            end = str(i + len(entries)).zfill(ZFILL)
            file_name = f"{start}_{end}.xhtml"
            chapter = epub.EpubHtml(
                title=file_name, file_name=file_name, content=html(entries)
            )
            kindle.add_item(chapter)
            kindle.spine.append(chapter)

        kindle.add_item(epub.EpubNcx())
        kindle.add_item(epub.EpubNav())

        epub.write_epub(path, kindle)

    def add_entry(self, e: entry) -> None:
        self._entries.append(e)
