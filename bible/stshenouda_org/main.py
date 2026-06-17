#!/usr/bin/env python3
"""Process the Bible data."""

# NOTE: As a general convention, methods ending with _aux return generators,
# rather than string literals.
import argparse
import functools
import html
import itertools
import json
import os
import pathlib
import re
import typing
import urllib.parse
from collections import abc

import regex
from ebooklib import epub  # type: ignore[import-untyped]

from bible.stshenouda_org import schema
from utils import concur, ensure, file, log, page, paths
from xooxle import xooxle

# Input parameters

_SCRIPT_DIR = pathlib.Path(__file__).parent
_JSON: pathlib.Path = _SCRIPT_DIR / "data/bible.json"
_INPUT_DIR: pathlib.Path = _SCRIPT_DIR / "data/input/"
_SOURCES_DIR: pathlib.Path = _INPUT_DIR / "Sources/"
_COVER: pathlib.Path = _SCRIPT_DIR / "data/img/stauros.jpeg"

Language: typing.TypeAlias = typing.Literal[
    "Bohairic",
    "Sahidic",
    "Fayyumic",
    "Akhmimic",
    "Lycopolitan",
    "Mesokemic",
    "DialectP",
    "OldBohairic",
    "English",
    "Greek",
]

_LANGUAGES: list[Language] = [
    "Bohairic",
    "Sahidic",
    "Fayyumic",
    "Akhmimic",
    "Lycopolitan",
    "Mesokemic",
    "DialectP",
    "OldBohairic",
    "English",
    "Greek",
]

_EMPTY_LANGUAGES: list[Language] = [
    "Lycopolitan",
    "Mesokemic",
    "DialectP",
    "OldBohairic",
]

_NONEMPTY_LANGUAGES: list[Language] = [
    lang for lang in _LANGUAGES if lang not in _EMPTY_LANGUAGES
]

_RESOURCES: list[schema.Source] = file.json_loads(
    paths.BIBLE_DIR / "bibliography.json",
    list[schema.Source],
)


# Verify that all URLs are fully qualified and well-formed. A non-absolute URL
# could be resolved as relative rather than absolute!
# TODO: (#0) Find a better solution. Should the TypeScript be smart enough to
# add the protocol?
# Also, this forces us to use a fully qualified URL, even for resources hosted
# on our servers, which is inconvenient.
def _verify_url(url: str) -> None:
    parsed: urllib.parse.ParseResult = urllib.parse.urlparse(url)
    # An absolute, well-formed URL must use the HTTP(S) protocol and carry a
    # network location (host). We also reject any leading or trailing
    # whitespace, which `urlparse` would otherwise silently tolerate.
    ensure.ensure(
        parsed.scheme in ("http", "https"),
        "URL scheme is not http(s):",
        url,
    )
    ensure.ensure(parsed.netloc, "URL has no host:", url)
    ensure.ensure(url == url.strip(), "URL has surrounding whitespace:", url)


def _verify_resource_urls() -> None:
    for resource in _RESOURCES:
        url: str | None = resource.get("url", None)
        if not url:
            log.error("No URL set for", resource["variants"][0])
            continue
        _verify_url(url)


_verify_resource_urls()


# Single-letter key per language, used as the column header in the search
# results table. Ideally, you should keep in sync with the dialect keys in the
# TypeScript. The keys are fairly static, so this will likely never change.
def _key(lang: Language) -> str:
    return "P" if lang == "DialectP" else lang[0]


ensure.unique(map(_key, _LANGUAGES))

_VERSE_PREFIX: re.Pattern[str] = re.compile(r"^\((.*?)\)")

# The `verseNumber` field generally has the format:
#   "${BOOK} ${CHAPTER}:${VERSE}".
# Some single-chapter books omit the "${CHAPTER}:" component.
# Many verse entries, particularly titles (specially psalm titles), which are
# simply treated as verses, either have an empty `verseNumber` field, or have a
# field value with a subset of the regex fields.
_VERSE_NUMBER_RE: re.Pattern[str] = re.compile(
    r"^(?:\d )?[A-Za-z ]+(?: (\d+[ab]?|[A-F])(?::(\d+[a-z]?)(?:-(\d+))?)?)?$",
)
_SHORT_VERSE_NUMBER_RE: re.Pattern[str] = re.compile(
    # Use an empty capture group for the absent chapter number, to force the
    # verse number to match at group 2, thus aligning with the general regex.
    r"^(?:\d )?[A-Za-z ]+()(?: (\d+))?$",
)

_UNAVAILABLE_RE: re.Pattern[str] = re.compile("There is no available .+ text")
# We use the third-party `regex` module rather than the standard library `re`
# here because we rely on `Match.captures` to retrieve every match of the
# repeated `Source:` group; `re` only retains the last capture of a repeated
# group.
_AVAILABLE_RE: regex.Pattern[str] = regex.compile(
    # pylint: disable-next=line-too-long
    r"(?:Text )?Availability:[^\n]+(?:\n\nSource(?: \d)?:([^\n]+)(?:\n[^\n]+footnotes\.)?)+(\n\nEditing:[^\n]+)?(?:\n\nNote:[^\n]+)?",
)


class _CrumMapEntry(typing.TypedDict):
    name: str
    path: str
    chapters: list[str]
    abb: str


# Output parameters

