import json
import os
import re
import typing
from collections import defaultdict

import deck
import field

import utils
import web.xooxle as xooxle

EMAIL = "remnqymi@gmail.com"
DESCRIPTION = f"https://remnqymi.com\n{EMAIL}"

KELLIA_PREFIX = "https://coptic-dictionary.org/entry.cgi?tla="

DICTIONARY_PAGE_RE = re.compile("([0-9]+(a|b))")
COPTIC_WORD_RE = re.compile("([Ⲁ-ⲱϢ-ϯⳈⳉ]+)")
GREEK_WORD_RE = re.compile("([Α-Ωα-ω]+)")

DICT_WIDTH = "1000px"

ROOTS = "dictionary/marcion.sourceforge.net/data/output/tsv/roots.tsv"
ROOT_APPENDICES = (
    "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv"
)


def crum(
    deck_name: str,
    deck_id: int,
    dialect_cols: list[str],
    force_front: bool = True,
) -> deck.deck:
    def roots_col(
        col_name: str,
        line_br: bool = False,
        force: bool = True,
    ) -> field.tsv:
        return field.tsv(
            ROOTS,
            col_name,
            line_br=line_br,
            force=force,
        )

    def root_appendix(
        col_name: str,
        line_br: bool = False,
        force: bool = True,
    ) -> field.tsv:
        return field.tsv(
            ROOT_APPENDICES,
            col_name,
            line_br=line_br,
            force=force,
        )

    # TODO: (#75) Add a similar alignment check for the derivations keys and
    # derivations appendices keys, once we start using them.
    assert roots_col("key")._content == root_appendix("key")._content

    def add_lookup_classes(text: str) -> str:
        return greek(cdo(text))

    # TODO: Insert the tags in the Crum pipeline.
    # This replaces all Coptic words, regardless of whether they
    # represent plain text. Coptic text that occurs inside a tag (for example
    # as a tag property) would still get wrapped inside this <span> tag.
    def cdo(text: str) -> str:
        return COPTIC_WORD_RE.sub(
            r'<span class="coptic">\1</span>',
            text,
        )

    # TODO: Insert tags in the Crum pipeline.
    # This replaces all Greek words, regardless of whether they
    # represent plain text. Greek text that occurs inside a tag (for example
    # as a tag property) would still acquire this tag.
    def greek(text: str) -> str:
        return GREEK_WORD_RE.sub(
            r'<span class="greek">\1</span>',
            text,
        )

    def create_front() -> field.field:
        if len(dialect_cols) == 1:
            return roots_col(dialect_cols[0], line_br=True, force=False)

        def dialect(col: str) -> field.field:
            return field.aon(
                '<span class="left">',
                "(",
                "<b>",
                col[col.find("-") + 1 :],
                "</b>",
                ")",
                "</span>",
                "<br/>",
                roots_col(col, line_br=True, force=False),
            )

        return field.jne("<br/>", *[dialect(col) for col in dialect_cols])

    explanatory_images = _dir_lister(
        "dictionary/marcion.sourceforge.net/data/img-300",
        lambda file: file[: file.find("-")],
    )

    def _explanatory_alt(path: str) -> str:
        assert (
            os.path.dirname(path)
            == "dictionary/marcion.sourceforge.net/data/img-300"
        )
        stem = utils.stem(path)
        source_path = os.path.join(
            "dictionary/marcion.sourceforge.net/data/img-sources",
            stem + ".txt",
        )
        sources: list[str] = [
            line.strip() for line in utils.read(source_path).split("\n")
        ]
        sources = [line for line in sources if line.startswith("http")]
        return sources[0] if sources else stem

    mother = _mother(roots_col)
    step_mother = _step_mother()
    image_sensor = _sensor(
        roots_col("key")._content,
        root_appendix("senses", force=False)._content,
    )
    pronunciations = {
        col: _dir_lister(
            f"dictionary/marcion.sourceforge.net/data/snd-pishoy/{col}/",
            lambda file: file[: file.find(".")],
        )
        for col in dialect_cols
    }
    return deck.deck(
        # NOTE: The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=DESCRIPTION,
        css=utils.read("docs/style.css"),
        javascript_path="docs/crum/crum.js",
        # NOTE: The key is a protected field. Do not change unless you know what
        # you're doing.
        key=roots_col("key"),
        front=field.apl(
            add_lookup_classes,
            field.aon(
                # Header.
                field.cat(
                    # Open the table.
                    '<table id="header" class="header">',
                    "<tr>",
                    # Home
                    '<td><a class="navigate" href="../">home</a></td>',
                    # Contact
                    "<td>"
                    f'<a class="contact" href="mailto:{EMAIL}">'
                    "email"
                    "</a>"
                    "</td>",
                    # Prev
                    "<td>",
                    field.fmt(
                        f'<a class="navigate" href="{{key_prev}}.html">'
                        "prev"
                        "</a>",
                        {"key_prev": roots_col("key-prev", force=False)},
                        force=False,
                        aon=True,
                    ),
                    "</td>",
                    # Key.
                    "<td>",
                    field.fmt(
                        f'<a class="navigate" href="{{key}}.html">'
                        "{key}"
                        "</a>",
                        {
                            "key": roots_col("key"),
                        },
                    ),
                    "</td>",
                    # Next
                    "<td>",
                    field.fmt(
                        f'<a class="navigate" href="{{key_next}}.html">'
                        "next"
                        "</a>",
                        {"key_next": roots_col("key-next", force=False)},
                        force=False,
                        aon=True,
                    ),
                    "</td>",
                    # Reset.
                    "<td>",
                    '<span class="reset">reset</span>',
                    "</td>",
                    # Dev.
                    "<td>",
                    '<span class="developer">dev</span>',
                    "</td>",
                    # Close the table.
                    "</tr>",
                    "</table>",
                ),
                "<hr/>",
                # Actual front.
                '<div id="pretty" class="pretty">',
                create_front(),
                "</div>",
            ),
        ),
        back=field.apl(
            add_lookup_classes,
            field.cat(
                field.cat(
                    '<div id="root-type-meaning" class="root-type-meaning">',
                    # Type.
                    field.cat(
                        # TODO: (#233) For consistency, this should be renamed to
                        # "type", and the existing "type" class that is used
                        # elsewhere should be renamed to something else.
                        # We have had the convention to use an unqualified class
                        # name to refer to elements that relate to the root.
                        '<div id="root-type" class="root-type">',
                        "(<b>",
                        roots_col("type-parsed"),
                        "</b>)",
                        "</div>",
                    ),
                    # Category.
                    field.aon(
                        '<div id="categories" class="categories">',
                        root_appendix("categories", force=False),
                        "</div>",
                    ),
                    # Meaning.
                    field.aon(
                        '<div id="meaning" class="meaning">',
                        roots_col("en-parsed", line_br=True, force=False),
                        "</div>",
                    ),
                    "</div>",
                ),
                # Dictionary pages.
                field.aon(
                    '<div id="dictionary" class="dictionary">',
                    '<span class="right">',
                    field.cat(
                        field.aon(
                            '<b><a href="#crum" class="crum hover-link">Crum</a>: </b>',
                            field.fmt(
                                '<span class="crum-page">{crum}</span>',
                                {"crum": roots_col("crum", force=False)},
                                force=False,
                                aon=True,
                            ),
                        ),
                        field.aon(
                            "<br/>",
                            # Abd-El-Nour is Dawoud's actual last name! We continue
                            # to refer to him as Dawoud throughout the repo.
                            '<b><a href="#dawoud" class="dawoud hover-link">Abd-El-Nour</a>: </b>',
                            field.apl(
                                lambda pages: DICTIONARY_PAGE_RE.sub(
                                    r'<span class="dawoud-page">\1</span>',
                                    pages.replace(",", ", "),
                                ),
                                root_appendix("dawoud-pages", force=False),
                            ),
                        ),
                    ),
                    "</span>",
                    "</div>",
                    "<br>",
                ),
                # Images.
                field.xor(
                    field.aon(
                        '<div id="images" class="images">',
                        field.img(
                            keys=roots_col("key"),
                            # Although the same result can be obtained using
                            # `glob.glob` on each image key, we cache the paths
                            # because this significantly reduces the running time.
                            get_paths=explanatory_images.get,
                            fmt_args=lambda path: {
                                "caption": image_sensor.get_caption(path),
                                "id": "explanatory" + utils.stem(path),
                                "class": "explanatory",
                                "alt": _explanatory_alt(path),
                            },
                            force=False,
                            line_br=False,
                        ),
                        "</div>",
                    ),
                    "<br/>",
                ),
                # Editor's notes.
                field.aon(
                    '<div id="notes" class="notes">',
                    "<i>Editor's Note: </i>",
                    root_appendix("notes", line_br=True, force=False),
                    "</div>",
                ),
                # Senses.
                field.aon(
                    '<div id="senses" class="senses">',
                    field.apl(
                        senses_json_to_html,
                        root_appendix("senses", force=False),
                    ),
                    "</div>",
                ),
                # Horizontal line.
                "<hr/>",
                # Full entry.
                field.cat(
                    '<div id="marcion" class="marcion">',
                    roots_col("word-parsed-classify", line_br=True),
                    "</div>",
                ),
                # Derivations.
                roots_col(
                    "derivations-table",
                    line_br=True,
                    force=False,
                ),
                # Sisters.
                field.aon(
                    "<hr/>",
                    '<div id="sisters" class="sisters">',
                    field.jne(
                        "<br/>",
                        field.aon(
                            "<i>See also: </i>",
                            '<table class="sisters-table">',
                            field.apl(
                                mother.gather,
                                roots_col("key"),
                                root_appendix("sisters", force=False),
                            ),
                            "</table>",
                        ),
                        field.aon(
                            "<i>Greek: </i>",
                            '<table class="sisters-table">',
                            field.apl(
                                step_mother.gather,
                                roots_col("key"),
                                root_appendix(
                                    "TLA-sisters",
                                    force=False,
                                ),
                            ),
                            "</table>",
                        ),
                        field.aon(
                            "<i>Opposite: </i>",
                            '<table class="sisters-table">',
                            field.apl(
                                mother.gather,
                                roots_col("key"),
                                root_appendix("antonyms", force=False),
                            ),
                            "</table>",
                        ),
                        field.aon(
                            "<i>Homonyms: </i>",
                            '<table class="sisters-table">',
                            field.apl(
                                mother.gather,
                                roots_col("key"),
                                root_appendix("homonyms", force=False),
                            ),
                            "</table>",
                        ),
                    ),
                    "</div>",
                ),
                # Crum's pages.
                field.aon(
                    "<hr/>",
                    '<div id="crum" class="crum dictionary">',
                    '<span class="right">',
                    field.aon(
                        '<b><a href="#crum" class="crum hover-link">Crum</a>: </b>',
                        field.apl(
                            lambda pages: DICTIONARY_PAGE_RE.sub(
                                r'<span class="crum-page">\1</span>',
                                pages.replace(",", ", "),
                            ),
                            field.apl(
                                _crum_page_range,
                                root_appendix("crum-last-page", force=False),
                                roots_col("crum", force=False),
                                roots_col("crum-page-range", force=False),
                            ),
                        ),
                    ),
                    "</span>",
                    field.img(
                        keys=field.apl(
                            _crum_page_numbers,
                            root_appendix("crum-last-page", force=False),
                            roots_col("crum", force=False),
                            roots_col("crum-page-range", force=False),
                        ),
                        get_paths=lambda pages: utils.sort_semver(
                            [
                                f"dictionary/marcion.sourceforge.net/data/crum/{
                                    k+20
                                }.png"
                                for k in pages
                            ],
                        ),
                        fmt_args=lambda path: {
                            "caption": '<span class="crum-page-external">{page_num}</span>'.format(
                                page_num=int(utils.stem(path)) - 20,
                            ),
                            "id": f"crum{int(utils.stem(path)) - 20}",
                            "class": "crum-page-img",
                            "alt": int(utils.stem(path)) - 20,
                            "width": DICT_WIDTH,
                        },
                        force=False,
                        line_br=True,
                    ),
                    "</div>",
                ),
                # Dawoud's pages.
                field.aon(
                    "<hr/>",
                    '<div id="dawoud" class="dawoud dictionary">',
                    '<span class="right">',
                    field.aon(
                        # Abd-El-Nour is Dawoud's actual last name! We continue
                        # to refer to him as Dawoud throughout the repo.
                        '<b><a href="#dawoud" class="dawoud hover-link">Abd-El-Nour</a>: </b>',
                        field.apl(
                            lambda pages: DICTIONARY_PAGE_RE.sub(
                                r'<span class="dawoud-page">\1</span>',
                                pages.replace(",", ", "),
                            ),
                            root_appendix("dawoud-pages", force=False),
                        ),
                    ),
                    "</span>",
                    field.img(
                        root_appendix("dawoud-pages", force=False),
                        get_paths=lambda page_ranges: [
                            f"docs/dawoud/{k+16}.jpg"
                            for k in _page_numbers(column_ranges=page_ranges)
                        ],
                        fmt_args=lambda path: {
                            "caption": '<span class="dawoud-page-external">{page_num}</span>'.format(
                                page_num=int(utils.stem(path)) - 16,
                            ),
                            "id": f"dawoud{int(utils.stem(path)) - 16}",
                            "class": "dawoud-page-img",
                            "alt": int(utils.stem(path)) - 16,
                            "width": DICT_WIDTH,
                        },
                        force=False,
                        line_br=True,
                    ),
                    "</div>",
                ),
                # Audio.
                # TODO: (#23) Label the per-dialect audios, like you did for
                # the front. If this deck contains multiple dialects, it won't
                # be clear for the user which audios belong to which dialect!
                # Note: The use of nested all-or-nothing and concatenate fields
                # here is intentional. It may not be obvious now, but this
                # structure will be necessary if we want to include more audio
                # authors.
                field.aon(
                    "<hr/>",
                    '<div id="sound" class="sound">',
                    field.cat(
                        # Pishoy's pronunciation.
                        field.aon(
                            "Pishoy: ",
                            field.cat(
                                *[
                                    field.snd(
                                        keys=roots_col("key"),
                                        get_paths=pronunciations[col].get,
                                        force=False,
                                    )
                                    for col in dialect_cols
                                ],
                            ),
                        ),
                    ),
                    "</div>",
                ),
            ),
        ),
        title=roots_col("word-title"),
        prev=field.fmt(
            f"{{key_prev}}.html",
            {"key_prev": roots_col("key-prev", force=False)},
            force=False,
            aon=True,
        ),
        next=field.fmt(
            f"{{key_next}}.html",
            {"key_next": roots_col("key-next", force=False)},
            force=False,
            aon=True,
        ),
        search="./",
        home="../",
        force_front=force_front,
        index_indexes=_crum_indexer(
            roots_col,
            root_appendix,
        ).generate_indexes(),
    )


