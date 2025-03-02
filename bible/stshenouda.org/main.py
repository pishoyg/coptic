#!/usr/bin/env python3
import html
import json
import os
import re
import shutil
import typing
from concurrent import futures

import json5
from ebooklib import epub  # type: ignore[import-untyped]

import utils

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

BOOK_TITLE: str = "ⲡⲓϪⲱⲙ ⲉⲑⲞⲩⲁⲃ"

TOC_STEM = "index"

VERSE_PREFIX: re.Pattern = re.compile(r"^\(([^)]+)\)")

JSON: str = "bible/stshenouda.org/data/input/bible.json"
INPUT_DIR: str = "bible/stshenouda.org/data/raw/"
SOURCES_DIR: str = "bible/stshenouda.org/data/raw/Sources/"
OUTPUT_DIR: str = "bible/stshenouda.org/data/output"
COVER: str = "bible/stshenouda.org/data/img/stauros.jpeg"

STYLE_SHEET = "site/style.css"
SCRIPT = "site/data/build/bible.js"


class html_head:
    def __init__(
        self,
        title: str,
        epub: bool,
        in_subdir: bool = False,
        additional_elements: list[str] | None = None,
    ) -> None:
        if epub:
            assert not in_subdir
        if in_subdir:
            # Additional elements are currently required for subdirectories.
            # If they are unavailable, the parameter must be set to the empty
            # list. It can not be None.
            assert additional_elements is not None
        self.title: str = title
        self.epub = epub
        self.in_sub_dir = in_subdir
        self.additional_elements: list[str] = additional_elements or []

    def __str(self) -> typing.Generator[str]:
        yield "<!DOCTYPE html>"
        yield "<head>"
        yield f"<title>{self.title}</title>"
        if not self.epub:
            root = "../" if self.in_sub_dir else "./"
            page_class = "BIBLE" if self.in_sub_dir else "BIBLE_INDEX"
            yield f'<link href="{root}{os.path.basename(STYLE_SHEET)}" rel="stylesheet" type="text/css">'
            yield f'<script defer src="{root}{os.path.basename(SCRIPT)}" type="text/javascript"></script>'
            yield f'<link href="{root}" rel="search">'
            yield f"<script>const {page_class} = true;</script>"
        if self.additional_elements:
            yield from self.additional_elements
        yield "</head>"

    def str(self) -> str:
        return "\n".join(self.__str())


# The Jinkim is represented by the Combining Overline, not the Combining
# Conjoining Msacron.
# TODO: Reconsider the use of the Combining Conjoining Macron on a
# per-dialect basis. While it's certain that the correct character to use
# for Bohairic is the Combining Overline, this may not be the case for
# Sahidic for example.
NORMALIZATION = {
    chr(0xFE26): chr(0x0305),
}


def normalize(txt: str) -> str:
    return "".join(NORMALIZATION.get(c, c) for c in txt)


def _file_name(book_name: str) -> str:
    return book_name.lower().replace(" ", "_").replace(".", "_")


def _writing_path(output_format: str, *subdirs: str, stem: str) -> str:
    assert output_format
    assert stem
    path: str = os.path.join(
        OUTPUT_DIR,
        output_format,
        *map(_file_name, subdirs),
        f"{_file_name(stem)}.{output_format}",
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


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
    def __init__(self, data: dict) -> None:
        self.num = self._num(data)
        self.raw = data
        self.recolored = {
            lang: self.recolor(data[lang], data) for lang in LANGUAGES
        }
        self.unnumbered = {
            lang: VERSE_PREFIX.sub("", data[lang]).strip()
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
                    for idx in self.find_all(v, word)
                ],
            )
        ranges = sorted(ranges, key=self.compare_range_color)
        if not ranges:
            yield v
            return
        ranges = self.remove_overlap(ranges)
        assert ranges
        last: int = 0
        for rc in ranges:
            assert rc.start != rc.end
            yield v[last : rc.start]
            yield f'<span style="color:{rc.color}">{v[rc.start:rc.end]}</span>'
            last = rc.end
        yield v[last:]

    def recolor(self, v: str, verse: dict) -> str:
        return "".join(self._recolor_aux(v, verse))

    def _num(self, verse: dict) -> str:
        t: str = verse["English"] or verse["Greek"]
        s: re.Match | None = VERSE_PREFIX.search(t)
        return s.groups()[0] if s else ""

    def compare_range_color(self, rc: RangeColor) -> tuple[int, int]:
        return (rc.start, rc.end)

    def remove_overlap(self, ranges: list[RangeColor]) -> list[RangeColor]:
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

    def find_all(self, s: str, p: str):
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
        except FileNotFoundError:
            utils.warn("Book not found:", book_name)
            return []

        utils.info("Loaded book:", book_name)
        data = json_loads(normalize(t))
        assert isinstance(data, list)
        return data