# NOTE: The Bible directory structure is flat, so "index.html" is reachable
# from an `href` to `./`, regardless of which file you're looking at.
_SEARCH: str = "./"
_CHAPTER_JS: str = "main.js"  # JavaScript for a chapter.
_INDEX_JS: str = "bible.js"  # JavaScript for the index.
_CHAPTER_CSS: str = "style.css"  # CSS for a chapter.
_INDEX_CSS: list[str] = [
    _CHAPTER_CSS,
    "bible.css",
    "../collapse.css",
    "../xooxle.css",  # Styles the search results.
    "../tooltip.css",  # Styles the dialect tooltips.
]  # CSS for the index.
for artifact in [_CHAPTER_JS, _INDEX_JS, _CHAPTER_CSS, *_INDEX_CSS]:
    assert (paths.BIBLE_DIR / artifact).is_file()

_XOOXLE: pathlib.Path = paths.BIBLE_DIR / "bible.json"

_INDEX: str = "index.html"
_CHAPTER_CLASS: str = "chapter"
_INDEX_CLASS: str = "bible"

_TITLE_COP: str = "ⲡⲓϪⲱⲙ ⲉⲑⲞⲩⲁⲃ"
_TITLE_COP_EN: str = f"{_TITLE_COP} | Coptic Bible"
_AUTHOR: str = "Saint Shenouda The Archimandrite Coptic Society"
_LANG: str = "cop"

# The Jinkim is represented by the Combining Overline, not the Combining
# Conjoining Msacron.
_NORMALIZATION: dict[Language, dict[str, str]] = {
    "Bohairic": {
        chr(0xFE26): chr(  # Combining Conjoining Macron
            0x0305,
        ),  # Combining Overline
    },
}

RED: str = "red"
BLUE: str = "blue"

# Recolored words in a verse are only allowed to use these colors. Keep this
# mapping in sync with the classes used in the CSS.
_COLOR_CLASSES: dict[str, str | None] = {
    "#000000": None,
    "#05537d": BLUE,
    "#812d2d": RED,
    "#b00e23": RED,
    "#ff0000": RED,
}


def _normalize(lang: Language, text: str) -> str:
    for key, value in {
        **_NORMALIZATION.get(lang, {}),
        # Get rid of zero-width space, in all languages.
        # NOTE: The zero-width space character is intentionally used in the
        # input to distinguish identical words that should be colored
        # differently, in which case some instances would have the character and
        # some won't, with the `coloredWords` map assigning different colors to
        # each version. We therefore retain the characters in the source data,
        # but sanitize them in the output.
        chr(0x200B): "",
    }.items():
        assert key != value
        text = text.replace(key, value)
    return text


class Verse:
    """A Bible verse."""

    def __init__(self, data: schema.Verse, short_vn: bool) -> None:
        self._raw: schema.Verse = data
        # NOTE: Normalization must take place after recoloring, because
        # recoloring uses the original text.
        self.recolored: dict[Language, str] = {
            lang: _normalize(lang, self.__recolor(data[lang], data))
            for lang in _LANGUAGES
        }
        self.unnumbered: dict[Language, str] = {
            lang: _normalize(lang, _VERSE_PREFIX.sub("", data[lang]).strip())
            for lang in _LANGUAGES
        }

        self.num: str = ""
        self.chapter: str = ""
        if not data["verseNumber"]:
            return
        pattern: re.Pattern[str] = (
            _SHORT_VERSE_NUMBER_RE if short_vn else _VERSE_NUMBER_RE
        )
        match: re.Match[str] | None = pattern.fullmatch(data["verseNumber"])
        ensure.ensure(match, "Invalid verseNumber format:", data)
        assert match
        self.num = match.group(2) or ""
        self.chapter = match.group(1) or ""

    def number(self) -> str:
        """
        Returns:
            Verse number, stripping any trailing letters.
        """
        if not self.num:
            return ""
        num: str = self.num
        if num[-1].isalpha():
            num = num[:-1]
        return num

    def has_lang(self, lang: Language) -> bool:
        return bool(self.unnumbered[lang])

    def _recolor_aux(
        self,
        v: str,
        verse: schema.Verse,
    ) -> abc.Generator[str]:
        v = html.escape(v)

        colored_words: dict[str, str] = (
            {
                # We intentionally ignore the dark mode color. As of
                # the time of writing, we don't support dark mode.
                d["word"]: d["light"]
                for d in verse["coloredWords"]
                if d["word"]
            }
            if "coloredWords" in verse
            else {}
        )

        if not colored_words:
            yield v
            return

        # Longest words first so the regex engine prefers them at each
        # position; alternation tries left-to-right and finditer yields
        # non-overlapping matches.
        pattern: re.Pattern[str] = re.compile(
            "|".join(
                map(re.escape, sorted(colored_words, key=len, reverse=True)),
            ),
        )
        last: int = 0
        for m in pattern.finditer(v):
            yield v[last : m.start()]
            last = m.end()
            txt: str = m.group()
            cls: str | None = _COLOR_CLASSES[colored_words[txt]]
            yield f'<span class="{cls}">{txt}</span>' if cls else txt
        yield v[last:]

    def __recolor(self, v: str, verse: schema.Verse) -> str:
        return "".join(self._recolor_aux(v, verse))

    @typing.override
    def __str__(self) -> str:
        return str(self._raw)

    @typing.override
    def __repr__(self) -> str:
        return self.__str__()


