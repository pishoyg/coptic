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

LANGUAGES = [
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


BOOK_TITLE = "Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ"


VERSE_PREFIX = re.compile(r"^\(([^)]+)\)")

JSON = "bible/stshenouda.org/data/input/bible.json"
INPUT_DIR = "bible/stshenouda.org/data/raw/"
SOURCES_DIR = "bible/stshenouda.org/data/raw/Sources/"
OUTPUT_DIR = "bible/stshenouda.org/data/output"
PARALLELS = ["Bohairic_English"]
COVER = "bible/stshenouda.org/data/img/stauros.jpeg"


def file_name(book_name: str) -> str:
    return book_name.lower().replace(" ", "_").replace(".", "_")


def writing_path(output_format: str, subdir: str, stem: str) -> str:
    assert output_format
    assert stem
    output_format = output_format.lower()
    subdir = subdir.lower()
    stem = stem.lower()
    parts = [OUTPUT_DIR, output_format, subdir, f"{stem}.{output_format}"]
    path = os.path.join(*filter(None, parts))
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
        self.start = start
        self.end = end
        self.color = color

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
        prev = out[-1]
        if not cur.overlap(prev):
            # No overlap.
            out.append(cur)
            continue
        out[-1] = cur.winner(prev)
    return out


def find_all(s: str, p: str):
    i = s.find(p)
    while i != -1:
        yield i
        i = s.find(p, i + 1)


def recolor(v: str, verse: dict) -> str:
    v = html.escape(v)
    if "coloredWords" not in verse:
        return v
    ranges: list[RangeColor] = []
    for d in verse["coloredWords"]:
        word, color = d["word"], d["light"]
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
        return v
    ranges = remove_overlap(ranges)
    assert ranges
    out = ""
    last = 0
    for rc in ranges:
        assert rc.start != rc.end
        out += v[last : rc.start]
        out += f'<span style="color:{rc.color}">{v[rc.start:rc.end]}</span>'
        last = rc.end
    out = out + v[last:]
    return out


def chapter_number(chapter: dict) -> str:
    return chapter["sectionNameEnglish"] or "1"


def verse_number(verse: dict) -> str:
    t = verse["English"] or verse["Greek"]
    s = VERSE_PREFIX.search(t)
    return s.groups()[0] if s else ""


def html_id(book_name: str, chapter_num: typing.Optional[str] = None) -> str:
    id = book_name.lower().replace(" ", "_")
    if chapter_num:
        id += str(chapter_num)
    return id


def epub_book_href(book_name: str) -> str:
    return html_id(book_name) + ".xhtml"


class parallel_builder:
    def __init__(
        self,
        chapter_beginner: str,
        verse_format: str,
        chapter_end: str,
    ) -> None:
        self.chapter_beginner: str = chapter_beginner
        self.chapter_end: str = chapter_end
        self.verse_format: str = verse_format

    def begin_chapter(self) -> str:
        return self.chapter_beginner

    def end_chapter(self) -> str:
        return self.chapter_end

    def verse(self, v1: str, v2: str) -> str:
        return self.verse_format.format(v1, v2)


PARALLEL_BUILDERS: dict[int, parallel_builder] = {
    1: parallel_builder(
        chapter_beginner="",
        verse_format="""
        {}
        <br/>
        {}
        <br/>
        <br/>
        """,
        chapter_end="",
    ),
    2: parallel_builder(
        chapter_beginner="<table>",
        verse_format="""
        <tr>
            <td>{}</td>
            <td>{}</td>
        </tr>""",
        chapter_end="</table>",
    ),
    3: parallel_builder(
        chapter_beginner="",
        verse_format="""
        <div class="row">
            <div class="column">{}</div>
            <div class="column">{}</div>
        </div>""",
        chapter_end="",
    ),
}


def load_book(book_name: str) -> dict | list:
    try:
        t = open(os.path.join(INPUT_DIR, book_name + ".json")).read()
    except FileNotFoundError:
        utils.warn("Book not found:", book_name)
        return {}

    utils.info("Loaded book:", book_name)
    t = normalize(t)
    return json_loads(t)


def html_head(title: str = "") -> str:
    return """<!DOCTYPE html>
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
</head>""".format(
        title=title,
    )


def html_body(body: str = "") -> str:
    return f"<body>{body}</body>"


def html_h1(title: str) -> str:
    return "<h1>{title}</h1>".format(title=title)


def html_toc(books: list[str], href: typing.Callable) -> str:
    return "\n".join(
        '<p><a href="{}">{}</a></p>'.format(href(book_name), book_name)
        for book_name in books
    )


def write_html(html: dict, books: list[str]) -> None:
    for lang in LANGUAGES + PARALLELS:
        for book_name in books:
            out = html_head(book_name) + html_body(
                "\n".join(html[lang][book_name]),
            )
            path = writing_path("html", lang, file_name(book_name))
            utils.write(out, path)


def write_epub(html: dict, books: list, subdir: str) -> None:
    for lang in LANGUAGES + PARALLELS:
        kindle = epub.EpubBook()
        kindle.set_identifier(lang)
        kindle.set_language("cop")
        kindle.set_title("Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ")
        kindle.add_author("Saint Shenouda The Archimandrite Coptic Society")
        cover_file_name = os.path.basename(COVER)
        cover = epub.EpubCover(file_name=cover_file_name)
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

        toc = epub.EpubHtml(title="Table of Contents", file_name="toc.xhtml")
        toc.set_content(
            html_head(BOOK_TITLE)
            + "<body>"
            + html_h1(BOOK_TITLE)
            + html_toc(books, epub_book_href)
            + "</body>",
        )
        kindle.add_item(toc)

        spine = [cover, toc]

        for book_name in books:
            c = epub.EpubHtml(
                title=book_name,
                file_name=epub_book_href(book_name),
            )
            c.set_content(
                html_head(book_name)
                + "<body>"
                + "\n".join(html[lang][book_name])
                + "</body>",
            )
            spine.append(c)
            kindle.add_item(c)
        kindle.spine = spine
        kindle.toc = spine[2:]
        kindle.add_item(epub.EpubNcx())
        kindle.add_item(epub.EpubNav())

        path = writing_path("epub", subdir, lang)
        epub.write_epub(path, kindle)
        utils.wrote(path)


def process_sources(books: list[str]) -> None:
    body_parts = []
    for book_name in books:
        try:
            t = open(
                os.path.join(SOURCES_DIR, book_name + "_Sources.json"),
            ).read()
        except FileNotFoundError:
            utils.warn("No sources found for", book_name)
            continue

        body_parts.append("<h1>" + book_name + "</h1>")
        json_loaded = json_loads(t)
        del t
        assert isinstance(json_loaded, dict)
        data: dict = json_loaded
        del json_loaded

        for lang in LANGUAGES:
            body_parts.append("<h2>" + lang + "</h2>")
            body_parts.append(
                "<br/>".join(
                    "  - " + line for line in data[lang].split("\n") if line
                ),
            )

    html = html_head(title="Sources") + html_body("\n".join(body_parts))
    path = writing_path("html", "", "sources")
    utils.write(html, path)


def _per_lang() -> dict[str, dict[str, list[str]]]:
    return {lang: {} for lang in LANGUAGES + PARALLELS}


def main() -> None:
    books = []
    book_to_testament = {}
    book_to_testament_indexed = {}
    book_to_section = {}
    book_to_section_indexed = {}
    book_to_section_indexed_no_testament = {}
    book_to_book_indexed = {}

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
                    book_to_testament_indexed[book_name] = "{}. {}".format(
                        testament_idx,
                        testament_name,
                    )
                    book_to_section[book_name] = section_name
                    book_to_section_indexed[book_name] = "{}. {}".format(
                        section_idx,
                        section_name,
                    )
                    book_to_section_indexed_no_testament[book_name] = (
                        "{}. {}".format(
                            str(section_idx_no_testament).zfill(2),
                            section_name,
                        )
                    )
                    book_to_book_indexed[book_name] = "{}. {}".format(
                        str(book_idx).zfill(2),
                        book_name,
                    )

    process_sources(books)

    df = pd.DataFrame()
    # Reduce duplication for the different HTML formats.
    html1 = _per_lang()
    html2 = _per_lang()
    html3 = _per_lang()

    for book_name in books:
        for lang in LANGUAGES + PARALLELS:
            h2 = '<h2 id="{}">{}</h2>'.format(html_id(book_name), book_name)
            html1[lang][book_name] = [h2]
            html2[lang][book_name] = [h2]
            html3[lang][book_name] = [h2]

        data = load_book(book_name)
        book_df = pd.DataFrame()
        for lang in LANGUAGES + PARALLELS:
            for chapter in data:
                chapter_num = chapter_number(chapter)
                a = '<a href="#{}">{}</a>'.format(
                    html_id(book_name, chapter_num),
                    chapter_num,
                )
                html1[lang][book_name].append(a)
                html2[lang][book_name].append(a)
                html3[lang][book_name].append(a)

        parallel_pairs = [p.split("_") for p in PARALLELS]
        pb1 = PARALLEL_BUILDERS[1]
        pb2 = PARALLEL_BUILDERS[2]
        pb3 = PARALLEL_BUILDERS[3]
        zfill_len = len(str(len(data)))
        for chapter in data:
            chapter_num = chapter_number(chapter)
            for lang in LANGUAGES + PARALLELS:
                h3 = '<h3 id="{}">{}</h3>'.format(
                    html_id(book_name, chapter_num),
                    chapter_num,
                )

                html1[lang][book_name].append(h3)
                html2[lang][book_name].append(h3)
                html3[lang][book_name].append(h3)
            for lang in PARALLELS:
                html1[lang][book_name].append(pb1.begin_chapter())
                html2[lang][book_name].append(pb2.begin_chapter())
                html3[lang][book_name].append(pb3.begin_chapter())
            for verse in chapter["data"]:
                verse_num = verse_number(verse)
                d = {
                    "book": book_name,
                    "chapter": chapter_num,
                    "chapter-zfilled": str(chapter_num).zfill(zfill_len),
                    "verse": verse_num,
                    "testament": book_to_testament[book_name],
                    "testament-indexed": book_to_testament_indexed[book_name],
                    "section": book_to_section[book_name],
                    "section-indexed": book_to_section_indexed[book_name],
                    "section-indexed-no-testament": book_to_section_indexed_no_testament[
                        book_name
                    ],
                    "book-indexed": book_to_book_indexed[book_name],
                }
                for lang in LANGUAGES:
                    d[lang] = VERSE_PREFIX.sub("", verse[lang]).strip()
                    html1[lang][book_name].append(recolor(verse[lang], verse))
                    html2[lang][book_name].append(recolor(verse[lang], verse))
                    html3[lang][book_name].append(recolor(verse[lang], verse))
                for lang, pair in zip(PARALLELS, parallel_pairs):
                    recolored = [
                        recolor(verse[pair[0]], verse),
                        recolor(verse[pair[1]], verse),
                    ]
                    html1[lang][book_name].append(pb1.verse(*recolored))
                    html2[lang][book_name].append(pb2.verse(*recolored))
                    html3[lang][book_name].append(pb3.verse(*recolored))

                book_df = pd.concat(
                    [book_df, pd.DataFrame([d])],
                    ignore_index=True,
                )
            for lang in PARALLELS:
                html1[lang][book_name].append(pb1.end_chapter())
                html2[lang][book_name].append(pb2.end_chapter())
                html3[lang][book_name].append(pb3.end_chapter())
        df = pd.concat([df, book_df], ignore_index=True)

    write_html(html2, books)

    write_epub(html1, books, "1")
    write_epub(html2, books, "2")
    write_epub(html3, books, "3")


if __name__ == "__main__":
    main()
