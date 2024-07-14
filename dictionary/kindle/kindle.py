# TODO: Learn more about the spell attribute and wildcard search. See ENTRY.
# TODO: Use inflection groups rather than a flat list. See ENTRY below.
# TODO: Add a check for valid XHTML.
import os

import type_enforced
from ebooklib import epub

# "cop" is not supported.
# See https://kdp.amazon.com/en_US/help/topic/G200673300.
IN_LANG = "en-us"
OUT_LANG = "en-us"
INDEX = "index"

TYPE_ENFORCED = True
STEP = 100
ZFILL = 4

DICT_XHTML_FMT = f"""
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
            {{entries}}
        </mbp:frameset>
    </body>
</html>
"""

ENTRY_XHTML_FMT = f"""
<idx:entry name="{INDEX}" scriptable="yes" spell="yes">
    <idx:short>
        <a id="{{id}}"></a>
        <idx:orth value="{{orth}}">
            <b>{{orth_display}}</b>
            <idx:infl>
                {{inflections}}
            </idx:infl>
        </idx:orth>
        <p>
            {{definition}}
        </p>
    </idx:short>
</idx:entry>
"""

INFL_XHTML_FMT = f"""<idx:iform value="{{form}}"></idx:iform>"""


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

        self._id = id
        self._orth = orth
        self._orth_display = orth_display
        self._definition = definition
        self._inflections = inflections

    def xhtml(self) -> str:
        inflections = [INFL_XHTML_FMT.format(form=i) for i in self._inflections]
        inflections = "\n".join(inflections)
        xhtml = ENTRY_XHTML_FMT.format(
            id=self._id,
            orth=self._orth,
            orth_display=self._orth_display,
            definition=self._definition,
            inflections=inflections,
        )
        xhtml = _deindent(xhtml)
        return xhtml


class volume:
    def __init__(self, entries: list[entry]) -> None:
        self._entries = entries

    def xhtml(self) -> str:
        xhtml = "\n".join(e.xhtml() for e in self._entries)
        xhtml = DICT_XHTML_FMT.format(entries=xhtml)
        xhtml = _deindent(xhtml)
        return xhtml


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
class dictionary:
    def __init__(
        self, title: str, author: str, identifier: str, cover_path: str
    ) -> None:
        self._title: str = title
        self._author: str = author
        self._identifier: str = identifier
        self._cover_path: str = cover_path
        self._entries: list[entry] = []

    def add_entry(self, e: entry) -> None:
        self._entries.append(e)

    def xhtml(self) -> str:
        return volume(self._entries).xhtml()

    def write_xhtml(self, path: str) -> None:
        with open(path, "w") as f:
            f.write(self.xhtml())

    def epub(self) -> epub.EpubBook:
        kindle = epub.EpubBook()
        kindle.set_identifier(self._identifier)
        kindle.set_language(IN_LANG)
        kindle.set_title(self._title)
        kindle.add_author(self._author)

        kindle.add_metadata(
            None,
            "meta",
            "",
            epub.OrderedDict([("name", "cover"), ("content", "cover-img")]),
        )
        kindle.add_metadata("x-metadata", "DictionaryInLanguage", IN_LANG)
        kindle.add_metadata("x-metadata", "DictionaryOutLanguage", OUT_LANG)
        kindle.add_metadata("x-metadata", "DefaultLookupIndex", INDEX)

        kindle.spine = []

        cover_basename = os.path.basename(self._cover_path)
        cover = epub.EpubCover(file_name=cover_basename)
        with open(self._cover_path, "rb") as f:
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
                title=file_name, file_name=file_name, content=volume(entries).xhtml()
            )
            kindle.add_item(chapter)
            kindle.spine.append(chapter)

        kindle.add_item(epub.EpubNcx())
        kindle.add_item(epub.EpubNav())

        return kindle

    def write_epub(self, path: str) -> None:
        epub.write_epub(path, self.epub())
