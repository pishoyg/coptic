import argparse
import json
import os
import re

import json5
import pandas as pd
from bs4 import BeautifulSoup as bs
from ebooklib import epub

# TODO: Export the Bible text to a gsheet.
# TODO: Export the sources to a gdoc.
# TODO: Add txt as an output format.
# import gspread
# from oauth2client.service_account import ServiceAccountCredentials


# TODO: Take the list of languages as input instead of hardcoding it.
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


argparser = argparse.ArgumentParser(description="Process the Coptic Bible data.")

# Input arguments:
# TODO: Use the data from the extracted APK directly, instead of copying the
# APK assets to the `data` subdirectory of this project.
argparser.add_argument(
    "--json",
    type=str,
    help="Path to a JSON file containing the book information.",
    default="bible/stshenouda.org/data/input/bible.json",
)
argparser.add_argument(
    "--input_dir",
    type=str,
    help="Path to the input directory. For each book in the book list, we will"
    " try to find a corresponding ${BOOK_NAME}.json in this directory.",
    default="bible/stshenouda.org/data/raw/",
)
argparser.add_argument(
    "--sources_input_dir",
    type=str,
    help="Path to the input directory. For each book in the book list, we will"
    " try to find a corresponding ${BOOK_NAME}_Sources.json file in this"
    " directory.",
    default="bible/stshenouda.org/data/raw/Sources/",
)

# Ouptut arguments:
argparser.add_argument(
    "--output_dir",
    type=str,
    help="Path to the ouptut directory. For each output format, we will write"
    " the output in a new subdirectory of this directory that is named after"
    " the format",
    default="bible/stshenouda.org/data/output",
)
argparser.add_argument(
    "--parallels",
    type=str,
    action="append",
    help="Produce HTML parallel texts for the following pairs of languages.",
    default=["Bohairic_English"],
    nargs="*",
)
argparser.add_argument(
    "--no_epub",
    type=bool,
    help="If true, do not generate EPUB's.",
    default=False,
)
argparser.add_argument(
    "--cover",
    type=str,
    help="Path to a file containing the cover image for EPUB.",
    default="bible/stshenouda.org/data/img/stauros.jpeg",
)

args = argparser.parse_args()