class Item:
    """A Bible item (such as a chapter or a book)."""

    def id(self) -> str:
        raise NotImplementedError()

    def title(self) -> str:
        raise NotImplementedError()

    # NOTE: The `href` method makes a lot of assumptions about how the output is
    # structured (for example, which objects are written as files, and which are
    # sections within the same file). If the output structure were to change, it
    # needs to be revisited.
    def href(self, is_epub: bool) -> str:
        raise NotImplementedError()

    def short_title(self) -> str:
        raise NotImplementedError()

    def header(self) -> abc.Generator[str]:
        raise NotImplementedError()

    def path(self, is_epub: bool) -> str:
        ext: str = "xhtml" if is_epub else "html"
        return f"{self.id()}.{ext}"

    @typing.final
    def anchor(self, is_epub: bool) -> str:
        return f'<a href="{self.href(is_epub)}">{self.short_title()}</a>'

    @typing.final
    def to_id(self, name: str) -> str:
        return name.lower().replace(" ", "_").replace(".", "_")


class Chapter(Item):
    """A Bible chapter."""

    def __init__(
        self,
        data: schema.Chapter,
        book: "Book",
        short_vn: bool,
    ) -> None:
        self.num: str = self._num(data)
        self.verses: list[Verse] = [Verse(v, short_vn) for v in data["data"]]
        self._prev: Chapter | None = None
        self._next: Chapter | None = None
        self._is_first: bool = False
        self._is_last: bool = False
        self.book: Book = book

        # Make sure we're aware of all special cases. See #524.
        if self.num.isalpha():
            assert self.book.name in ["Daniel", "Esther"]
        elif self.num[-1].isalpha():
            assert any(
                self.id().startswith(prefix)
                for prefix in ("jeremiah_51", "psalms_115")
            )
        else:
            assert self.num.isdigit()

        # NOTE: Daniel 3, in our data, hosts both Daniel 3 and Daniel B. We
        # override the numbers to form a single sequence.
        # P.S. This is how the book happens to be cited in Crum, although the
        # resulting sequence seems to be aligned with Crum's up to 52 or 53,
        # then it starts being off by 1 from 53 or 54 onward, and then being off
        # by 2 from the late 50s or early 60s and all the way to the end!
        # TODO: (#524) Implement this override in a cleaner, more visible
        # location.
        # TODO: (#524) Handle other oddly-numbered or interleaved chapters.
        if self.id() == "daniel_3":
            for idx, v in enumerate(self.verses[1:], 1):
                v.num = str(idx)
        else:
            foreign: set[str] = {
                v.chapter
                for v in self.verses
                if v.chapter and v.chapter != self.num
            }
            # TODO: (#524) Change the following error to an assertion.
            if foreign:
                log.error(
                    self,
                    "contains verses from a foreign chapter:",
                    foreign,
                )

        if len(self.verses) <= 1:
            return

        # Perform some verse number validation.
        seen: set[str] = set()
        dupes: set[str] = set()
        non_consec: set[str] = set()

        # Determine the boundaries to minimize noisy error logging.
        # Chapters often include a few entries at the beginning or the end,
        # which are not part of the chapter text and possess no verse numbers,
        # but are stored in our dataset as verses.
        # We allow boundaries to omit verse numbers.
        boundaries: list[int] = [0, len(self.verses) - 1]
        if not self.verses[0].num and not self.verses[1].num:
            boundaries.append(1)
        if not self.verses[-1].num and not self.verses[-2].num:
            boundaries.append(len(self.verses) - 2)

        for idx, v in enumerate(self.verses):
            if not v.num:
                (
                    log.warn
                    if idx in boundaries or self.id() == "psalms_118"
                    else log.fatal
                )(self, "has verse with unknown number:", v)
                continue
            if v.num in seen:
                dupes.add(v.num)
                if self.verses[idx - 1].num != v.num:
                    non_consec.add(v.num)
                continue
            seen.add(v.num)

        if non_consec:
            # TODO: (#524) If possible, change the following error to an
            # assertion.
            log.error(
                self,
                "has non-consecutive identical verse numbers:",
                non_consec,
            )

        if dupes:
            # TODO: (#524) If possible, change the following warning to an
            # assertion.
            log.warn(self, "has duplicate verse IDs:", dupes)

    def _num(self, data: schema.Chapter) -> str:
        return data["sectionNameEnglish"] or "1"

    # pylint: disable-next=method-cache-max-size-none
    @functools.cache
    def has_lang(self, lang: Language, boundary_counts: bool = True) -> bool:
        return any(
            v.has_lang(lang)
            for v in (self.verses if boundary_counts else self.verses[1:-1])
        )

    def prev(self):
        if self._is_first:
            return None
        assert self._prev
        return self._prev

    def next(self):
        if self._is_last:
            return None
        assert self._next
        return self._next

    def set_prev(self, prv: typing.Self):
        self._prev = prv

    def set_next(self, nxt: typing.Self):
        self._next = nxt

    def set_first(self):
        self._is_first = True

    def set_last(self):
        self._is_last = True

    @typing.override
    def id(self) -> str:
        return self.to_id(f"{self.book.name}_{self.num}")

    @typing.override
    def title(self) -> str:
        return f"{self.book.name} {self.num}"

    @typing.override
    def short_title(self) -> str:
        return self.num

    @typing.override
    def href(self, is_epub: bool) -> str:
        if is_epub:
            # An EPUB chapter is a section in the same file. We simply use an
            # anchor to the id.
            return f"#{self.id()}"
        # An HTML chapter is a standalone file.
        return self.path(is_epub)

    @typing.override
    def path(self, is_epub: bool) -> str:
        if not is_epub:
            return super().path(is_epub)
        log.fatal("We don't write EPUB chapters to files!")

    @typing.override
    def header(self) -> abc.Generator[str]:
        yield f'<h4 class="title" id="{self.id()}">'
        yield self.title()
        yield "</h4>"

    @typing.override
    def __str__(self) -> str:
        return f"{self.book} {self.num}"

    @typing.override
    def __repr__(self) -> str:
        return self.__str__()