def copticsite_com(deck_name: str, deck_id: int) -> deck.deck:
    def tsv_col(
        col_name: str,
        line_br: bool = False,
        force: bool = True,
    ) -> field.tsv:
        return field.tsv(
            "dictionary/copticsite.com/data/output/tsv/output.tsv",
            col_name,
            line_br=line_br,
            force=force,
        )

    return deck.deck(
        # NOTE: The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=DESCRIPTION,
        css=utils.read("docs/style.css"),
        javascript_path="",
        # NOTE: The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.seq(),
        front=field.cat(
            '<span class="word B">',
            '<span class="spelling B">',
            tsv_col("prettify", force=False),
            "</span>",
            "</span>",
        ),
        back=field.cat(
            field.aon(
                '<span class="type B">',
                "(",
                "<b>",
                field.jne(
                    " - ",
                    tsv_col("Word Kind", force=False),
                    tsv_col("Word Gender", force=False),
                    tsv_col("Origin", force=False),
                ),
                "</b>",
                ")",
                "</span>",
                "<br/>",
            ),
            tsv_col("Meaning", line_br=True, force=False),
        ),
        title=field.txt("", force=False),
        force_front=False,
        force_back=False,
        force_title=False,
        key_for_title=True,
    )


def kellia(deck_name: str, deck_id: int, tsv_basename: str) -> deck.deck:
    def tsv_col(
        col_name: str,
        line_br: bool = False,
        force: bool = True,
    ) -> field.tsv:
        return field.tsv(
            f"dictionary/kellia.uni-goettingen.de/data/output/tsv/{
                tsv_basename
            }.tsv",
            col_name,
            line_br=line_br,
            force=force,
        )

    return deck.deck(
        # NOTE: The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=DESCRIPTION,
        css=utils.read("docs/style.css"),
        javascript_path="",
        # NOTE: The key is a protected field. Do not change unless you know what
        # you're doing.
        key=tsv_col("entry_xml_id"),
        front=tsv_col("orthstring-pishoy", line_br=True),
        back=field.cat(
            field.cat(
                tsv_col("merged-pishoy", line_br=True),
                tsv_col("etym_string-processed", line_br=True, force=False),
                "<hr/>",
            ),
            "<footer>",
            field.aon(
                "Coptic Dictionary Online: ",
                '<a href="',
                tsv_col("cdo"),
                '">',
                tsv_col("entry_xml_id"),
                "</a>",
            ),
            "</footer>",
        ),
        title=field.txt("", force=False),
        force_title=False,
        key_for_title=True,
    )


