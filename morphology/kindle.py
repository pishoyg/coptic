"""Generate a Kindle dictionary."""

# TODO: (#39) Learn more about the spell attribute and wildcard search.
# See ENTRY below.

import os
import pathlib
import shutil

from ebooklib import epub  # type: ignore[import-untyped]

from utils import file, log

CREATOR = "remnqymi@gmail.com"
# "cop" is not supported.
# See https://kdp.amazon.com/en_US/help/topic/G200673300.
# TODO: (#39) Choose a default obscure language. Otherwise, a reader who has
# another dictionary for "en-us" will keep switching between the two in order
# to translate.
IN_LANG = "en-us"
OUT_LANG = "en-us"
INDEX = "index"

TYPE_ENFORCED = True
STEP = 100

# pylint: disable=f-string-without-interpolation
# pylint: disable=line-too-long
OPF_FILENAME_FMT = f"{{identifier}}.opf"

OPF_MANIFEST_ITEM_FMT = f"""\
<item id="{{id}}"
      href="{{href}}"
      media-type="application/xhtml+xml" />\
"""

OPF_SPINE_ITEM_FMT = f"""\
<itemref idref="{{idref}}"/>\
"""

OPF_FMT = f"""\
<?xml version="1.0"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
    <metadata>
        <dc:title>{{title}}</dc:title>
        <dc:creator opf:role="aut">{CREATOR}</dc:creator>
        <dc:language>{IN_LANG}</dc:language>
        <meta name="cover" content="{{cover_id}}"/>
        <x-metadata>
          <DictionaryInLanguage>{IN_LANG}</DictionaryInLanguage>
          <DictionaryOutLanguage>{OUT_LANG}</DictionaryOutLanguage>
          <DefaultLookupIndex>{INDEX}</DefaultLookupIndex>
        </x-metadata>
    </metadata>
    <manifest>
        <item href="{{cover_basename}}" id="{{cover_id}}" media-type="image/{{cover_ext}}" />
        {{manifest}}
    </manifest>
    <spine>
        {{spine}}
    </spine>
</package>
"""

DICT_XHTML_FMT = f"""\
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
</html>\
"""

ENTRY_XHTML_FMT = f"""\
<idx:entry name="{INDEX}" scriptable="yes" spell="yes">
    <idx:short>
        <a id="{{id}}"></a>
        <idx:orth value="{{orth}}">
            <b>{{orth_display}}</b>
            <idx:infl>
                {{inflections}}
            </idx:infl>
        </idx:orth>
        {{definition}}
    </idx:short>
</idx:entry>\
"""

INFL_XHTML_FMT = f"""\
<idx:iform value="{{form}}"/>\
"""
# pylint: enable=line-too-long
# pylint: enable=f-string-without-interpolation


def _nothing_to_escape(text: str) -> bool:
    return all(x not in text for x in ["<", ">", "&"])


def _not_escaped(text: str) -> bool:
    return all(x not in text for x in ["&lt;", "&gt;", "&amp;"])


def _no_tags(text: str) -> bool:
    return all(x not in text for x in ["<", ">"])


def _escape_amp(text: str) -> str:
    """Produce valid HTML by escape special characters.

    Args:
        text: Plain text, potentially containing characters that should be
            escaped in an HTML.

    Returns:
        The string, with HTML special characters escaped.

    """
    assert _not_escaped(text)
    return text.replace("&", "&amp;")


class Entry:
    """Entry is an entry in the dictionary."""

    def __init__(
        self,
        entry_id: str,
        orth: str,
        orth_display: str,
        definition: str,
        inflections: list[str],
    ) -> None:
        assert _nothing_to_escape(entry_id)
        assert orth
        assert _no_tags(orth)
        orth = _escape_amp(orth)
        assert orth_display
        orth_display = _escape_amp(orth_display)
        assert definition
        definition = _escape_amp(definition)
        assert all(inflections)
        assert all(_nothing_to_escape(i) for i in inflections), inflections

        self._id: str = entry_id
        self._orth: str = orth
        self._orth_display: str = orth_display
        self._definition: str = definition
        self._inflections: list[str] = inflections

    def xhtml(self) -> str:
        inflections: str = "\n".join(
            [INFL_XHTML_FMT.format(form=i) for i in self._inflections],
        )
        xhtml = ENTRY_XHTML_FMT.format(
            id=self._id,
            orth=self._orth,
            orth_display=self._orth_display,
            definition=self._definition,
            inflections=inflections,
        )
        return xhtml


