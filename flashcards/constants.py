import json
import os
import re
import typing

import deck
import field

import utils

HOME = "https://remnqymi.com"
CRUM_ROOT = f"{HOME}/crum"
EMAIL = "remnqymi@gmail.com"

KELLIA_PREFIX = "https://coptic-dictionary.org/entry.cgi?tla="

INTEGER_RE = re.compile("([0-9]+)")
DICTIONARY_PAGE_RE = re.compile("([0-9]+(a|b))")
COPTIC_WORD_RE = re.compile("([Ⲁ-ⲱϢ-ϯⳈⳉ]+)")
GREEK_WORD_RE = re.compile("([Α-Ωα-ω]+)")
NON_INFINITIVE_SUFFIXES = {"-", "=", "+"}

DICT_WIDTH = "1000px"


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
            "dictionary/marcion.sourceforge.net/data/output/tsv/roots.tsv",
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
            "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv",
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
        deck_description=f"{HOME}.\n{EMAIL}.",
        css=utils.read("site/style.css"),
        javascript=utils.read("site/data/build/crum.js"),
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
                    "<td>"
                    f'<a class="home" href="{HOME}">'
                    "home"
                    "</a>"
                    "</td>",
                    # Contact
                    "<td>"
                    f'<a class="contact" href="mailto:{EMAIL}">'
                    "email"
                    "</a>"
                    "</td>",
                    # Prev
                    "<td>",
                    field.fmt(
                        f'<a class="navigate" href="{
                            CRUM_ROOT
                        }/{{key_prev}}.html">'
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
                        f'<a class="navigate" href="{CRUM_ROOT}/{{key}}.html">'
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
                        f'<a class="navigate" href="{
                            CRUM_ROOT
                        }/{{key_next}}.html">'
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
                            '<b><a href="#crum" class="crum hover-link">Crum: </a></b>',
                            field.fmt(
                                '<span class="crum-page">{crum}</span>',
                                {"crum": roots_col("crum", force=False)},
                                force=False,
                                aon=True,
                            ),
                        ),
                        field.aon(
                            "<br/>",
                            '<b><a href="#dawoud" class="dawoud hover-link">Dawoud: </a></b>',
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
                # Image.
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
                        "<b>Crum: </b>",
                        field.apl(
                            lambda pages: INTEGER_RE.sub(
                                r'<span class="crum-page">\1</span>',
                                pages,
                            ),
                            roots_col("crum-pages", force=False),
                        ),
                    ),
                    "</span>",
                    field.img(
                        keys=roots_col("crum-pages", force=False),
                        get_paths=lambda page_ranges: utils.sort_semver(
                            [
                                f"dictionary/marcion.sourceforge.net/data/crum/{
                                    k+20
                                }.png"
                                for k in _page_numbers(page_ranges=page_ranges)
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
                        "<b>Dawoud: </b>",
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
                            f"dictionary/copticocc.org/data/dawoud-D100-cropped/{
                                k+16
                            }.jpg"
                            for k in _page_numbers(page_ranges=page_ranges)
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
            f"{CRUM_ROOT}/{{key_prev}}.html",
            {"key_prev": roots_col("key-prev", force=False)},
            force=False,
            aon=True,
        ),
        next=field.fmt(
            f"{CRUM_ROOT}/{{key_next}}.html",
            {"key_next": roots_col("key-next", force=False)},
            force=False,
            aon=True,
        ),
        search=f"{CRUM_ROOT}/",
        force_front=force_front,
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
        deck_description=f"{HOME}\n{EMAIL}",
        css=utils.read("site/style.css"),
        javascript="",
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
        deck_description=f"{HOME}\n{EMAIL}",
        css=utils.read("site/style.css"),
        javascript="",
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


def _page_numbers(page_ranges: str) -> list[int]:
    """page_ranges is a comma-separated list of integers or integer ranges,
    just like what you type when you're using your printer.

    For example, "1,3-5,8-9" means [1, 3, 4, 5, 8, 9].
    """

    def parse(page_number: str) -> int:
        page_number = page_number.strip()
        if page_number[-1] in ["a", "b"]:
            page_number = page_number[:-1]
        assert page_number.isdigit()
        return int(page_number)

    out = []
    page_ranges = page_ranges.strip()
    for page_or_page_range in page_ranges.split(","):
        if "-" not in page_or_page_range:
            # This is a single page.
            out.append(parse(page_or_page_range))
            continue
        # This is a page range.
        start, end = map(parse, page_or_page_range.split("-"))
        assert end >= start, f"start={start}, end={end}"
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
    HREF_FMT = CRUM_ROOT + "/{key}.html"

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
            f'<a href="{
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


class _sensor:
    def __init__(self, keys: list[str], sense_jsons: list[str]) -> None:
        assert len(keys) == len(sense_jsons)
        self.d: dict = {
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
                self.d[key].get(sense, sense),
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