def _dedup(arr: list[int], at_most_once: bool = False) -> list[int]:
    """
    Args:
        at_most_once: If true, deduplicate across the whole list.
        If false, only deduplicate consecutive occurrences.
        For example, given the list 1,1,2,1.
        If deduped with `at_most_once`, it will return 1,2, with each page
        occurring at most once.
        If deduped with `at_most_once=False`, it will return 1,2,1, only
        removing the consecutive entries.
    """
    if at_most_once:
        return list(dict.fromkeys(arr))
    out: list[int] = []
    for x in arr:
        if out and out[-1] == x:
            continue
        out.append(x)
    return out


def _crum_page_numbers(*args) -> list[int]:
    return _page_numbers(_crum_page_range(*args), single_range=True)


def _crum_page_range(
    last_page_override: str,
    first_page: str,
    page_ranges: str,
) -> str:
    if not last_page_override:
        return page_ranges
    assert last_page_override != first_page
    return f"{first_page}-{last_page_override}"


def _page_numbers(column_ranges: str, single_range: bool = False) -> list[int]:
    """page_ranges is a comma-separated list of columns or columns ranges. The
    column ranges resemble what you type when you're using your printer, except
    that each page number must be followed by a letter, either "a" or b",
    representing the column.

    For example, "1a,3b-5b,8b-9a" means [1a, 3b, 4a, 4b, 5a, 5b, 9a].
    """

    def col_to_page_num(col: str) -> int:
        col = col.strip()
        assert col[-1] in ["a", "b"]
        col = col[:-1]
        assert col.isdigit()
        return int(col)

    out = []
    column_ranges = column_ranges.strip()
    if not column_ranges:
        return []
    ranges = column_ranges.split(",")
    if single_range:
        assert len(ranges) == 1, f"ranges={ranges}"
    del column_ranges, single_range
    for col_or_col_range in ranges:
        if "-" not in col_or_col_range:
            # This is a single column.
            out.append(col_to_page_num(col_or_col_range))
            continue
        # This is a page range.
        cols = col_or_col_range.split("-")
        del col_or_col_range
        assert len(cols) == 2
        assert cols[0] != cols[1]
        start, end = map(col_to_page_num, cols)
        del cols
        assert end >= start
        for x in range(start, end + 1):
            out.append(x)
    out = _dedup(out, at_most_once=True)
    return out


