#!/usr/bin/env python3
import html
import json
import os
import re
import typing

import json5
from ebooklib import epub  # type: ignore[import-untyped]

import utils

# Input parameters

JSON: str = "bible/stshenouda.org/data/input/bible.json"
INPUT_DIR: str = "bible/stshenouda.org/data/raw/"
# TODO: Include the sources in the output.
SOURCES_DIR: str = "bible/stshenouda.org/data/raw/Sources/"
COVER: str = "bible/stshenouda.org/data/img/stauros.jpeg"

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
SCRIPT = "bible.js"

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


def _file_name(book_name: str) -> str:
    return book_name.lower().replace(" ", "_").replace(".", "_")


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


class Chapter:
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


class Book:
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


class Bible:
    def __init__(self) -> None:
        with utils.ThreadPoolExecutor() as executor:
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

    def _build_chapter_body_aux(
        self,
        chapter: Chapter,
        langs: list[str],
    ) -> typing.Generator[str]:
        langs = [lang for lang in langs if chapter.has_lang(lang)]
        yield self.__IDed_header(chapter)
        if not langs:
            return
        yield self._chapter_beginner
        for verse in chapter.verses:
            yield self._verse_beginner
            for lang in langs:
                yield self._verse_format.format(verse.recolored[lang])
            yield self._verse_end
        yield self._chapter_end

    def _build_book_body_aux(
        self,
        book: Book,
        langs: list[str],
        epub: bool,
    ) -> typing.Generator[str]:
        # We only write a whole book in one file for EPUB.
        assert epub
        assert len(langs) > 0
        yield self.__IDed_header(book)
        first_chapter: bool = True
        for chapter in book.chapters:
            if first_chapter:
                first_chapter = False
            else:
                yield " "
            yield self.__link(chapter, epub=epub)

        for chapter in book.chapters:
            yield from self._build_chapter_body_aux(chapter, langs)

    def __href(
        self,
        page: Book | Chapter,
        epub: bool = False,
    ) -> str:
        id: str = self.__id(page)

        is_book: bool = isinstance(page, Book)
        is_chapter: bool = isinstance(page, Chapter)
        assert is_book ^ is_chapter
        is_html: bool = not epub
        assert is_html ^ epub

        if epub and is_book:
            # An EPUB book is a separate ".xhtml" spine item.
            return f"{id}.xhtml"
        if epub and is_chapter:
            # An EPUB chapter is a section in the same file. We simply use an
            # anchor to the id.
            # NOTE: This can only be referenced from the same file!
            return f"#{id}"

        assert is_html and not epub  # Sanity check.

        if is_book:
            # We don't have HTML books!
            raise ValueError("HTML books are not supported!")
        assert is_chapter and not is_book  # Sanity check.
        assert isinstance(page, Chapter)
        # An HTML chapter is a standalone file.
        href = f"{_file_name(page.book.name)}_{page.num}.html"
        return href

    def __link(
        self,
        page: Book | Chapter,
        epub: bool = False,
    ) -> str:
        return f'<a href="{self.__href(page, epub)}">{page.num if isinstance(page, Chapter) else page.name}</a>'

    def __IDed_header(self, page: Book | Chapter) -> str:
        tag = "h3" if isinstance(page, Chapter) else "h2"
        return (
            f'<{tag} id="{self.__id(page)}">{self.__html_title(page)}</{tag}>'
        )

    def __html_title(self, page: Book | Chapter) -> str:
        if isinstance(page, Book):
            return page.name
        assert isinstance(page, Chapter)
        return f"{page.book.name} {page.num}"

    def __id(
        self,
        page: Book | Chapter,
    ) -> str:
        book = page if isinstance(page, Book) else page.book
        id: str = book.name.lower().replace(" ", "_")
        if isinstance(page, Chapter):
            id += str(page.num)
        return id

    def _html_aux(
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
                next=next,
                prev=prev,
                scripts=[] if epub else [SCRIPT],
                epub=epub,
            ),
            *body,
        )

    def _build_toc_body_aux(
        self,
        bible: Bible,
        epub: bool = False,
    ) -> typing.Generator[str]:
        # Right now, we only support generating a table of contents for EPUB.
        yield f"<h1>"
        yield BOOK_TITLE
        yield f"</h1>"
        if epub:
            for book in bible.books:
                yield "<p>"
                yield self.__link(book, epub=epub)
                yield "</p>"
            return
        assert not epub
        # This is the HTML index.
        for book in bible.books:
            yield f'<h4 class="collapse index-book-name">'
            yield book.name
            yield f"</h4>"
            yield '<div class="collapsible index-book-chapter-list">'
            first_chapter = True
            for chapter in book.chapters:
                if first_chapter:
                    first_chapter = False
                else:
                    yield " "
                yield self.__link(chapter, epub=False)
            yield "</div>"

    def write_html(self, bible: Bible, langs: list[str], subdir: str) -> None:
        # NOTE: We assume that the JavaScript file exists. We don't generate it
        # or copy it.
        assert os.path.isfile(os.path.join(OUTPUT_DIR, subdir, SCRIPT))

        with utils.ThreadPoolExecutor() as executor:
            list(
                executor.map(
                    lambda args: self.__write_html_chapter(*args),
                    [
                        (book, chapter, langs, subdir)
                        for book in bible.books
                        for chapter in book.chapters
                    ],
                ),
            )
        toc = self._html_aux(
            self._build_toc_body_aux(bible, epub=False),
            title=BOOK_TITLE,
            page_class=INDEX_CLASS,
        )
        index_path: str = os.path.join(OUTPUT_DIR, subdir, INDEX)
        utils.writelines(toc, index_path)

    def __write_html_chapter(
        self,
        book: Book,
        chapter: Chapter,
        langs: list[str],
        subdir: str,
    ) -> None:

        next: Chapter | None = chapter.next()
        prev: Chapter | None = chapter.prev()

        out = self._html_aux(
            self._build_chapter_body_aux(chapter, langs),
            title=book.name,
            page_class=CHAPTER_CLASS,
            next=self.__href(next, epub=False) if next else "",
            prev=self.__href(prev, epub=False) if prev else "",
        )
        path: str = os.path.join(
            OUTPUT_DIR,
            subdir,
            f"{_file_name(book.name)}_{chapter.num}.html",
        )
        utils.writelines(out, path, mkdir=True)

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
                self._html_aux(
                    self._build_toc_body_aux(bible, epub=True),
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
                file_name=self.__id(book) + ".xhtml",
            )
            c.set_content(
                "".join(
                    self._html_aux(
                        self._build_book_body_aux(book, langs, epub=True),
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

    with utils.ThreadPoolExecutor() as executor:
        list(executor.map(lambda args: html_builder.write(*args), tasks))


if __name__ == "__main__":
    main()
