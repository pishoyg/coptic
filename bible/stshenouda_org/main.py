#!/usr/bin/env python3
"""Process the Bible data."""
# NOTE: As a general convention, methods ending with _aux return generators,
# rather than string literals.
import collections
import html
import json
import os
import pathlib
import re
import typing
from collections import abc

import json5
from ebooklib import epub  # type: ignore[import-untyped]

from bible.stshenouda_org import schema
from utils import concur, ensure, file, log, page, paths

# Input parameters

_SCRIPT_DIR = pathlib.Path(__file__).parent
_JSON: pathlib.Path = _SCRIPT_DIR / "data/input/bible.json"
_INPUT_DIR: pathlib.Path = _SCRIPT_DIR / "data/raw/"
# TODO: (#432) Include the sources in the output.
_SOURCES_DIR: pathlib.Path = _SCRIPT_DIR / "data/raw/Sources/"  # dead: disable
_COVER: pathlib.Path = _SCRIPT_DIR / "data/img/stauros.jpeg"

Language: typing.TypeAlias = typing.Literal[
    "Bohairic",
    "Sahidic",
    "English",
    "Greek",
    "Fayyumic",
    "Akhmimic",
    "OldBohairic",
    "Mesokemic",
    "DialectP",
    "Lycopolitan",
]
_LANGUAGES: list[Language] = [
    "Bohairic",
    "Sahidic",
    "English",
    "Greek",
    "Fayyumic",
    "Akhmimic",
    "OldBohairic",
    "Mesokemic",
    "DialectP",
    "Lycopolitan",
]

_VERSE_PREFIX: re.Pattern[str] = re.compile(r"^\(([^)]+)\)")

# Output parameters

# NOTE: The Bible directory structure is flat, so "index.html" is reachable
# from an `href` to `./`, regardless of which file you're looking at.
_SEARCH: str = "./"
_CHAPTER_JS: str = "main.js"  # JavaScript for a chapter.
_INDEX_JS: str = "bible.js"  # JavaScript for the index.
_CHAPTER_CSS: str = "style.css"  # CSS for a chapter.
_INDEX_CSS: str = "bible.css"  # CSS for the index.
for artifact in [_CHAPTER_JS, _INDEX_JS, _CHAPTER_CSS, _INDEX_CSS]:
    assert (paths.BIBLE_DIR / artifact).is_file()


_INDEX: str = "index.html"
_CHAPTER_CLASS: str = "chapter"
_INDEX_CLASS: str = "bible"

_BOOK_TITLE: str = "ⲡⲓϪⲱⲙ ⲉⲑⲞⲩⲁⲃ | Coptic Bible"
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


def _normalize(lang: Language, text: str) -> str:
    substitutions: dict[str, str] = _NORMALIZATION.get(lang, {})
    if not substitutions:
        return text
    for key, value in substitutions.items():
        text = text.replace(key, value)
    return text


class ColorRange:
    """A colored range in a verse."""

    def __init__(self, start: int, end: int, color: str) -> None:
        self.start: int = start
        self.end: int = end
        self.color: str = color

    def within(self, other: object) -> bool:
        assert isinstance(other, ColorRange)
        return self.start >= other.start and self.end <= other.end

    def overlap(self, other: object) -> bool:
        assert isinstance(other, ColorRange)
        return self.start < other.end and self.end > other.start

    def winner(self, other: object):
        """Given two ranges, return whichever one contains the other.

        If neither contains the other, crash!

        Args:
            other: The other color range to compare to this.

        Returns:
            The larger range.

        """
        assert isinstance(other, ColorRange)
        if self.within(other):
            return other
        if other.within(self):
            return self
        log.fatal(
            "Neither of the two ranges is within the other!",
            [self, other],
        )