class _dir_lister:
    def __init__(self, dir: str, get_key: typing.Callable) -> None:
        self.cache: dict[str, list[str]] = {}
        if not os.path.exists(dir):
            return
        for file in os.listdir(dir):
            path = os.path.join(dir, file)
            key = get_key(file)
            if key not in self.cache:
                self.cache[key] = []
            self.cache[key].append(path)

    def get(self, key: str) -> list[str]:
        return utils.sort_semver(self.cache.get(key, []))


class sister:
    def __init__(self, key: str, title: str, meaning: str, _type: str) -> None:
        self.key = key
        self.title = title
        self.meaning = meaning
        self.type = _type


class sister_with_frag:
    HREF_FMT = "{key}.html"

    def __init__(self, sister: sister, fragment: str) -> None:
        self.sister = sister
        self.fragment = fragment

    def frag(self) -> str:
        if not self.fragment:
            return ""
        if self.fragment.startswith("#"):
            return self.fragment
        return f"#:~:text={self.fragment}"

    def string(self) -> str:
        return (
            f'<tr id="sister{self.sister.key}" class="sister">'
            '<td class="sister-view">'
            f'<a class="navigate" href="{
                self.HREF_FMT.format(
                    key=self.sister.key
                ) + self.frag()
            }" target="_blank">'
            "view"
            "</a>"
            "</td>"
            '<td class="sister-title">'
            f"{self.sister.title}"
            "</td>"
            '<td class="sister-meaning">'
            f"{f"(<b>{self.sister.type}</b>) " if self.sister.type else ""}"
            f"{self.sister.meaning}"
            f'<span hidden="" class="dev sister-key right">'
            f"{self.sister.key}"
            "</span>"
            "</td>"
            "</tr>"
        )