def _normalize_source(source: str) -> str:
    source = source.replace("“", '"').replace("”", '"')
    source = re.sub(r",\s*", ", ", source)
    source = re.sub(r"\s+", " ", source)
    return source.strip()


class Book(Item):
    """A Bible book."""

    def __init__(self, book_info: schema.BookInfo) -> None:
        self.name: str = book_info["title"]
        self.crum: list[str] = book_info["crum"]

        data: list[schema.Chapter] = self._load()
        short_vn: bool = len(data) == 1 and all(
            ":" not in v["verseNumber"] for v in data[0]["data"]
        )
        self.chapters: list[Chapter] = [
            Chapter(c, self, short_vn) for c in data
        ]
        self.sources: dict[Language, list[str]] = self._sources()

    def _sources(self) -> dict[Language, list[str]]:
        raw: schema.Sources = file.json_loads(
            _SOURCES_DIR / f"{self.name}_Sources.json",
            schema.Sources,
        )
        sources: dict[Language, list[str]] = {}
        for lang in _LANGUAGES:
            if not self.has_lang(lang, boundary_counts=False):
                ensure.ensure(
                    _UNAVAILABLE_RE.fullmatch(raw[lang]),
                    "no",
                    lang,
                    "text available in",
                    self,
                    "but source doesn't match format:",
                    raw[lang],
                )
                continue

            match: regex.Match[str] | None = _AVAILABLE_RE.fullmatch(
                raw[lang],
            )
            ensure.ensure(
                match,
                "sources for",
                lang,
                self,
                "have unknown format",
            )
            assert match

            # The 'Editing:' part of the description, which is represented by
            # the second capture group, is required for the Coptic dialects
            # (i.e. neither English nor Greek), but optional for the rest.
            if lang not in ["English", "Greek"]:
                ensure.ensure(
                    match.group(2),
                    "sources for",
                    lang,
                    "don't provide Editing information!",
                )

            sources[lang] = [_normalize_source(s) for s in match.captures(1)]

        if sources.get("English", []) == [
            "Horner facing page translation (Bohairic)",
        ]:
            assert len(sources["Bohairic"]) == 1
            assert "Horner" in sources["Bohairic"][0]
            sources["English"] = list(sources["Bohairic"])

        for source in itertools.chain(*sources.values()):
            ensure.ensure(
                any(
                    source.startswith(var)
                    for resource in _RESOURCES
                    for var in resource["variants"]
                ),
                "unknown source:",
                source,
            )
        return sources

    def _load(self) -> list[schema.Chapter]:
        path: str = os.path.join(_INPUT_DIR, f"{self.name}.json")
        if not os.path.exists(path):
            log.error("Book not found:", self)
            return []
        return file.json_loads(path, list[schema.Chapter])

    def chapter_names(self) -> list[str]:
        return [c.num for c in self.chapters]

    # pylint: disable-next=method-cache-max-size-none
    @functools.cache
    def has_lang(self, lang: Language, boundary_counts: bool = True) -> bool:
        return any(c.has_lang(lang, boundary_counts) for c in self.chapters)

    @typing.override
    def id(self) -> str:
        return self.to_id(self.name)

    @typing.override
    def title(self) -> str:
        return self.name

    @typing.override
    def short_title(self) -> str:
        # There is no short title for books.
        return self.title()

    @typing.override
    def href(self, is_epub: bool) -> str:
        if is_epub:
            # An EPUB book is a separate ".xhtml" spine item.
            return self.path(is_epub)
        # We don't have HTML books!
        log.fatal("We don't have hyperlinks to books in HTML!")

    @typing.override
    def path(self, is_epub: bool) -> str:
        if is_epub:
            return super().path(is_epub)
        # We don't have HTML books!
        log.fatal("We don't write HTML books to files!")

    @typing.override
    def header(self) -> abc.Generator[str]:
        yield f'<h3 id="{self.id()}">'
        yield self.title()
        yield "</h3>"

    @typing.override
    def __str__(self) -> str:
        return self.name

    @typing.override
    def __repr__(self) -> str:
        return self.__str__()


class Section(Item):
    """A section of a testament."""

    def __init__(self, name: str, data: schema.SectionInfo) -> None:
        self.name: str = name
        with concur.thread_pool_executor() as executor:
            self.books: list[Book] = list(executor.map(Book, data))