class Verse:
    """A Bible verse."""

    def __init__(self, data: schema.Verse, first: bool) -> None:
        self._raw: schema.Verse = data
        self.num: str = self.__num(data)
        if not self.num:
            # It's often the case that a chapter contains a title
            # at the very beginning. In such cases, there is no verse number.
            # TODO: (#553) Handle invalid verse IDs!
            (log.warn if first else log.error)(
                "Unable to infer number for verse:",
                self,
            )
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

    def has_lang(self, lang: Language) -> bool:
        return bool(self.unnumbered[lang])

    def _recolor_aux(
        self,
        v: str,
        verse: schema.Verse,
    ) -> abc.Generator[str]:
        v = html.escape(v)
        if "coloredWords" not in verse:
            yield v
            return
        ranges: list[ColorRange] = []
        for d in verse["coloredWords"]:
            word: str = d["word"]
            color: str = d["light"]
            if not word or not color:
                continue
            ranges.extend(
                [
                    ColorRange(idx, idx + len(word), color)
                    for idx in self.__find_all(v, word)
                ],
            )
        ranges = sorted(ranges, key=self.__compare_range_color)
        if not ranges:
            yield v
            return
        ranges = self.__remove_overlap(ranges)
        assert ranges
        last: int = 0
        for rc in ranges:
            assert rc.start != rc.end
            yield v[last : rc.start]
            yield f'<span style="color:{rc.color}">{v[rc.start:rc.end]}</span>'
            last = rc.end
        yield v[last:]

    def __recolor(self, v: str, verse: schema.Verse) -> str:
        return "".join(self._recolor_aux(v, verse))

    def __num(self, verse: schema.Verse) -> str:
        t: str = verse["English"] or verse["Greek"]
        s: re.Match[str] | None = _VERSE_PREFIX.search(t)
        num: str = s.groups()[0] if s else ""
        if not num.isdigit():
            # TODO: (#553) Handle invalid verse IDs!
            log.error("Inferred a non-numerical verse number from", t)
            num = ""
        return num

    def __compare_range_color(self, rc: ColorRange) -> tuple[int, int]:
        return (rc.start, rc.end)

    def __remove_overlap(self, ranges: list[ColorRange]) -> list[ColorRange]:
        if not ranges:
            return []
        out: list[ColorRange] = [ranges[0]]
        for cur in ranges[1:]:
            prev: ColorRange = out[-1]
            if not cur.overlap(prev):
                # No overlap.
                out.append(cur)
                continue
            out[-1] = cur.winner(prev)
        return out

    def __find_all(self, s: str, p: str):
        i: int = s.find(p)
        while i != -1:
            yield i
            i = s.find(p, i + 1)

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

    def __init__(self, data: schema.Chapter, book: "Book") -> None:
        self.num: str = self._num(data)
        self.verses: list[Verse] = [
            Verse(v, i == 0) for i, v in enumerate(data["data"])
        ]
        self._prev: Chapter | None = None
        self._next: Chapter | None = None
        self._is_first: bool = False
        self._is_last: bool = False
        self.book: Book = book

        dupes: list[str] = [
            item
            for item, count in collections.Counter(
                v.num for v in self.verses
            ).items()
            if count > 1
        ]
        if dupes:
            # TODO: (#553) Handle duplicate verse IDs!
            log.error(
                "Chapter",
                self.num,
                "in Book",
                self.book.name,
                "has verses with duplicate IDs",
                dupes,
            )
            for v in self.verses:
                if v.num and v.num in dupes:
                    v.num = ""

    def _num(self, data: schema.Chapter) -> str:
        return data["sectionNameEnglish"] or "1"

    def has_lang(self, lang: Language) -> bool:
        return any(v.has_lang(lang) for v in self.verses)

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