class step_sister_with_frag(sister_with_frag):
    HREF_FMT = KELLIA_PREFIX + "{key}"


class _mother:
    with_frag: typing.Callable = sister_with_frag

    def __init__(self, roots_col: typing.Callable) -> None:
        keys = roots_col("key")._content
        titles = [
            line.replace("<br>", " ").replace("</br>", " ")
            for line in roots_col("word-parsed-classify", force=False)._content
        ]
        meanings = roots_col("en-parsed", line_br=True, force=False)._content
        types = roots_col("type-parsed")._content
        self.key_to_sister: dict[str, sister] = {
            key: sister(key, title, meaning, _type)
            for key, title, meaning, _type in zip(
                keys,
                titles,
                meanings,
                types,
            )
        }

    def parse(self, raw: str):
        assert raw
        split = raw.split()
        return self.with_frag(
            self.key_to_sister[split[0]],
            " ".join(split[1:]),
        )

    def gather(self, key: str, _sisters: str) -> str:
        if not _sisters:
            return ""
        sisters = [self.parse(raw) for raw in utils.ssplit(_sisters, ";")]
        del _sisters
        sister_keys = [s.sister.key for s in sisters]
        assert key not in sister_keys
        assert len(set(sister_keys)) == len(sister_keys)
        return "\n".join(s.string() for s in sisters)


