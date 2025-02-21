#!/usr/bin/env python3
import html
import json
import os
import re
import typing

import json5
import pandas as pd
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

BOOK_TITLE: str = "Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ"

VERSE_PREFIX: re.Pattern = re.compile(r"^\(([^)]+)\)")

JSON: str = "bible/stshenouda.org/data/input/bible.json"
INPUT_DIR: str = "bible/stshenouda.org/data/raw/"
SOURCES_DIR: str = "bible/stshenouda.org/data/raw/Sources/"
OUTPUT_DIR: str = "bible/stshenouda.org/data/output"
PARALLELS: list[str] = ["Bohairic_English"]
COVER: str = "bible/stshenouda.org/data/img/stauros.jpeg"

# TODO: Move styling to a CSS sheet.
HTML_HEAD_FMT = """<!DOCTYPE html>
<head>
  <title>{title}</title>
  <style>
    .a {{
      color: blue;
    }}
    .column {{
        float: left;
        width: 50%;
    }}
    .row:after {{
        content: "";
        display: table;
        clear: both;
    }}
  </style>
</head>"""


def file_name(book_name: str) -> str:
    return book_name.lower().replace(" ", "_").replace(".", "_")


def writing_path(output_format: str, *subdirs: str, stem: str) -> str:
    assert output_format
    assert stem
    parts: list[str] = [
        OUTPUT_DIR,
        output_format,
        *subdirs,
        f"{stem}.{output_format}",
    ]
    parts = [p.lower() for p in parts]
    path: str = os.path.join(*parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def normalize(txt: str) -> str:
    # The Jinkim is represented by the Combining Overline, not the Combining
    # Conjoining Msacron.
    # TODO: Reconsider the use of the Combining Conjoining Macron on a
    # per-dialect basis. While it's certain that the correct character to use
    # for Bohairic is the Combining Overline, this may not be the case for
    # Sahidic for example.
    return txt.replace(chr(0xFE26), chr(0x0305))


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


def compare_range_color(rc: RangeColor) -> tuple[int, int]:
    return (rc.start, rc.end)


def remove_overlap(ranges: list[RangeColor]) -> list[RangeColor]:
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


def find_all(s: str, p: str):
    i: int = s.find(p)
    while i != -1:
        yield i
        i = s.find(p, i + 1)


def _recolor_aux(v: str, verse: dict) -> typing.Generator[str]:
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
                for idx in find_all(v, word)
            ],
        )
    ranges = sorted(ranges, key=compare_range_color)
    if not ranges:
        yield v
        return
    ranges = remove_overlap(ranges)
    assert ranges
    last: int = 0
    for rc in ranges:
        assert rc.start != rc.end
        yield v[last : rc.start]
        yield f'<span style="color:{rc.color}">{v[rc.start:rc.end]}</span>'
        last = rc.end
    yield v[last:]


def recolor(v: str, verse: dict) -> str:
    return "".join(_recolor_aux(v, verse))


def chapter_number(chapter: dict) -> str:
    return chapter["sectionNameEnglish"] or "1"


def verse_number(verse: dict) -> str:
    t: str = verse["English"] or verse["Greek"]
    s: re.Match | None = VERSE_PREFIX.search(t)
    return s.groups()[0] if s else ""