class Bible:
    def __init__(self) -> None:
        with futures.ThreadPoolExecutor() as executor:
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

    def _build_chapter_body(
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

    def _build_book_body(
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
            yield from self._build_chapter_body(chapter, langs)

    def __href(
        self,
        page: Book | Chapter,
        epub: bool = False,
        from_subdir: bool = False,
    ) -> str:
        id: str = self.__id(page)

        is_book: bool = isinstance(page, Book)
        is_chapter: bool = isinstance(page, Chapter)
        assert is_book ^ is_chapter
        is_html: bool = not epub
        assert is_html ^ epub

        if from_subdir:
            # Subdirectories don't make sense for EPUB.
            assert not epub

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
        href = f"{_file_name(page.book.name)}/{page.num}.html"
        if from_subdir:
            # We want to link from a subdirectory.
            href = "../" + href
        return href

    def __link(
        self,
        page: Book | Chapter,
        epub: bool = False,
        from_subdir: bool = False,
    ) -> str:
        return f'<a href="{self.__href(page, epub, from_subdir)}">{page.num if isinstance(page, Chapter) else page.name}</a>'

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

    def _build_html_doc(
        self,
        title: str,
        body: typing.Iterable[str],
        epub: bool,
        in_subdir: bool = False,
        links: list[str] | None = None,
    ) -> str:
        # If you want to not use links in the subdirectory, pass an empty
        # string. You're not allowed to omit the parameter.
        if links is None:
            assert (
                not in_subdir
            ), "The `links` parameter must be explicitly set in a subdirectory."
            links = []
        return "".join(
            self._build_html_doc_aux(
                title,
                body,
                epub=epub,
                in_subdir=in_subdir,
                links=links,
            ),
        )

    def _build_html_doc_aux(
        self,
        title: str,
        body: typing.Iterable[str],
        epub: bool,
        in_subdir: bool,
        links: list[str] | None,
    ) -> typing.Generator[str]:
        head = html_head(
            title=title,
            epub=epub,
            in_subdir=in_subdir,
            additional_elements=links,
        )
        yield head.str()
        yield "<body>"
        yield from body
        yield "</body>"

    def _build_toc_body(
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
        with futures.ThreadPoolExecutor() as executor:
            for book in bible.books:
                for chapter in book.chapters:
                    executor.submit(
                        self.__write_html_chapter,
                        book,
                        chapter,
                        langs,
                        subdir,
                    )
        toc = self._build_html_doc(
            BOOK_TITLE,
            self._build_toc_body(bible, epub=False),
            epub=False,
        )
        index_path: str = _writing_path("html", subdir, stem=TOC_STEM)
        utils.write(toc, index_path)
        shutil.copy(STYLE_SHEET, os.path.dirname(index_path))
        shutil.copy(SCRIPT, os.path.dirname(index_path))

    def __write_html_chapter(
        self,
        book: Book,
        chapter: Chapter,
        langs: list[str],
        subdir: str,
    ) -> None:

        links: list[str] = []
        next = chapter.next()
        if next:
            links.append(
                f'<link href="{self.__href(next, epub=False, from_subdir=True)}" rel="next">',
            )
        del next
        prev = chapter.prev()
        if prev:
            links.append(
                f'<link href="{self.__href(prev, epub=False, from_subdir=True)}" rel="prev">',
            )
        del prev

        out: str = self._build_html_doc(
            book.name,
            self._build_chapter_body(chapter, langs),
            epub=False,
            in_subdir=True,
            links=links,
        )
        path: str = _writing_path(
            "html",
            subdir,
            book.name,
            stem=chapter.num,
        )
        utils.write(out, path)

    def write_epub(self, bible: Bible, langs: list[str], subdir: str) -> None:
        kindle: epub.EpubBook = epub.EpubBook()
        identifier: str = " ".join(langs)
        kindle.set_identifier(identifier)
        kindle.set_language("cop")
        kindle.set_title("Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ")
        kindle.add_author("Saint Shenouda The Archimandrite Coptic Society")
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
            self._build_html_doc(
                BOOK_TITLE,
                self._build_toc_body(bible, epub=True),
                epub=True,
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
                self._build_html_doc(
                    book.name,
                    self._build_book_body(book, langs, epub=True),
                    epub=True,
                ),
            )
            spine.append(c)
            kindle.add_item(c)
        kindle.spine = spine
        kindle.toc = spine[2:]
        kindle.add_item(epub.EpubNcx())
        kindle.add_item(epub.EpubNav())

        path: str = _writing_path("epub", subdir, stem=identifier)
        epub.write_epub(path, kindle)
        utils.wrote(path)


class sourcer:
    def _process_sources_aux(self, bible: Bible) -> typing.Generator[str]:
        yield html_head(
            title="Sources",
            epub=False,
            in_subdir=True,
            additional_elements=[],
        ).str()
        yield "<body>"
        for book in bible.books:
            try:
                t: str = open(
                    os.path.join(SOURCES_DIR, book.name + "_Sources.json"),
                ).read()
                yield "<h1>" + book.name + "</h1>"
                json_loaded = json_loads(t)
                del t
                assert isinstance(json_loaded, dict)
                data: dict = json_loaded
                del json_loaded
            except FileNotFoundError:
                utils.warn("No sources found for", book.name)
                continue

            for lang in LANGUAGES:
                yield f"<h2>{lang}</h2>"
                yield "<br/>".join(
                    f"  - {line}" for line in data[lang].split("\n") if line
                )
        yield "</body>"

    def process_sources(self, bible: Bible) -> None:
        html = "\n".join(self._process_sources_aux(bible))
        path = _writing_path("html", "", stem="sources")
        utils.write(html, path)


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

    with futures.ProcessPoolExecutor() as executor:
        executor.submit(
            _flow_builder.write_epub,
            bible,
            ["Bohairic", "English"],
            "1",
        )
        executor.submit(
            _table_builder.write_epub,
            bible,
            ["Bohairic", "English"],
            "2",
        )
        executor.submit(_table_builder.write_html, bible, LANGUAGES, "")

    sourcer().process_sources(bible)


if __name__ == "__main__":
    main()