class _step_mother(_mother):
    with_frag: typing.Callable = step_sister_with_frag
    ID_RE = re.compile(r'\bid="[^"]+"')

    def clean_ids(self, html: str) -> str:
        return self.ID_RE.sub("", html)

    def _kellia_col(self, col_name: str) -> list[str]:
        content = field.tsv(
            "dictionary/kellia.uni-goettingen.de/data/output/tsv/comprehensive.tsv",
            col_name,
            line_br=True,
        )._content
        # NOTE: TLA sister elements possess IDs that are often identical, which
        # we remove here in order to avoid having HTML element ID conflicts,
        # given that, in this view, we can include several TLA entries in the
        # same HTML page.
        return list(map(self.clean_ids, content))

    def __init__(self) -> None:
        keys = self._kellia_col("entry_xml_id")
        titles = [
            line.replace("<br>", " ").replace("</br>", " ")
            for line in self._kellia_col("orthstring-pishoy")
        ]
        meanings = self._kellia_col("merged-pishoy")
        self.key_to_sister: dict[str, sister] = {
            key: sister(key, title, meaning, "")
            for key, title, meaning in zip(
                keys,
                titles,
                meanings,
            )
        }


class _crum_indexer(_mother):
    def __init__(
        self,
        roots_col: typing.Callable,
        root_appendix: typing.Callable,
    ):
        self.root_appendix = root_appendix
        self.roots_col = roots_col
        super().__init__(roots_col=roots_col)

    def __generate_index_aux(
        self,
        index_name: str,
        keys: list[str],
    ) -> typing.Generator[str]:
        yield f"<h1>{index_name}</h2>"
        yield '<table class="index-table">'
        for key in keys:
            sister = self.with_frag(self.key_to_sister[key], "")
            yield sister.string()
        yield "</table>"

    def __generate_index_body(self, index_name: str, keys: list[str]) -> str:
        return "".join(self.__generate_index_aux(index_name, keys))

    def generate_indexes_aux(
        self,
        indexes: list[list[str]],
    ) -> list[deck.index]:
        """
        Args:
            indexes: A list such that indexes_i gives the indexes that word_i
            belongs to.
        """
        index_to_keys: defaultdict = defaultdict(list)
        keys: list[str] = self.root_appendix("key")._content
        assert len(keys) == len(indexes)
        for word_key, word_indexes in zip(keys, indexes):
            for word_index in word_indexes:
                index_to_keys[word_index].append(word_key)
        return [
            deck.index(
                title=index_name,
                count=len(keys),
                html_body=self.__generate_index_body(index_name, keys),
            )
            for index_name, keys in sorted(
                index_to_keys.items(),
                key=lambda pair: pair[0],
            )
        ]

    def generate_type_indexes(self) -> list[deck.index]:
        return self.generate_indexes_aux(
            [[t] for t in self.roots_col("type-parsed")._content],
        )

    def generate_category_indexes(self) -> list[deck.index]:
        return self.generate_indexes_aux(
            [
                utils.ssplit(cats, ",")
                for cats in self.root_appendix(
                    "categories",
                    force=False,
                )._content
            ],
        )

    def generate_indexes(self) -> list[deck.index_index]:
        return [
            deck.index_index(
                "Categories",
                self.generate_category_indexes(),
            ),
            deck.index_index("Types", self.generate_type_indexes()),
        ]


def senses_json_to_html(senses_dump: str) -> str:
    if not senses_dump:
        return ""
    senses: dict[str, str] = json.loads(senses_dump)
    return "; ".join(
        f'<span class="sense" id="sense{k}">{senses[k]}</span>'
        for k in sorted(senses.keys(), key=int)
    )


class _sensor:
    def __init__(self, keys: list[str], sense_jsons: list[str]) -> None:
        assert len(keys) == len(sense_jsons)
        self.d: dict[str, dict[str, str]] = {
            k: json.loads(ss) if ss else {} for k, ss in zip(keys, sense_jsons)
        }

    def get_caption(self, path: str) -> str:
        stem = utils.stem(path)
        key, sense, _ = stem.split("-")
        assert key.isdigit()
        assert sense.isdigit()
        return "".join(
            [
                '<span hidden="" class="dev explanatory-key">',
                stem,
                " ",
                "</span>",
                '<span class="italic lighter small">',
                # TODO: (#189) Require the presence of a sense once the sense
                # data has been fully populated.
                self.d[key].get(sense, ""),
                "</span>",
            ],
        )