class Volume:
    def __init__(self, entries: list[Entry]) -> None:
        self._entries: list[Entry] = entries

    def xhtml(self) -> str:
        xhtml = "\n".join(e.xhtml() for e in self._entries)
        xhtml = DICT_XHTML_FMT.format(entries=xhtml)
        return xhtml


class Dictionary:
    """Dictionary represents a Kindle dictionary."""

    def __init__(
        self,
        title: str,
        author: str,
        identifier: str,
        cover_path: str,
        zfill: int = 0,
    ) -> None:
        """
        Args:
            title: Book title.
            author: Book author.
            identifier: A unique identifier for the ebook.
            cover_path: Path to the cover image.
            zfill: The zfill to use while assigning the output file names. If
                set to zero, defaults to `len(str(len(self._entries))) + 1`. The
                extra 1 is added to allow the dictionaries to grow. If a
                dictionary grows to a new order of magnitude, thus making the
                default go yet one character longer (unnecessarily), then it
                would be a good time to set this argument explicitly to the old
                value, thus retaining the same zfill.
        """
        self._title: str = title
        self._author: str = author
        self._identifier: str = identifier
        self._cover_path: str = cover_path
        self._cover_basename: str = os.path.basename(self._cover_path)
        self._entries: list[Entry] = []
        self._zfill = zfill

    def add_entry(self, e: Entry) -> None:
        self._entries.append(e)

    def xhtml(self) -> str:
        return Volume(self._entries).xhtml()

    def write_xhtml(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.xhtml())

    def xhtmls(self) -> list[tuple[str, str]]:
        self._zfill = self._zfill or len(str(len(self._entries))) + 1
        filenames_contents: list[tuple[str, str]] = []
        for i in range(0, len(self._entries), STEP):
            entries = self._entries[i : i + STEP]
            start = str(i + 1).zfill(self._zfill)
            end = str(i + len(entries)).zfill(self._zfill)
            file_name = f"{start}_{end}.xhtml"
            content = Volume(entries).xhtml()
            filenames_contents.append((file_name, content))
        return filenames_contents

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

        cover = epub.EpubCover(file_name=self._cover_basename)
        with open(self._cover_path, "rb") as f:
            cover.content = f.read()
        kindle.add_item(cover)
        kindle.spine.append(cover)
        kindle.add_item(epub.EpubCoverHtml(image_name=self._cover_basename))

        return kindle

    def write_epub(self, path: str) -> None:
        epub.write_epub(path, self.epub())

    def opf(self, content_filenames: list[str]) -> str:
        # The OPF doesn't get referenced in the OPF. Makes sense?
        # All the other files should be included.
        assert not any(name.endswith(".opf") for name in content_filenames)
        # Get the cover information.
        cover_id = self.basename_to_id(self._cover_basename)
        cover_ext = file.ext(self._cover_basename)
        assert cover_ext.startswith(".")
        cover_ext = cover_ext[1:]
        assert cover_ext
        # Build the manifest and the spine.
        manifest_parts = []
        spine_parts = []
        for name in content_filenames:
            file_id = self.basename_to_id(name)
            manifest_parts.append(
                OPF_MANIFEST_ITEM_FMT.format(id=file_id, href=name),
            )
            spine_parts.append(OPF_SPINE_ITEM_FMT.format(idref=file_id))

        manifest = "\n".join(manifest_parts)
        spine = "\n".join(spine_parts)
        return OPF_FMT.format(
            title=self._title,
            manifest=manifest,
            spine=spine,
            cover_basename=self._cover_basename,
            cover_id=cover_id,
            cover_ext=cover_ext,
        )

    def basename_to_id(self, filename: str) -> str:
        head, tail = os.path.split(filename)
        assert not head
        assert tail == filename
        stem, ext = os.path.splitext(filename)
        assert ext
        return stem

    def write_pre_mobi(self, directory: str) -> None:
        """Write a pre-mobi format dictionary to the given directory.

        Args:
            directory: Output directory.

        """
        pathlib.Path(directory).mkdir(exist_ok=True)

        # Copy the cover image.
        _ = shutil.copyfile(
            self._cover_path,
            os.path.join(directory, self._cover_basename),
        )

        # Add the dictionary files.
        filename_to_content: dict[str, str] = dict(self.xhtmls())

        # Add OPF to the list of files to be written.
        opf_filename = OPF_FILENAME_FMT.format(identifier=self._identifier)
        opf_content = self.opf(sorted(list(filename_to_content.keys())))
        filename_to_content[opf_filename] = opf_content

        # Write the files.
        for filename, content in filename_to_content.items():
            with open(
                os.path.join(directory, filename),
                "w",
                encoding="utf-8",
            ) as f:
                _ = f.write(content)
        log.wrote(directory)