class Testament(Item):
    """A testament of the Bible."""

    def __init__(self, name: str, data: schema.TestamentInfo) -> None:
        self.name: str = name
        self.sections: list[Section] = [
            Section(section_name, section_data)
            for section_name, section_data in data.items()
        ]


class Bible:
    """The Bible."""

    def __init__(self) -> None:
        bible_data: schema.BibleInfo = file.json_loads(_JSON, schema.BibleInfo)

        self.testaments: list[Testament] = [
            Testament(name, data) for name, data in bible_data.items()
        ]
        self.__link_chapters()

    def write_crum_map(self) -> None:
        # NOTE: Crum didn't explicitly list all Biblical book abbreviations.
        # Particularly:
        # - Joel and Jude are not listed, perhaps because he uses their full
        #   form.
        # - Philemon is not mentioned, though he seems to have used "Philem".
        # - Ezra and Nehemiah likely don't have any surviving Coptic text, so
        #   they are not mentioned.
        # Crum also uses 'Su' to refer to the story of Susanna, while in our
        # case it's a chapter in Daniel.
        # There are also non-standard citations found throughout the book.
        # Thus, the data in the input file is a super set of the data in Crum's
        # List of Abbreviation.
        ensure.unique(key for book in self.chain_books() for key in book.crum)
        mapping: dict[str, _CrumMapEntry] = {
            key: _CrumMapEntry(
                name=book.name,
                path=book.id(),
                chapters=sorted(book.chapter_names()),
                abb=key,
            )
            for book in self.chain_books()
            for key in book.crum
        }
        # This TypeScript code is needed by our website due to difficulties
        # getting Anki to read a JSON.
        file.write(
            f"export const MAPPING = {mapping};",
            paths.LEXICON_DIR / "bible.js",
        )

    def __link_chapters(self) -> None:
        iterator: abc.Iterator[Chapter] = iter(self.chain_chapters())
        cur: Chapter | None = next(iterator, None)
        if not cur:
            return
        cur.set_first()
        while True:
            nxt: Chapter | None = next(iterator, None)
            if nxt is None:
                cur.set_last()
                break
            cur.set_next(nxt)
            nxt.set_prev(cur)
            cur = nxt

    def chain_books(self) -> abc.Generator[Book]:
        for testament in self.testaments:
            for section in testament.sections:
                yield from section.books

    def chain_chapters(self) -> abc.Generator[Chapter, None, None]:
        for book in self.chain_books():
            yield from book.chapters


# The static part of the Bible search interface.
# The (empty) results table that follows it is built separately because its
# columns are generated per language and so cannot be a constant.
#
# This is kept as a single literal block so it reads like the HTML it produces
# and can be diffed directly against the hand-written Lexicon index.
#
# NOTE: This markup is partially duplicated in the Lexicon index
# (`docs/crum/index.html`), which is hand-written. Keep the two structurally in
# sync: when changing any of these IDs, classes, or controls here, assess
# whether the Lexicon index needs the corresponding change -- and vice versa.
_SEARCH_FORM: str = """\
<table id="xooxle">
  <tbody>
    <tr>
      <td id="search-box-td"><input id="search-box" autocapitalize="off"
        autocomplete="off" autocorrect="off" placeholder="Search"
        spellcheck="false" type="text"></td>
      <td id="keyboard-td"><a id="keyboard" href="/keyboard.html"
        target="_blank">⌨️ Keyboard</a></td>
      <td></td>
    </tr>
  </tbody>
</table>
<table>
  <tr>
    <td id="dialects">
      <div id="dialects-button">Languages ▾</div>
      <span id="checkboxes">Highlight Languages:&nbsp;\
<!--Dialect checkboxes go here.--></span>
    </td>
    <td id="full-word-checkbox-td"><label for="full-word-checkbox">\
<input id="full-word-checkbox" type="checkbox"> Full-Word</label></td>
    <td id="case-sensitive-checkbox-td"><label for="case-sensitive-checkbox">\
<input id="case-sensitive-checkbox" type="checkbox"> Case</label></td>
    <td id="regex-checkbox-td"><label for="regex-checkbox">\
<input id="regex-checkbox" type="checkbox">RegEx</label></td>
  </tr>
</table>
<p id="message"><!--Placeholder for warnings and messages.--></p>"""