# NOTE: The deck IDs are protected fields. They are used as database keys for the
# decks. Do NOT change them!
#
# The deck names are protected fields. Do NOT change them. They are used for:
# 1. Display in the Anki UI, including nesting.
# 2. Prefixes for the note keys, to prevent collisions between notes in
#    different decks.
# 3. Model names (largely irrelevant).
#
# NOTE: If the `name` argument is provided, it overrides the first use case
# (display), but the deck names continue to be used for prefixing and model
# names.
# It's for the second reason, and to a lesser extend the first as well, that
# the names should NOT change. If the DB keys diverge, synchronization will
# mess up the data! Importing a new deck will result in the notes being
# duplicated rather than replaced or updated.

# NOTE: Besides the constants hardcoded below, the "name" and "key" fields in
# the deck generation logic are also protected.
# The "name" argument is used to generate deck names for datasets that generate
# multiple decks.
# The "key" field is used to key the notes.
CRUM_BOHAIRIC = "A Coptic Dictionary::Bohairic"
CRUM_SAHIDIC = "A Coptic Dictionary::Sahidic"
CRUM_BOHAIRIC_SAHIDIC = "A Coptic Dictionary::Bohairic / Sahidic"
CRUM_ALL = "A Coptic Dictionary::All Dialects"
COPTICSITE_NAME = "copticsite.com"
KELLIA_COMPREHENSIVE = "KELLIA::Comprehensive"
KELLIA_EGYPTIAN = "KELLIA::Egyptian"
KELLIA_GREEK = "KELLIA::Greek"


def file_name(deck_name: str) -> str:
    """Given a deck name, return a string that is valid as a file name.

    Remove invalid characters, and make it filename-like.
    """
    return (
        deck_name.lower().replace(" ", "_").replace(":", "_").replace("/", "-")
    )


LAMBDAS: dict[str, typing.Callable] = {
    CRUM_ALL: lambda deck_name: crum(
        deck_name,
        1284010387,
        ["word-parsed-prettify"],
    ),
    CRUM_BOHAIRIC: lambda deck_name: crum(
        deck_name,
        1284010383,
        ["dialect-B"],
        force_front=False,
    ),
    CRUM_SAHIDIC: lambda deck_name: crum(
        deck_name,
        1284010386,
        ["dialect-S"],
        force_front=False,
    ),
    CRUM_BOHAIRIC_SAHIDIC: lambda deck_name: crum(
        deck_name,
        1284010390,
        ["dialect-B", "dialect-S"],
        force_front=False,
    ),
    COPTICSITE_NAME: lambda deck_name: copticsite_com(deck_name, 1284010385),
    KELLIA_COMPREHENSIVE: lambda deck_name: kellia(
        deck_name,
        1284010391,
        "comprehensive",
    ),
    KELLIA_EGYPTIAN: lambda deck_name: kellia(
        deck_name,
        1284010392,
        "egyptian",
    ),
    KELLIA_GREEK: lambda deck_name: kellia(deck_name, 1284010393, "greek"),
}

# Xooxle search will work fine even if we don't retain any HTML tags, because it
# relies entirely on searching the text payloads of the HTML. However, we retain
# the subset of the classes that are needed for highlighting, in order to make
# the Xooxle search results pretty.

_DIALECTS = {
    "S",
    "Sa",
    "Sf",
    "A",
    "sA",
    "B",
    "F",
    "Fb",
    "O",
    # The following dialects are only found in Marcion.
    "NH",
    # The following dialects are only found in TLA / KELLIA.
    "Ak",
    "M",
    "L",
    "P",
    "V",
    "W",
    "U",
}

_CRUM_RETAIN_CLASSES = {
    "word",
    "dialect",
    "spelling",
    "type",
} | _DIALECTS

_CRUM_RETAIN_ELEMENTS_FOR_CLASSES = {
    "dialect-comma",
    "spelling-comma",
    "dialect-parenthesis",
}

_KELLIA_RETAIN_CLASSES = {
    "word",
    "spelling",
    "dialect",
    "type",
    "lang",
    "geo",
    "gram_grp",
} | _DIALECTS

_COPTICSITE_RETAIN_CLASSES = {
    "word",
    "spelling",
} | _DIALECTS


_BLOCK_ELEMENTS_DEFAULT = {
    # Each table row goes to a block.
    "table",
    "thead",
    "tbody",
    "tr",
    # Each figure caption goes to a block.
    "figure",
    "figcaption",
    "img",
    # A division creates a new block.
    "div",
    # A horizontal line or line break create a block.
    "hr",
    "br",
}