class html_builder:
    def __init__(
        self,
        html_subdir: str | None,
        epub_subdir: str | None,
        chapter_beginner: str,
        verse_format: str,
        chapter_end: str,
    ) -> None:
        # Output directories.
        self._html_subdir: str | None = html_subdir
        self._epub_subdir: str | None = epub_subdir

        # Format.
        self._chapter_beginner: str = chapter_beginner
        self._verse_format: str = verse_format
        self._chapter_end: str = chapter_end

        # Progress.
        self._cur_book: str = ""
        self._cur_book_content: list[str] = []

        # Content.
        self._books: dict[str, str] = {}
        self._book_names: list[str] = []

    def assert_book_in_progress(self) -> None:
        assert self._cur_book

    def assert_no_book_in_progress(self) -> None:
        assert not self._cur_book
        assert not self._cur_book_content

    def start(self, parallel: bool) -> None:
        self._parallel = parallel

    def start_book(self, name):
        self.assert_no_book_in_progress()
        assert name not in self._books
        self._cur_book = name
        self._book_names.append(name)
        self.__extend(f'<h2 id="{self.__html_id(name)}">{name}</h2>')

    def add_chapter_anchor(self, chapter_num: str) -> None:
        self.assert_book_in_progress()
        self.__extend(
            f'<a href="#{self.__html_id(self._cur_book, chapter_num)}">{chapter_num}</a>',
        )

    def begin_chapter(self, chapter_num: str) -> None:
        assert self._cur_book
        self.__extend(
            f'<h3 id="{self.__html_id(self._cur_book, chapter_num)}">{chapter_num}</h3>',
        )
        if not self._parallel:
            return
        self.__extend(self._chapter_beginner)

    def verse(self, v1: str, v2: str | None = None) -> None:
        if not self._parallel:
            assert not v2
            self.__extend(v1)
            return
        self.__extend(self._verse_format.format(v1, v2))

    def end_chapter(self) -> None:
        if not self._parallel:
            return
        self.__extend(self._chapter_end)

    def end_book(self):
        self._books[self._cur_book] = "\n".join(self._cur_book_content)
        self._cur_book_content.clear()
        self._cur_book = ""

    def __clear(self):
        self.assert_no_book_in_progress()
        self._books.clear()
        self._book_names.clear()

    def __extend(self, *args: str):
        assert self._cur_book
        self._cur_book_content.extend(args)

    def __html_id(self, book_name: str, chapter_num: str | None = None) -> str:
        id: str = book_name.lower().replace(" ", "_")
        if chapter_num:
            id += str(chapter_num)
        return id

    def __epub_book_href(self, book_name: str) -> str:
        return self.__html_id(book_name) + ".xhtml"

    def __write_html(self, lang: str) -> None:
        assert self._html_subdir is not None
        for book_name, book_content in self._books.items():
            out: str = "\n".join(
                [
                    HTML_HEAD_FMT.format(title=book_name),
                    "<body>",
                    book_content,
                    "</body>",
                ],
            )
            path: str = writing_path(
                "html",
                self._html_subdir,
                lang,
                stem=file_name(book_name),
            )
            utils.write(out, path)

    def __write_epub(self, lang: str) -> None:
        assert self._epub_subdir is not None
        kindle: epub.EpubBook = epub.EpubBook()
        kindle.set_identifier(lang)
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
            HTML_HEAD_FMT.format(title=BOOK_TITLE)
            + "<body>"
            + f"<h1>{BOOK_TITLE}</h1>"
            + "\n".join(
                f'<p><a href="{self.__epub_book_href(book_name)}">{book_name}</a></p>'
                for book_name in self._book_names
            )
            + "</body>",
        )
        kindle.add_item(toc)

        spine = [cover, toc]

        for book_name in self._book_names:
            c: epub.EpubHtml = epub.EpubHtml(
                title=book_name,
                file_name=self.__epub_book_href(book_name),
            )
            c.set_content(
                HTML_HEAD_FMT.format(title=book_name)
                + "<body>"
                + self._books[book_name]
                + "</body>",
            )
            spine.append(c)
            kindle.add_item(c)
        kindle.spine = spine
        kindle.toc = spine[2:]
        kindle.add_item(epub.EpubNcx())
        kindle.add_item(epub.EpubNav())

        path: str = writing_path("epub", self._epub_subdir, stem=lang)
        epub.write_epub(path, kindle)
        utils.wrote(path)

    def write_and_clear(self, lang: str):
        assert not self._cur_book
        assert not self._cur_book_content
        assert self._books
        if self._html_subdir is not None:
            self.__write_html(lang)
        if self._epub_subdir is not None:
            self.__write_epub(lang)
        self.__clear()


class multi_html_builder:
    def __init__(self, *builders: html_builder) -> None:
        self.builders = builders
        utils.verify_unique(
            [
                b._html_subdir
                for b in self.builders
                if b._html_subdir is not None
            ],
            "It looks like HTML outputs will override one another!",
        )
        utils.verify_unique(
            [
                b._epub_subdir
                for b in self.builders
                if b._epub_subdir is not None
            ],
            "It looks like EPUB outputs will override one another!",
        )

    def start(self, *args):
        for builder in self.builders:
            builder.start(*args)

    def start_book(self, *args):
        for builder in self.builders:
            builder.start_book(*args)

    def add_chapter_anchor(self, *args) -> None:
        for builder in self.builders:
            builder.add_chapter_anchor(*args)

    def begin_chapter(self, *args) -> None:
        for builder in self.builders:
            builder.begin_chapter(*args)

    def verse(self, *args) -> None:
        for builder in self.builders:
            builder.verse(*args)

    def end_chapter(self) -> None:
        for builder in self.builders:
            builder.end_chapter()

    def end_book(self):
        for builder in self.builders:
            builder.end_book()

    def write_and_clear(self, *args):
        for builder in self.builders:
            builder.write_and_clear(*args)


HTMLS: multi_html_builder = multi_html_builder(
    html_builder(
        html_subdir=None,
        epub_subdir="1",
        chapter_beginner="",
        verse_format="{}" "<br/>" "{}" "<br/>" "<br/>",
        chapter_end="",
    ),
    html_builder(
        html_subdir="",
        epub_subdir="2",
        chapter_beginner="<table>",
        verse_format="<tr>" "<td>{}</td>" "<td>{}</td>" "</tr>",
        chapter_end="</table>",
    ),
    html_builder(
        html_subdir=None,
        epub_subdir="3",
        chapter_beginner="",
        verse_format='<div class="row">'
        '<div class="column">{}</div>'
        '<div class="column">{}</div>'
        "</div>",
        chapter_end="",
    ),
)