class Book(Item):
    """A Bible book."""

    def __init__(self, book_info: schema.BookInfo) -> None:
        self.name: str = book_info["title"]
        self.crum: list[str] = book_info["crum"]

        data: list[schema.Chapter] = self._load(self.name)
        self.chapters: list[Chapter] = [Chapter(c, self) for c in data]

    def _load(self, book_name: str) -> list[schema.Chapter]:
        try:
            t: str = file.read(os.path.join(_INPUT_DIR, f"{book_name}.json"))
            log.info("Loaded book:", book_name)
        except FileNotFoundError:
            log.warn("Book not found:", book_name)
            return []

        try:
            return json.loads(t)
        except json.JSONDecodeError:
            return json5.loads(t)

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
        bible_data: schema.BibleInfo = json.loads(file.read(_JSON))

        self.testaments: list[Testament] = [
            Testament(name, data) for name, data in bible_data.items()
        ]
        self.__link_chapters()
        self.__write_crum_map()

    def __write_crum_map(self) -> None:
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
        mapping: dict[str, dict[str, str | int]] = {
            key: {
                "name": book.name,
                "path": book.id(),
                "numChapters": len(book.chapters),
            }
            for book in self.chain_books()
            for key in book.crum
        }
        # This TypeScript code is needed by our website due to some limitations
        # on reading JSON.
        file.write(
            f"""
                /** NOTE: This file is generated by the Bible pipeline. Do not
                 * modify it manually!
                 */

                /** MAPPING maps a Crum Bible book abbreviation to book information.
                 */
                export const MAPPING:
                    Record<string, {{
                        name: string,
                        path: string,
                        numChapters: number,
                    }}> = {mapping};""",
            paths.LEXICON_DIR / "bible.ts",
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


class HTMLBuilder:
    """An Bible HTML formatter and builder."""

    def chapter_begin(self, chapter: Chapter) -> abc.Generator[str]:
        raise NotImplementedError

    def chapter_end(self, chapter: Chapter) -> abc.Generator[str]:
        raise NotImplementedError

    def verse_begin(self, verse: Verse) -> abc.Generator[str]:
        raise NotImplementedError

    def verse_end(self, verse: Verse) -> abc.Generator[str]:
        raise NotImplementedError

    def lang_begin(self, lang: Language) -> abc.Generator[str]:
        raise NotImplementedError

    def lang_end(self, lang: Language) -> abc.Generator[str]:
        raise NotImplementedError

    # __chapter_body_aux builds the contents of the <body> element of a chapter.
    def __chapter_body_aux(
        self,
        chapter: Chapter,
        langs: list[Language],
    ) -> abc.Generator[str]:
        langs = [lang for lang in langs if chapter.has_lang(lang)]
        yield from chapter.header()
        if not langs:
            return
        yield from self.chapter_begin(chapter)
        for verse in chapter.verses:
            yield from self.verse_begin(verse)
            for lang in langs:
                yield from self.lang_begin(lang)
                yield from verse.recolored[lang]
                yield from self.lang_end(lang)
            yield from self.verse_end(verse)
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

    # _build_toc_body_aux builds the contents of the <body> element for the
    # table of contents.
    def __toc_body_aux(
        self,
        bible: Bible,
        is_epub: bool,
    ) -> abc.Generator[str]:
        # Yield the title.
        yield "<h1>"
        yield _BOOK_TITLE
        yield "</h1>"

        if is_epub:
            # For EPUB, we yield an anchor to each book.
            for book in bible.chain_books():
                yield "<p>"
                yield book.anchor(is_epub)
                yield "</p>"
            return

        assert not is_epub
        # For HTML, we list the testaments, sections, books, and chapters.
        yield "<table>"
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
            list(executor.map(write_chapter, bible.chain_chapters()))

        toc = self.__html_aux(
            self.__toc_body_aux(bible, is_epub=False),
            title=_BOOK_TITLE,
            page_class=_INDEX_CLASS,
            scripts=[_INDEX_JS],
            css=[_INDEX_CSS],
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
            title=chapter.book.name,
            page_class=_CHAPTER_CLASS,
            nxt=nxt.href(is_epub=False) if nxt else "",
            prv=prv.href(is_epub=False) if prv else "",
            scripts=[_CHAPTER_JS],
            css=[
                _CHAPTER_CSS,
                os.path.relpath(paths.DROPDOWN_CSS, paths.BIBLE_DIR),
            ],
        )
        file.writelines(
            out,
            paths.BIBLE_DIR / chapter.path(is_epub=False),
            make_dir=True,
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
        kindle.set_title(_BOOK_TITLE)
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
                    title=_BOOK_TITLE,
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
    ) -> abc.Generator[str]:
        del chapter
        yield from []

    @typing.override
    def chapter_end(
        self,
        chapter: Chapter,  # dead: disable
    ) -> abc.Generator[str]:
        del chapter
        yield from []

    @typing.override
    def verse_begin(self, verse: Verse) -> abc.Generator[str]:  # dead: disable
        del verse
        yield from []

    @typing.override
    def verse_end(self, verse: Verse) -> abc.Generator[str]:  # dead: disable
        del verse
        yield page.LINE_BREAK

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

    @typing.override
    def chapter_begin(
        self,
        chapter: Chapter,  # dead: disable
    ) -> abc.Generator[str]:
        del chapter
        yield '<table class="verses">'

    @typing.override
    def chapter_end(
        self,
        chapter: Chapter,  # dead: disable
    ) -> abc.Generator[str]:
        del chapter
        yield "</table>"

    @typing.override
    def verse_begin(self, verse: Verse) -> abc.Generator[str]:
        if not verse.num:
            yield '<tr class="verse">'
            return
        # TODO: (#0) If several chapters were to be placed in the same document
        # (as is the case with the generated EPUBs), this would result in verses
        # from different chapters having the same ID! Verse ID should either be
        # distinct across chapters, or should be omitted in the EPUB!
        yield f'<tr class="verse" id="v{verse.num}">'

    @typing.override
    def verse_end(self, verse: Verse) -> abc.Generator[str]:  # dead: disable
        del verse
        yield "</tr>"

    @typing.override
    def lang_begin(
        self,
        lang: Language,
    ) -> abc.Generator[str]:
        yield f'<td class="language {lang}">'

    @typing.override
    def lang_end(self, lang: Language) -> abc.Generator[str]:  # dead: disable
        yield "</td>"


def main():
    bible = Bible()
    flow_builder = FlowBuilder()

    table_builder = TableBuilder()

    tasks: list[
        tuple[
            HTMLBuilder,
            typing.Literal["html", "epub"],
            Bible,
            list[Language],
            str,
        ]
    ] = [
        (flow_builder, "epub", bible, ["Bohairic", "English"], "1"),
        (table_builder, "epub", bible, ["Bohairic", "English"], "2"),
        (table_builder, "html", bible, _LANGUAGES, ""),
    ]

    with concur.thread_pool_executor() as executor:
        _ = list(executor.map(lambda args: HTMLBuilder.write(*args), tasks))


if __name__ == "__main__":
    main()