_RETAIN_TAGS_DEFAULT = {
    "b",
    "i",
    "strong",
    "em",
}


def capture(
    name: str,
    _selector: xooxle.selector,
    retain_classes: set[str] = set(),
    retain_tags: set[str] = _RETAIN_TAGS_DEFAULT,
    retain_elements_for_classes: set[str] = set(),
    block_elements: set[str] = _BLOCK_ELEMENTS_DEFAULT,
    unit_tags: set[str] = set(),
) -> xooxle.capture:
    return xooxle.capture(
        name=name,
        _selector=_selector,
        retain_classes=retain_classes,
        retain_tags=retain_tags,
        retain_elements_for_classes=retain_elements_for_classes,
        block_elements=block_elements,
        unit_tags=unit_tags,
    )


def _is_crum_word(path: str) -> bool:
    return utils.stem(path).isdigit()


# TODO: (#267) This index is not currently bening built because it still relies
# on retrieving data from files, which is no longer supported. Build the index
# here, before writing the files.
INDEX = xooxle.index(
    "docs/crum/xooxle.json",
    xooxle.subindex(
        input="flashcards/data/output/web/a_coptic_dictionary__all_dialects/",
        include=_is_crum_word,
        extract=[
            xooxle.selector({"name": "title"}, force=False),
            xooxle.selector({"class_": "header"}, force=False),
            xooxle.selector({"class_": "dictionary"}, force=False),
            xooxle.selector({"class_": "crum"}, force=False),
            xooxle.selector({"class_": "crum-page"}, force=False),
            xooxle.selector({"class_": "crum-page-external"}, force=False),
            xooxle.selector({"class_": "dawoud"}, force=False),
            xooxle.selector({"class_": "dawoud-page"}, force=False),
            xooxle.selector(
                {"class_": "dawoud-page-external"},
                force=False,
            ),
            xooxle.selector({"class_": "drv-key"}, force=False),
            xooxle.selector({"id": "images"}, force=False),
            xooxle.selector({"class_": "nag-hammadi"}, force=False),
            xooxle.selector({"class_": "sisters"}, force=False),
            xooxle.selector({"id": "marcion"}),
            xooxle.selector({"id": "categories"}, force=False),
        ],
        captures=[
            capture(
                "marcion",
                xooxle.selector({"id": "pretty"}),
                # This is the list of classes needed for highlighting. If the
                # highlighting rules change, you might have to add new classes!
                retain_classes=_CRUM_RETAIN_CLASSES,
                retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
            ),
            capture(
                "meaning",
                xooxle.selector({"id": "root-type-meaning"}, force=False),
                retain_classes=_CRUM_RETAIN_CLASSES,
                retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
            ),
            capture(
                "appendix",
                xooxle.selector(
                    {"name": "body"},
                ),
                retain_classes=_CRUM_RETAIN_CLASSES,
                retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
                unit_tags={"tr", "div", "hr"},
                block_elements=_BLOCK_ELEMENTS_DEFAULT | {"td"},
            ),
        ],
        result_table_name="crum",
        href_fmt="{KEY}.html",
    ),
    xooxle.subindex(
        input="flashcards/data/output/web/kellia__comprehensive/",
        extract=[
            xooxle.selector({"name": "footer"}, force=False),
            xooxle.selector({"class_": "bibl"}, force=False),
            xooxle.selector({"class_": "ref_xr"}, force=False),
            xooxle.selector({"class_": "ref"}, force=False),
        ],
        captures=[
            capture(
                "orths",
                xooxle.selector({"id": "orths"}),
                retain_classes=_KELLIA_RETAIN_CLASSES,
            ),
            capture(
                "senses",
                xooxle.selector({"id": "senses"}),
                retain_classes=_KELLIA_RETAIN_CLASSES,
            ),
            capture(
                "text",
                xooxle.selector(
                    {"name": "body"},
                ),
            ),
        ],
        result_table_name="kellia",
        href_fmt="https://coptic-dictionary.org/entry.cgi?tla={KEY}",
    ),
    xooxle.subindex(
        input="flashcards/data/output/web/copticsite.com/",
        extract=[],
        captures=[
            capture(
                "front",
                xooxle.selector({"id": "front"}),
                retain_classes=_COPTICSITE_RETAIN_CLASSES,
            ),
            capture(
                "back",
                xooxle.selector({"id": "back"}),
            ),
        ],
        result_table_name="copticsite",
        href_fmt="",
    ),
)