def writing_path(output_format, file_name):
    assert file_name
    parts = [args.output_dir, output_format, file_name.lower()]
    parts = list(filter(None, parts))
    path = os.path.join(*parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    print("Writing {}".format(path))
    return path


def normalize(txt):
    # The Jinkim is represented by the Combining Overline, not the Combining
    # Conjoining Msacron.
    # TODO: Reconsider the use of the Combining Conjoining Macron on a
    # per-dialect basis. While it's certain that the correct character to use
    # for Bohairic is the Combining Overline, this may not be the case for
    # Sahidic for example.
    return txt.replace(chr(0xFE26), chr(0x0305))


def prettify_html(html):
    soup = bs(html, features="html.parser")
    return soup.prettify()


def json_loads(t):
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        return json5.loads(t)


def recolor(v, verse):
    if "coloredWords" not in verse:
        return v
    for d in verse["coloredWords"]:
        txt = d["word"]
        color = d["light"]
        v = v.replace(txt, '<span style="color:{}">{}</span>'.format(color, txt))
    return v


def chapter_number(chapter):
    return chapter["sectionNameEnglish"] or "1"


def verse_number(verse):
    t = verse["English"] or verse["Greek"]
    s = VERSE_PREFIX.search(t)
    return s.groups()[0] if s else ""


def html_id(book_name, chapter_num=None):
    id = book_name.lower().replace(" ", "_")
    if chapter_num:
        id += str(chapter_num)
    return id


def epub_book_href(book_name):
    return html_id(book_name) + ".xhtml"


class parallel_builder:
    def __init__(self, chapter_beginner, verse_format, chapter_end):
        self.chapter_beginner = chapter_beginner
        self.chapter_end = chapter_end
        self.verse_format = verse_format

    def begin_chapter(self):
        return self.chapter_beginner

    def end_chapter(self):
        return self.chapter_end

    def verse(self, v1, v2):
        return self.verse_format.format(v1, v2)


PARALLEL_BUILDERS = {
    1: parallel_builder(
        chapter_beginner="",
        verse_format="""
        {}
        <br>
        {}
        <br>
        <br>
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


def load_book(book_name):
    try:
        t = open(os.path.join(args.input_dir, book_name + ".json")).read()
    except FileNotFoundError:
        print("Book not found : {}".format(book_name))
        return {}

    print("Loaded book : {}".format(book_name))
    t = normalize(t)
    return json_loads(t)


def write_csv(df):
    path = writing_path("csv", "bible.csv")
    df.to_csv(path, sep="\t", index=False)


def html_head(title=""):
    return """<head>
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
        title=title
    )


def html_h1(title):
    return "<h1>{title}</h1>".format(title=title)


def html_toc(books=[], href=None):
    return "\n".join(
        '<p><a href="{}">{}</a></p>'.format(href(book_name), book_name)
        for book_name in books
    )


def write_html(html, books, html_format):
    for lang in LANGUAGES + args.parallels:
        out = [
            html_head(BOOK_TITLE)
            + html_h1(BOOK_TITLE)
            + html_toc(books, lambda book_name: "#" + html_id(book_name))
        ]
        for book_name in books:
            out.extend(html[lang][book_name])
        path = writing_path(html_format, lang + ".html")
        out = "\n".join(out)
        out = prettify_html(out)
        with open(path, "w") as f:
            f.write(out)


def write_epub(html, books, epub_format):

    for lang in LANGUAGES + args.parallels:
        kindle = epub.EpubBook()
        kindle.set_identifier(lang)
        kindle.set_language("cop")
        kindle.set_title("Ⲡⲓϫⲱⲙ Ⲉⲑⲟⲩⲁⲃ")
        kindle.add_author("Saint Shenouda The Archimandrite Coptic Society")
        cover_file_name = os.path.basename(args.cover)
        cover = epub.EpubCover(file_name=cover_file_name)
        with open(args.cover, "rb") as f:
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
            + "</body>"
        )
        kindle.add_item(toc)

        spine = [cover, toc]

        for book_name in books:
            c = epub.EpubHtml(title=book_name, file_name=epub_book_href(book_name))
            c.set_content(
                html_head(book_name)
                + "<body>"
                + "\n".join(html[lang][book_name])
                + "</body>"
            )
            spine.append(c)
            kindle.add_item(c)
        kindle.spine = spine
        kindle.toc = spine[2:]
        kindle.add_item(epub.EpubNcx())
        kindle.add_item(epub.EpubNav())

        path = writing_path(epub_format, lang + ".epub")
        epub.write_epub(path, kindle)


def process_sources(books):
    out = []
    for book_name in books:
        try:
            t = open(
                os.path.join(args.sources_input_dir, book_name + "_Sources.json")
            ).read()
        except FileNotFoundError:
            print("No sources found for {}".format(book_name))
            continue

        out.append("<h1>" + book_name + "</h1>")
        data = json_loads(t)
        del t

        for lang in LANGUAGES:
            out.append("<h2>" + lang + "</h2>")
            out.append(
                "<br>".join("  - " + line for line in data[lang].split("\n") if line)
            )

    out = prettify_html("\n".join(out))
    path = writing_path("", "sources.html")
    with open(path, "w") as o:
        o.write(out)


def main():
    books = []
    book_to_testament = {}
    book_to_testament_indexed = {}
    book_to_section = {}
    book_to_section_indexed = {}
    book_to_section_indexed_no_testament = {}
    book_to_book_indexed = {}

    with open(args.json) as j:
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
                        testament_idx, testament_name
                    )
                    book_to_section[book_name] = section_name
                    book_to_section_indexed[book_name] = "{}. {}".format(
                        section_idx, section_name
                    )
                    book_to_section_indexed_no_testament[book_name] = "{}. {}".format(
                        str(section_idx_no_testament).zfill(2), section_name
                    )
                    book_to_book_indexed[book_name] = "{}. {}".format(
                        str(book_idx).zfill(2), book_name
                    )

    process_sources(books)

    df = pd.DataFrame()
    # Reduce duplication for the different HTML formats.
    html1 = {lang: {} for lang in LANGUAGES + args.parallels}
    html2 = {lang: {} for lang in LANGUAGES + args.parallels}
    html3 = {lang: {} for lang in LANGUAGES + args.parallels}

    for book_name in books:
        for lang in LANGUAGES + args.parallels:
            h2 = '<h2 id="{}">{}</h2>'.format(html_id(book_name), book_name)
            html1[lang][book_name] = [h2]
            html2[lang][book_name] = [h2]
            html3[lang][book_name] = [h2]

        data = load_book(book_name)
        book_df = pd.DataFrame()
        for lang in LANGUAGES + args.parallels:
            for chapter in data:
                chapter_num = chapter_number(chapter)
                a = '<a href="#{}">{}</a>'.format(
                    html_id(book_name, chapter_num), chapter_num
                )
                html1[lang][book_name].append(a)
                html2[lang][book_name].append(a)
                html3[lang][book_name].append(a)

        parallel_pairs = [p.split("_") for p in args.parallels]
        pb1 = PARALLEL_BUILDERS[1]
        pb2 = PARALLEL_BUILDERS[2]
        pb3 = PARALLEL_BUILDERS[3]
        zfill_len = len(str(len(data)))
        for chapter in data:
            chapter_num = chapter_number(chapter)
            for lang in LANGUAGES + args.parallels:
                h3 = '<h3 id="{}">{}</h3>'.format(
                    html_id(book_name, chapter_num), chapter_num
                )

                html1[lang][book_name].append(h3)
                html2[lang][book_name].append(h3)
                html3[lang][book_name].append(h3)
            for lang in args.parallels:
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
                    d[lang] = VERSE_PREFIX.sub("", verse[lang])
                    html1[lang][book_name].append(recolor(verse[lang], verse))
                    html2[lang][book_name].append(recolor(verse[lang], verse))
                    html3[lang][book_name].append(recolor(verse[lang], verse))
                for lang, pair in zip(args.parallels, parallel_pairs):
                    recolored = [
                        recolor(verse[pair[0]], verse),
                        recolor(verse[pair[1]], verse),
                    ]
                    html1[lang][book_name].append(pb1.verse(*recolored))
                    html2[lang][book_name].append(pb2.verse(*recolored))
                    html3[lang][book_name].append(pb3.verse(*recolored))

                book_df = pd.concat([book_df, pd.DataFrame([d])], ignore_index=True)
            for lang in args.parallels:
                html1[lang][book_name].append(pb1.end_chapter())
                html2[lang][book_name].append(pb2.end_chapter())
                html3[lang][book_name].append(pb3.end_chapter())
        df = pd.concat([df, book_df], ignore_index=True)

    write_csv(df)

    write_html(html1, books, "html")
    write_html(html2, books, "html2")
    write_html(html3, books, "html3")

    if args.no_epub:
        return
    write_epub(html1, books, "epub")
    write_epub(html2, books, "epub2")
    write_epub(html3, books, "epub3")


if __name__ == "__main__":
    main()