class HTMLBuilder:
    """An Bible HTML formatter and builder."""

    def chapter_begin(
        self,
        chapter: Chapter,
        langs: list[Language],
    ) -> abc.Generator[str]:
        raise NotImplementedError

    def chapter_end(self, chapter: Chapter) -> abc.Generator[str]:
        raise NotImplementedError

    def verse_begin(
        self,
        verse: Verse,
        num: str | None = None,
    ) -> abc.Generator[str]:
        raise NotImplementedError

    def verse_end(
        self,
        verse: Verse,
        num: str | None = None,
    ) -> abc.Generator[str]:
        raise NotImplementedError

    def verse_group_begin(self, num: str) -> abc.Generator[str]:
        raise NotImplementedError

    def verse_group_end(self, num: str) -> abc.Generator[str]:
        raise NotImplementedError

    def lang_begin(self, lang: Language) -> abc.Generator[str]:
        raise NotImplementedError

    def lang_end(self, lang: Language) -> abc.Generator[str]:
        raise NotImplementedError

    # _verse_body_aux builds the HTML for a single verse.
    def _verse_body_aux(
        self,
        verse: Verse,
        langs: list[Language],
        num_override: str | None,
        omit_empty: bool = False,
    ) -> abc.Generator[str]:
        yield from self.verse_begin(verse, num_override)
        for lang in langs:
            yield from self.lang_begin(lang)
            if verse.has_lang(lang) or not omit_empty:
                yield from verse.recolored[lang]
            yield from self.lang_end(lang)
        yield from self.verse_end(verse, num_override)

    def verse_html(
        self,
        verse: Verse,
        langs: list[Language],
        num_override: str | None = None,
        omit_empty: bool = False,
    ) -> str:
        return "".join(
            self._verse_body_aux(verse, langs, num_override, omit_empty),
        )

    # __chapter_body_aux builds the contents of the <body> element of a chapter.
    def __chapter_body_aux(
        self,
        chapter: Chapter,
        langs: list[Language],
    ) -> abc.Generator[str]:
        langs = [lang for lang in langs if chapter.has_lang(lang)]
        ensure.members(
            langs,
            _NONEMPTY_LANGUAGES,
            chapter,
            "has text in a language that is marked as empty",
        )
        yield from chapter.header()
        if not langs:
            return
        yield from self.chapter_begin(chapter, langs)

        # Track all IDs used for verses and verse groups, so that duplicates
        # (which would otherwise collide in the output) get a `_${COUNTER}`
        # suffix.
        seen: dict[str, int] = {}

        def dedupe(num: str) -> str:
            if not num:
                return num
            count: int = seen.get(num, 0)
            seen[num] = count + 1
            return num if not count else f"{num}_{count}"

        def emit_group(group: abc.Iterable[Verse]) -> abc.Generator[str]:
            for verse in group:
                yield from self._verse_body_aux(
                    verse,
                    langs,
                    dedupe(verse.num),
                )

        group: abc.Iterable[Verse]
        for num, group in itertools.groupby(chapter.verses, key=Verse.number):
            # Sanity check! This assertion must hold given the regex.
            assert not num or num.isdigit()
            group = list(group)
            # Avoid grouping the verses if:
            # - The group verses have no number (`verse.num` is the empty
            # string). These are non-verses.
            # - The group has a single verse that contains a numeric number.
            #   If, otherwise, the group has an alphabetical suffix, we wrap it
            #   in a group that has a numerical number, in order for lookups
            #   that use the non-suffixed number to resolve correctly.
            if not num or (len(group) == 1 and group[0].num.isdigit()):
                yield from emit_group(group)
                continue

            # Otherwise, create a group.
            num = dedupe(num)
            yield from self.verse_group_begin(num)
            yield from emit_group(group)
            yield from self.verse_group_end(num)

        yield from self.chapter_end(chapter)

    # __book_body_aux builds the contents of the <body> element of a book.
    def __book_body_aux(
        self,
        book: Book,
        langs: list[Language],
        is_epub: bool,
    ) -> abc.Generator[str]:
        assert is_epub  # We only write a whole book in one file for EPUB.
        assert len(langs) > 0  # We need at least one language.

        # Yield the book header.
        yield from book.header()

        # Yield anchors to the chapters.
        for i, chapter in enumerate(book.chapters):
            if i:
                yield " "
            yield chapter.anchor(is_epub)

        # Yield the chapter contents.
        for chapter in book.chapters:
            yield from self.__chapter_body_aux(chapter, langs)

    # __html_aux builds the HTML file content as a generator.
    def __html_aux(
        self,
        body: abc.Iterable[str],
        title: str,
        page_class: str = "",
        nxt: str = "",
        prv: str = "",
        is_epub: bool = False,
        scripts: list[str] | None = None,
        css: list[str] | None = None,
    ) -> abc.Generator[str]:
        return page.html_aux(
            page.html_head(
                title=title,
                search="" if is_epub else _SEARCH,
                next_href=nxt,
                prev_href=prv,
                scripts=scripts or [],
                epub=is_epub,
                css=css or [],
            ),
            page_class,
            "".join(body),
        )

    # __search_form_aux builds the search form HTML.
    def __search_form_aux(self) -> abc.Generator[str]:
        yield _SEARCH_FORM
        yield '<table id="results" class="results"><thead><tr>'
        yield '<th style="width: 10%;"></th>'
        for lang in _NONEMPTY_LANGUAGES:
            k: str = _key(lang)
            yield f'<th class="{k}">{k}</th>'
        yield "</tr></thead>"
        yield "<tbody><!-- Search results will be appended here. --></tbody>"
        yield "</table>"

    # _build_toc_body_aux builds the contents of the <body> element for the
    # table of contents.
    def __toc_body_aux(
        self,
        bible: Bible,
        is_epub: bool,
    ) -> abc.Generator[str]:
        # Yield the title.
        yield "<h1>"
        yield _TITLE_COP
        yield "</h1>"

        if is_epub:
            # For EPUB, we yield an anchor to each book.
            for book in bible.chain_books():
                yield "<p>"
                yield book.anchor(is_epub)
                yield "</p>"
            return

        assert not is_epub
        # For HTML, we render the search form, followed by the book index.
        yield from self.__search_form_aux()

        # The book index: testaments side by side, each a column of books with
        # their (collapsible) chapter lists.
        yield '<table class="book-index">'
        yield "<tr>"
        for testament in bible.testaments:
            yield "<td>"
            for idx, section in enumerate(testament.sections):
                if idx:
                    yield page.HORIZONTAL_RULE
                for book in section.books:
                    yield f'<h4 class="collapse index-book-name" \
                            id="{book.id()}">'
                    yield book.name
                    yield "</h4>"
                    yield '<div class="collapsible index-book-chapter-list">'
                    # The inner container is necessary for the grid layout to
                    # work.
                    yield "<div>"
                    for i, chapter in enumerate(book.chapters):
                        if i:
                            yield " "
                        yield chapter.anchor(is_epub)
                    yield "</div>"
                    yield "</div>"
            yield "</td>"
        yield "</tr>"
        yield "</table>"

    def write_html(self, bible: Bible, langs: list[Language]) -> None:
        def write_chapter(chapter: Chapter) -> None:
            self.__write_html_chapter(chapter, langs)

        with concur.thread_pool_executor() as executor:
            _ = list(executor.map(write_chapter, bible.chain_chapters()))

        toc = self.__html_aux(
            self.__toc_body_aux(bible, is_epub=False),
            title=_TITLE_COP_EN,
            page_class=_INDEX_CLASS,
            scripts=[_INDEX_JS],
            css=_INDEX_CSS,
        )
        file.writelines(toc, paths.BIBLE_DIR / _INDEX)

    def __write_html_chapter(
        self,
        chapter: Chapter,
        langs: list[Language],
    ) -> None:
        nxt: Chapter | None = chapter.next()
        prv: Chapter | None = chapter.prev()

        out = self.__html_aux(
            self.__chapter_body_aux(chapter, langs),
            title=chapter.title(),
            page_class=_CHAPTER_CLASS,
            nxt=nxt.href(is_epub=False) if nxt else "",
            prv=prv.href(is_epub=False) if prv else "",
            scripts=[_CHAPTER_JS],
            css=[
                _CHAPTER_CSS,
                os.path.relpath(paths.TOOLTIP_CSS, paths.BIBLE_DIR),
            ],
        )
        file.writelines(
            out,
            paths.BIBLE_DIR / chapter.path(is_epub=False),
            make_dir=True,
            report=False,
        )

    def write_epub(
        self,
        bible: Bible,
        langs: list[Language],
        subdir: str,
    ) -> None:
        kindle: epub.EpubBook = epub.EpubBook()
        identifier: str = " ".join(langs)
        kindle.set_identifier(identifier)
        kindle.set_language(_LANG)
        kindle.set_title(_TITLE_COP_EN)
        kindle.add_author(_AUTHOR)
        cover_file_name: str = os.path.basename(_COVER)
        cover: epub.EpubCover = epub.EpubCover(file_name=cover_file_name)
        cover.content = file.read_bytes(_COVER)
        kindle.add_item(cover)
        kindle.add_item(epub.EpubCoverHtml(image_name=cover_file_name))
        kindle.add_metadata(
            None,
            "meta",
            "",
            epub.OrderedDict([("name", "cover"), ("content", "cover-img")]),
        )

        toc: epub.EpubHtml = epub.EpubHtml(
            title="Table of Contents",
            file_name="toc.xhtml",
        )
        toc.set_content(
            "".join(
                self.__html_aux(
                    self.__toc_body_aux(bible, is_epub=True),
                    title=_TITLE_COP_EN,
                    is_epub=True,
                ),
            ),
        )
        kindle.add_item(toc)

        spine = [cover, toc]

        for book in bible.chain_books():
            c: epub.EpubHtml = epub.EpubHtml(
                title=book.name,
                file_name=book.path(is_epub=True),
            )
            c.set_content(
                "".join(
                    self.__html_aux(
                        self.__book_body_aux(book, langs, is_epub=True),
                        title=book.name,
                        is_epub=True,
                    ),
                ),
            )
            spine.append(c)
            kindle.add_item(c)
        kindle.spine = spine
        kindle.toc = spine[2:]
        kindle.add_item(epub.EpubNcx())
        kindle.add_item(epub.EpubNav())

        path: pathlib.Path = (
            paths.BIBLE_DIR / "epub" / subdir / f"{identifier.lower()}.epub"
        )
        file.mk_parent_dir(path)
        # TODO: (#0) The following method can fail silently. To verify that the
        # content has actually been written, perhaps write to a temporary file,
        # then verify its existence, then copy to the actual destination.
        # Asserting that the file exists doesn't suffice because it might have
        # been there already.
        epub.write_epub(path, kindle)
        log.wrote(path)

    def write(
        self,
        fmt: typing.Literal["html", "epub"],
        bible: Bible,
        langs: list[Language],
        subdir: str = "",
    ) -> None:
        if fmt == "html":
            self.write_html(bible, langs)
            return
        assert fmt == "epub"
        self.write_epub(bible, langs, subdir)


