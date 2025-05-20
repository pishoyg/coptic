#!/usr/bin/env python3
# NOTE: As a general convention, methods ending with _aux return generators,
# rather than string literals.
import html
import json
import os
import pathlib
import re
import typing

import json5
from ebooklib import epub  # type: ignore[import-untyped]

import utils

# Input parameters

_SCRIPT_DIR = pathlib.Path(__file__).parent
JSON: str = str(_SCRIPT_DIR / "data/input/bible.json")
INPUT_DIR: str = str(_SCRIPT_DIR / "data/raw/")
# TODO: (#432) Include the sources in the output.
SOURCES_DIR: str = str(_SCRIPT_DIR / "data/raw/Sources/")
COVER: str = str(_SCRIPT_DIR / "data/img/stauros.jpeg")

LANGUAGES: list[str] = [
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

VERSE_PREFIX: re.Pattern = re.compile(r"^\(([^)]+)\)")

# Output parameters

OUTPUT_DIR: str = os.path.join(utils.SITE_DIR, "bible/")

# NOTE: The Bible directory structure is flat, so "index.html" is reachable from an
# `href` to `./`, regardless of which file you're looking at.
SEARCH = "./"
# NOTE: We expect this JavaScript file to be in the same directory as the HTML.
SCRIPT = "main.js"

INDEX = "index.html"
CHAPTER_CLASS = "BIBLE"
INDEX_CLASS = "BIBLE_INDEX"

BOOK_TITLE: str = "ⲡⲓϪⲱⲙ ⲉⲑⲞⲩⲁⲃ | Coptic Bible"
AUTHOR = "Saint Shenouda The Archimandrite Coptic Society"
LANG = "cop"


# The Jinkim is represented by the Combining Overline, not the Combining
# Conjoining Msacron.
NORMALIZATION: dict[str, dict[str, str]] = {
    "Bohairic": {
        chr(0xFE26): chr(  # Combining Conjoining Macron
            0x0305,
        ),  # Combining Overline
    },
}

assert all(d in LANGUAGES for d in NORMALIZATION.keys())


def normalize(lang: str, text: str) -> str:
    assert lang in LANGUAGES
    substitutions: dict[str, str] = NORMALIZATION.get(lang, {})
    if not substitutions:
        return text
    for key, value in substitutions.items():
        text = text.replace(key, value)
    return text


def json_loads(t: str) -> dict | list:
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        return json5.loads(t)


class RangeColor:
    def __init__(self, start: int, end: int, color: str) -> None:
        self.start: int = start
        self.end: int = end
        self.color: str = color

    def within(self, other) -> bool:
        return self.start >= other.start and self.end <= other.end

    def overlap(self, other) -> bool:
        return self.start < other.end and self.end > other.start

    def winner(self, other):
        """Given two ranges, return whichever one contains the other.

        If neither contains the other, crash!
        """
        if self.within(other):
            return other
        if other.within(self):
            return self
        assert False


class Verse:
    def __init__(self, data: dict[str, str]) -> None:
        self._num: str = self.__num(data)
        self._raw: dict[str, str] = data
        # NOTE: Normalization must take place after recoloring, because
        # recoloring uses the original text.
        self.recolored: dict[str, str] = {
            lang: normalize(lang, self.__recolor(data[lang], data))
            for lang in LANGUAGES
        }
        self.unnumbered = {
            lang: normalize(lang, VERSE_PREFIX.sub("", data[lang]).strip())
            for lang in LANGUAGES
        }

    def has_lang(self, lang: str) -> bool:
        return bool(self.unnumbered[lang])

    def _recolor_aux(self, v: str, verse: dict) -> typing.Generator[str]:
        v = html.escape(v)
        if "coloredWords" not in verse:
            yield v
            return
        ranges: list[RangeColor] = []
        for d in verse["coloredWords"]:
            word: str = d["word"]
            color: str = d["light"]
            if not word or not color:
                continue
            ranges.extend(
                [
                    RangeColor(idx, idx + len(word), color)
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

    def __recolor(self, v: str, verse: dict) -> str:
        return "".join(self._recolor_aux(v, verse))

    def __num(self, verse: dict[str, str]) -> str:
        t: str = verse["English"] or verse["Greek"]
        s: re.Match | None = VERSE_PREFIX.search(t)
        return s.groups()[0] if s else ""

    def __compare_range_color(self, rc: RangeColor) -> tuple[int, int]:
        return (rc.start, rc.end)

    def __remove_overlap(self, ranges: list[RangeColor]) -> list[RangeColor]:
        if not ranges:
            return []
        out: list[RangeColor] = [ranges[0]]
        for cur in ranges[1:]:
            prev: RangeColor = out[-1]
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


class Item:
    def id(self) -> str:
        raise NotImplementedError()

    def title(self) -> str:
        raise NotImplementedError()

    # NOTE: The `href` method makes a lot of assumption about how the output is
    # structured (for example, which objects are written as files, and which are
    # sections within the same file). If the output structure were to change, it needs to be
    # revisited.
    def href(self, epub: bool) -> str:
        raise NotImplementedError()

    def short_title(self) -> str:
        raise NotImplementedError()

    def header(self) -> str:
        raise NotImplementedError()

    def path(self, epub: bool) -> str:
        ext = "xhtml" if epub else "html"
        return f"{self.id()}.{ext}"

    def anchor(self, epub: bool) -> str:
        return f'<a href="{self.href(epub)}">{self.short_title()}</a>'

    def to_id(self, name: str) -> str:
        return name.lower().replace(" ", "_").replace(".", "_")


class Chapter(Item):
    def __init__(self, data: dict, book) -> None:
        self.num = self._num(data)
        self.verses = [Verse(v) for v in data["data"]]
        self._prev: typing.Any = None
        self._next: typing.Any = None
        self._is_first: typing.Any = None
        self._is_last: typing.Any = None
        self.book = book

    def _num(self, data: dict) -> str:
        return data["sectionNameEnglish"] or "1"

    def has_lang(self, lang: str) -> bool:
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
    def href(self, epub: bool) -> str:
        id: str = self.id()
        if epub:
            # An EPUB chapter is a section in the same file. We simply use an
            # anchor to the id.
            return f"#{id}"
        # An HTML chapter is a standalone file.
        return self.path(epub)

    @typing.override
    def path(self, epub: bool) -> str:
        if not epub:
            return super().path(epub)
        raise ValueError("We don't write EPUB chapters to files!")

    @typing.override
    def header(self) -> str:
        return f'<h4 id="{self.id()}">{self.title()}</h4>'


class Book(Item):
    def __init__(
        self,
        name: str,
        idx: int,
        testament_name: str,
        testament_idx: int,
        section_name: str,
        section_idx: int,
    ) -> None:
        self.name: str = name
        self.idx: int = idx
        self.testament_name: str = testament_name
        self.testament_idx: int = testament_idx
        self.section_name: str = section_name
        self.section_idx: int = section_idx

        data: list = self.load(self.name)
        self.zfill_len: int = len(str(len(data)))
        self.chapters = [Chapter(c, self) for c in data]

    def load(self, book_name: str) -> list:
        try:
            t: str = open(os.path.join(INPUT_DIR, book_name + ".json")).read()
            utils.info("Loaded book:", book_name)
            data = json_loads(t)
            assert isinstance(data, list)
            return data
        except FileNotFoundError:
            utils.warn("Book not found:", book_name)
            return []

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
    def href(self, epub: bool) -> str:
        if epub:
            # An EPUB book is a separate ".xhtml" spine item.
            return self.path(epub)
        # We don't have HTML books!
        raise ValueError("We don't have hyperlinks to books in HTML!")

    @typing.override
    def path(self, epub: bool) -> str:
        if epub:
            return super().path(epub)
        # We don't have HTML books!
        raise ValueError("We don't write HTML books to files!")

    @typing.override
    def header(self) -> str:
        return f'<h3 id="{self.id()}">{self.title()}</h3>'


class Bible:
    def __init__(self) -> None:
        with utils.thread_pool_executor() as executor:
            self.books: list[Book] = list(
                executor.map(self.__build_book, self.__iter_books()),
            )
        self.__link_chapters()

    def __link_chapters(self) -> None:
        iterator: typing.Iterator[Chapter] = iter(self.chain_chapters())
        cur: Chapter = next(iterator)
        cur._is_first = True
        while True:
            nxt: Chapter | None = next(iterator, None)
            if nxt is None:
                cur._is_last = True
                break
            cur._next = nxt
            nxt._prev = cur
            cur = nxt

    def __iter_books(self) -> typing.Generator[dict]:
        with open(JSON) as j:
            bible = json.loads(j.read())
            testament_idx = 0
            for testament_name, testament in bible.items():
                testament_idx += 1
                section_idx = 0
                for section_name, section in testament.items():
                    section_idx += 1
                    book_idx = 0
                    for book_name in section:
                        book_idx += 1
                        yield {
                            "name": book_name,
                            "idx": book_idx,
                            "testament_name": testament_name,
                            "testament_idx": testament_idx,
                            "section_name": section_name,
                            "section_idx": section_idx,
                        }

    def __build_book(self, kwargs: dict) -> Book:
        return Book(**kwargs)

    def chain_chapters(self) -> typing.Generator[Chapter]:
        for book in self.books:
            yield from book.chapters


# TODO: (#360) The code needs to be structured in the following way:
# - The format parameters need to go to a new class, called format, for example.
# - The write and generate methods should move to their respective types, such
#   as Bible and Chapter. Those methods should accept a format instance as
#   input.
class html_builder:
    def __init__(
        self,
        chapter_beginner: str = "",
        verse_beginner: str = "",
        verse_format: str = "",
        verse_end: str = "",
        chapter_end: str = "",
    ) -> None:
        # Format.
        self._chapter_beginner: str = chapter_beginner
        self._verse_beginner: str = verse_beginner
        self._verse_format: str = verse_format
        self._verse_end: str = verse_end
        self._chapter_end: str = chapter_end

    # __chapter_body_aux builds the contents of the <body> element of a chapter.
    def __chapter_body_aux(
        self,
        chapter: Chapter,
        langs: list[str],
    ) -> typing.Generator[str]:
        langs = [lang for lang in langs if chapter.has_lang(lang)]
        yield chapter.header()
        if not langs:
            return
        yield self._chapter_beginner
        for verse in chapter.verses:
            yield self._verse_beginner
            for lang in langs:
                yield self._verse_format.format(verse.recolored[lang])
            yield self._verse_end
        yield self._chapter_end

    # __book_body_aux builds the contents of the <body> element of a book.
    def __book_body_aux(
        self,
        book: Book,
        langs: list[str],
        epub: bool,
    ) -> typing.Generator[str]:
        assert epub  # We only write a whole book in one file for EPUB.
        assert len(langs) > 0  # We need at least one language.

        # Yield the book header.
        yield book.header()

        # Yield anchors to the chapters.
        for i, chapter in enumerate(book.chapters):
            if i:
                yield " "
            yield chapter.anchor(epub)

        # Yield the chapter contents.
        for chapter in book.chapters:
            yield from self.__chapter_body_aux(chapter, langs)

    # __html_aux builds the HTML file content as a generator.
    def __html_aux(
        self,
        body: typing.Iterable[str],
        title: str,
        page_class: str = "",
        next: str = "",
        prev: str = "",
        epub: bool = False,
    ) -> typing.Generator[str]:
        return utils.html_aux(
            utils.html_head(
                title=title,
                page_class=page_class,
                search="" if epub else SEARCH,
                next_href=next,
                prev_href=prev,
                scripts=[] if epub else [SCRIPT],
                epub=epub,
            ),
            *body,
        )

    # _build_toc_body_aux builds the contents of the <body> element for the
    # table of contents.
    def __toc_body_aux(
        self,
        bible: Bible,
        epub: bool,
    ) -> typing.Generator[str]:
        # Yield the title.
        yield f"<h1>"
        yield BOOK_TITLE
        yield f"</h1>"
        if epub:
            # For EPUB, we yield an anchor to each book, and we call it a day.
            for book in bible.books:
                yield "<p>"
                yield book.anchor(epub)
                yield "</p>"
            return
        assert not epub
        # For HTML, we list the books, and anchors to the chapters.
        for book in bible.books:
            yield f'<h4 class="collapse index-book-name">'
            yield book.name
            yield f"</h4>"
            yield '<div class="collapsible index-book-chapter-list">'
            for i, chapter in enumerate(book.chapters):
                if i:
                    yield " "
                yield chapter.anchor(epub)
            yield "</div>"

    def write_html(self, bible: Bible, langs: list[str], subdir: str) -> None:
        # NOTE: We assume that the JavaScript file exists. We don't generate it
        # or copy it.
        assert os.path.isfile(os.path.join(OUTPUT_DIR, subdir, SCRIPT))

        def write_chapter(chapter: Chapter) -> None:
            self.__write_html_chapter(chapter, langs, subdir)

        with utils.thread_pool_executor() as executor:
            list(executor.map(write_chapter, bible.chain_chapters()))

        toc = self.__html_aux(
            self.__toc_body_aux(bible, epub=False),
            title=BOOK_TITLE,
            page_class=INDEX_CLASS,
        )
        index_path: str = os.path.join(OUTPUT_DIR, subdir, INDEX)
        utils.writelines(toc, index_path)

    def __write_html_chapter(
        self,
        chapter: Chapter,
        langs: list[str],
        subdir: str,
    ) -> None:

        next: Chapter | None = chapter.next()
        prev: Chapter | None = chapter.prev()

        out = self.__html_aux(
            self.__chapter_body_aux(chapter, langs),
            title=chapter.book.name,
            page_class=CHAPTER_CLASS,
            next=next.href(epub=False) if next else "",
            prev=prev.href(epub=False) if prev else "",
        )
        path: str = os.path.join(
            OUTPUT_DIR,
            subdir,
            chapter.path(epub=False),
        )
        utils.writelines(out, path, make_dir=True)

    def write_epub(self, bible: Bible, langs: list[str], subdir: str) -> None:
        kindle: epub.EpubBook = epub.EpubBook()
        identifier: str = " ".join(langs)
        kindle.set_identifier(identifier)
        kindle.set_language(LANG)
        kindle.set_title(BOOK_TITLE)
        kindle.add_author(AUTHOR)
        cover_file_name: str = os.path.basename(COVER)
        cover: epub.EpubCover = epub.EpubCover(file_name=cover_file_name)
        with open(COVER, "rb") as f:
            cover.content = f.read()
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
                    self.__toc_body_aux(bible, epub=True),
                    title=BOOK_TITLE,
                    epub=True,
                ),
            ),
        )
        kindle.add_item(toc)

        spine = [cover, toc]

        for book in bible.books:
            c: epub.EpubHtml = epub.EpubHtml(
                title=book.name,
                file_name=book.path(epub=True),
            )
            c.set_content(
                "".join(
                    self.__html_aux(
                        self.__book_body_aux(book, langs, epub=True),
                        title=book.name,
                        epub=True,
                    ),
                ),
            )
            spine.append(c)
            kindle.add_item(c)
        kindle.spine = spine
        kindle.toc = spine[2:]
        kindle.add_item(epub.EpubNcx())
        kindle.add_item(epub.EpubNav())

        path: str = os.path.join(
            OUTPUT_DIR,
            "epub",
            subdir,
            f"{identifier.lower()}.epub",
        )
        utils.mk_parent_dir(path)
        # TODO: The following method can fail silently. To verify that the
        # content has actually been written, perhaps write to a temporary file,
        # then verify its existence, then copy to the actual destination.
        # Asserting that the file exists doesn't suffice because it might have
        # been there already.
        epub.write_epub(path, kindle)
        utils.wrote(path)

    def write(
        self,
        format: typing.Literal["html", "epub"],
        bible: Bible,
        langs: list[str],
        subdir: str,
    ) -> None:
        {"html": self.write_html, "epub": self.write_epub}[format](
            bible,
            langs,
            subdir,
        )


def main():
    bible = Bible()
    _flow_builder = html_builder(
        verse_format="{}<br>",
        verse_end="<br>",
    )

    _table_builder = html_builder(
        chapter_beginner="<table>",
        verse_beginner="<tr>",
        verse_format="<td>{}</td>",
        verse_end="</tr>",
        chapter_end="</table>",
    )

    tasks: list[
        tuple[
            html_builder,
            typing.Literal["html", "epub"],
            Bible,
            list[str],
            str,
        ]
    ] = [
        (_flow_builder, "epub", bible, ["Bohairic", "English"], "1"),
        (_table_builder, "epub", bible, ["Bohairic", "English"], "2"),
        (_table_builder, "html", bible, LANGUAGES, ""),
    ]

    with utils.thread_pool_executor() as executor:
        list(executor.map(lambda args: html_builder.write(*args), tasks))


if __name__ == "__main__":
    main()