class book_loader:
    def __init__(self):
        self.cache: dict[str, dict | list] = {}

    def load(self, book_name: str) -> dict | list:
        if book_name in self.cache:
            return self.cache[book_name]
        try:
            t: str = open(os.path.join(INPUT_DIR, book_name + ".json")).read()
        except FileNotFoundError:
            utils.warn("Book not found:", book_name)
            self.cache[book_name] = {}
            return {}

        utils.info("Loaded book:", book_name)
        t = normalize(t)
        self.cache[book_name] = json_loads(t)
        return self.cache[book_name]


def _process_sources_aux(books: list[str]) -> typing.Generator[str]:
    yield HTML_HEAD_FMT.format(title="Sources")
    yield "<body>"
    for book_name in books:
        try:
            t: str = open(
                os.path.join(SOURCES_DIR, book_name + "_Sources.json"),
            ).read()
            yield "<h1>" + book_name + "</h1>"
            json_loaded = json_loads(t)
            del t
            assert isinstance(json_loaded, dict)
            data: dict = json_loaded
            del json_loaded
        except FileNotFoundError:
            utils.warn("No sources found for", book_name)
            continue

        for lang in LANGUAGES:
            yield f"<h2>{lang}</h2>"
            yield "<br/>".join(
                f"  - {line}" for line in data[lang].split("\n") if line
            )
    yield "</body>"


def process_sources(books: list[str]) -> None:
    html = "\n".join(_process_sources_aux(books))
    path = writing_path("html", "", stem="sources")
    utils.write(html, path)


def split(lang_pair) -> tuple[str, str] | None:
    if lang_pair in LANGUAGES:
        assert lang_pair not in PARALLELS
        return None
    assert lang_pair in PARALLELS
    a, b = lang_pair.split("_")
    return a, b


def main() -> None:
    books: list[str] = []
    book_to_testament: dict[str, str] = {}
    book_to_testament_indexed: dict[str, str] = {}
    book_to_section: dict[str, str] = {}
    book_to_section_indexed: dict[str, str] = {}
    book_to_section_indexed_no_testament: dict[str, str] = {}
    book_to_book_indexed: dict[str, str] = {}

    with open(JSON) as j:
        bible = json.loads(j.read())
        testament_idx = 0
        section_idx_no_testament = 0
        for testament_name, testament in bible.items():
            testament_idx += 1
            section_idx = 0
            for section_name, section in testament.items():
                section_idx_no_testament += 1
                section_idx += 1
                book_idx = 0
                for book_name in section:
                    book_idx += 1
                    books.append(book_name)
                    book_to_testament[book_name] = testament_name
                    book_to_testament_indexed[book_name] = (
                        f"{testament_idx}. {testament_name}"
                    )
                    book_to_section[book_name] = section_name
                    book_to_section_indexed[book_name] = (
                        f"{section_idx}. {section_name}"
                    )
                    book_to_section_indexed_no_testament[book_name] = (
                        f"{str(section_idx_no_testament).zfill(2)}. {section_name}"
                    )
                    book_to_book_indexed[book_name] = (
                        f"{str(book_idx).zfill(2)}. {book_name}"
                    )

    process_sources(books)

    df: pd.DataFrame = pd.DataFrame()
    loader = book_loader()
    for lang in LANGUAGES + PARALLELS:
        pair: tuple[str, str] | None = split(lang)
        HTMLS.start(bool(pair))
        for book_name in books:
            HTMLS.start_book(book_name)

            data = loader.load(book_name)
            book_df = pd.DataFrame()
            for chapter in data:
                HTMLS.add_chapter_anchor(chapter_number(chapter))

            zfill_len = len(str(len(data)))
            for chapter in data:
                chapter_num = chapter_number(chapter)
                HTMLS.begin_chapter(chapter_num)
                for verse in chapter["data"]:
                    verse_num = verse_number(verse)
                    d = {
                        "book": book_name,
                        "chapter": chapter_num,
                        "chapter-zfilled": str(chapter_num).zfill(zfill_len),
                        "verse": verse_num,
                        "testament": book_to_testament[book_name],
                        "testament-indexed": book_to_testament_indexed[
                            book_name
                        ],
                        "section": book_to_section[book_name],
                        "section-indexed": book_to_section_indexed[book_name],
                        "section-indexed-no-testament": book_to_section_indexed_no_testament[
                            book_name
                        ],
                        "book-indexed": book_to_book_indexed[book_name],
                    }
                    book_df = pd.concat(
                        [book_df, pd.DataFrame([d])],
                        ignore_index=True,
                    )
                    if pair:
                        HTMLS.verse(
                            recolor(verse[pair[0]], verse),
                            recolor(verse[pair[1]], verse),
                        )
                    else:
                        HTMLS.verse(recolor(verse[lang], verse))
                        d[lang] = VERSE_PREFIX.sub("", verse[lang]).strip()

                HTMLS.end_chapter()
            df = pd.concat([df, book_df], ignore_index=True)
            HTMLS.end_book()
        HTMLS.write_and_clear(lang)


if __name__ == "__main__":
    main()