class FlowBuilder(HTMLBuilder):
    """FlowBuilder provides a flow format for the Bible."""

    @typing.override
    def chapter_begin(
        self,
        chapter: Chapter,  # dead: disable
        langs: list[Language],  # dead: disable
    ) -> abc.Generator[str]:
        del chapter, langs
        yield from []

    @typing.override
    def chapter_end(
        self,
        chapter: Chapter,  # dead: disable
    ) -> abc.Generator[str]:
        del chapter
        yield from []

    @typing.override
    def verse_begin(
        self,
        verse: Verse,  # dead: disable
        num: str | None = None,  # dead: disable
    ) -> abc.Generator[str]:
        del verse, num
        yield from []

    @typing.override
    def verse_end(
        self,
        verse: Verse,  # dead: disable
        num: str | None = None,  # dead: disable
    ) -> abc.Generator[str]:
        del verse, num
        yield page.LINE_BREAK

    @typing.override
    def verse_group_begin(
        self,
        num: str,  # dead: disable
    ) -> abc.Generator[str]:
        del num
        yield from []

    @typing.override
    def verse_group_end(self, num: str) -> abc.Generator[str]:  # dead: disable
        del num
        yield from []

    @typing.override
    def lang_begin(
        self,
        lang: Language,  # dead: disable
    ) -> abc.Generator[str]:
        yield from []

    @typing.override
    def lang_end(self, lang: Language) -> abc.Generator[str]:  # dead: disable
        yield page.LINE_BREAK


class TableBuilder(HTMLBuilder):
    """TableBuilder provides a table format for the Bible."""

    # NOTE: This table builder could potentially emit empty `<tbody></tbody>`
    # elements in the output. This is benign, and is intentionally left to
    # simplify the code.

    @typing.override
    def chapter_begin(
        self,
        chapter: Chapter,
        langs: list[Language],
    ) -> abc.Generator[str]:
        yield '<table class="verses">'
        yield "<thead>"
        yield "<tr>"
        for lang in langs:
            sources: list[str] = chapter.book.sources.get(lang, [])
            assert all("\n" not in s for s in sources)
            yield "<th"
            yield f' class="{_key(lang)}"'
            yield f' data-sources="{html.escape(json.dumps(sources))}"'
            yield ">"
            yield lang
            yield "</th>"
        yield "</tr>"
        yield "</thead>"
        yield "<tbody>"

    @typing.override
    def chapter_end(
        self,
        chapter: Chapter,  # dead: disable
    ) -> abc.Generator[str]:
        del chapter
        yield "</tbody>"
        yield "</table>"

    @typing.override
    def verse_begin(
        self,
        verse: Verse,
        num: str | None = None,
    ) -> abc.Generator[str]:
        if num is None:
            num = verse.num
        if not num:
            yield '<tr class="verse">'
            return
        # TODO: (#0) If several chapters were to be placed in the same document
        # (as is the case with the generated EPUBs), this would result in verses
        # from different chapters having the same ID! Verse ID should either be
        # distinct across chapters, or should be omitted in the EPUB!
        yield f'<tr class="verse" id="v{num}">'

    @typing.override
    def verse_end(
        self,
        verse: Verse,  # dead: disable
        num: str | None = None,  # dead: disable
    ) -> abc.Generator[str]:
        del verse, num
        yield "</tr>"

    @typing.override
    def verse_group_begin(self, num: str) -> abc.Generator[str]:
        yield "</tbody>"
        yield f'<tbody class="verse-group" id="v{num}">'

    @typing.override
    def verse_group_end(self, num: str) -> abc.Generator[str]:  # dead: disable
        del num
        yield "</tbody>"
        yield "<tbody>"

    @typing.override
    def lang_begin(
        self,
        lang: Language,
    ) -> abc.Generator[str]:
        yield f'<td class="language {_key(lang)}">'

    @typing.override
    def lang_end(self, lang: Language) -> abc.Generator[str]:  # dead: disable
        yield "</td>"


def main():
    parser: argparse.ArgumentParser = argparse.ArgumentParser(
        description=__doc__,
    )
    _ = parser.add_argument(
        "--validate",
        action="store_true",
        help="Exit after building the Bible without writing any artifacts.",
    )
    args: argparse.Namespace = parser.parse_args()

    bible: Bible = Bible()

    flow_builder: FlowBuilder = FlowBuilder()
    table_builder: TableBuilder = TableBuilder()

    if args.validate:
        return

    flow_builder.write("epub", bible, ["Bohairic", "English"], "1")
    table_builder.write("epub", bible, ["Bohairic", "English"], "2")
    table_builder.write("html", bible, _LANGUAGES, "")

    bible.write_crum_map()

    # TODO: (#0) Verse HTML gets generated twice. Consider deduplicating it,
    # somehow, to slightly speed up the code.
    def verse_source() -> abc.Generator[tuple[str, str]]:
        for chapter in bible.chain_chapters():
            path: str = chapter.path(is_epub=False)
            for verse in chapter.verses:
                key: str = f"{path}#v{verse.num}" if verse.num else path
                # In Xooxle, we use the raw verse numbers, even if duplicate or
                # suffixed numbers are present. Duplicate keys are acceptable in
                # Xooxle. The complex verse number deduplication / grouping
                # logic is irrelevant in Xooxle's case.
                yield key, table_builder.verse_html(
                    verse,
                    _LANGUAGES,
                    omit_empty=True,
                )

    xooxle.Xooxle(
        verse_source(),
        [],
        [
            xooxle.Capture(
                _key(lang),
                xooxle.Selector({"class_": _key(lang)}, False),
                {RED, BLUE},
            )
            for lang in _NONEMPTY_LANGUAGES
        ],
        _XOOXLE,
    ).build()


if __name__ == "__main__":
    main()
