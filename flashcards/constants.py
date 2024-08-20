import json
import os
import re

import deck
import enforcer
import field
import type_enforced

import utils

CRUM_FMT = '<span class="crum-page">{crum}</span>'
CRUM_EXTERNAL_FMT = '<span class="crum-page-external">{crum}</span>'
HOME = "https://metremnqymi.com"
CRUM_ROOT = f"{HOME}/crum"
EMAIL = "pishoybg@gmail.com"

DICTIONARY_PAGE_RE = re.compile("([0-9]+(a|b))")
COPTIC_WORD_RE = re.compile("([Ⲁ-ⲱϢ-ϯⳈⳉ]+)")
GREEK_WORD_RE = re.compile("([Α-Ωα-ω]+)")

DICT_WIDTH = "1000px"


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def crum(
    deck_name: str, deck_id: int, dialect_cols: list[str], force_front: bool = True
) -> deck.deck:

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def roots_col(
        col_name: str, line_br: bool = False, force: bool = True
    ) -> field.tsvs:
        return field.tsvs(
            "dictionary/marcion.sourceforge.net/data/output/tsvs/roots.tsvs",
            col_name,
            line_br=line_br,
            force=force,
        )

    def root_appendix(
        col_name: str, line_br: bool = False, force: bool = True
    ) -> field.tsv:
        return field.tsv(
            "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv",
            col_name,
            line_br=line_br,
            force=force,
        )

    # TODO: Add a similar alignment check for the derivations keys and
    # derivations appendices keys, once we start using them.
    roots_keys = roots_col("key")
    appendices_keys = root_appendix("key")
    for _ in range(field.num_entries(roots_keys, appendices_keys)):
        assert roots_keys.next() == appendices_keys.next()
    del roots_keys, appendices_keys

    # TODO: This replaces all Coptic words, regardless of whether they
    # represent plain text. Coptic text that occurs inside a tag (for example
    # as a tag property) would still get wrapped inside this <span> tag.
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def cdo(text: str) -> str:
        return COPTIC_WORD_RE.sub(
            r'<span class="coptic">\1</span>',
            text,
        )

    # TODO: This replaces all Greek words, regardless of whether they
    # represent plain text. Greek text that occurs inside a tag (for example
    # as a tag property) would still acquire this tag.
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def greek(text: str) -> str:
        return GREEK_WORD_RE.sub(
            r'<span class="greek">\1</span>',
            text,
        )

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def create_front() -> field.Field:
        if len(dialect_cols) == 1:
            return roots_col(dialect_cols[0], line_br=True, force=False)

        def dialect(col: str) -> field.Field:
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
        # N.B. The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=f"{HOME}.\n{EMAIL}.",
        css=utils.read("flashcards/constants/a_coptic_dictionary/style.css"),
        javascript=utils.read("flashcards/constants/a_coptic_dictionary/script.js"),
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=roots_col("key"),
        front=field.apl(
            cdo,
            field.aon(
                # Header.
                field.cat(
                    # Open the table.
                    '<table class="header">',
                    "<tr>",
                    # Home
                    "<td>" f'<a class="home" href="{HOME}">' "home" "</a>" "</td>",
                    # Contact
                    "<td>"
                    f'<a class="contact" href="mailto:{EMAIL}">'
                    "contact"
                    "</a>"
                    "</td>",
                    # Prev
                    "<td>",
                    field.fmt(
                        f'<a class="navigate" href="{CRUM_ROOT}/{{key_prev}}.html">'
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
                        f'<a class="navigate" href="{CRUM_ROOT}/{{key_next}}.html">'
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
                create_front(),
            ),
        ),
        back=field.apl(
            cdo,
            field.cat(
                # Type.
                field.fmt(
                    "(<b>{type_parsed}</b>)",
                    {"type_parsed": roots_col("type-parsed")},
                ),
                "<br/>",
                # Meaning.
                field.apl(greek, roots_col("en-parsed", line_br=True, force=False)),
                # Dictionary pages.
                field.cat(
                    '<span class="right">',
                    field.fmt(
                        f'<b><a href="#crum" class="hover-link">Crum: </a></b>{CRUM_FMT}',
                        {"crum": roots_col("crum")},
                    ),
                    field.aon(
                        "<br/>",
                        '<b><a href="#dawoud" class="hover-link">Dawoud: </a></b>',
                        field.apl(
                            lambda pages: DICTIONARY_PAGE_RE.sub(
                                r'<span class="dawoud-page">\1</span>', pages
                            ),
                            root_appendix("dawoud-pages", force=False),
                        ),
                    ),
                    "</span>",
                ),
                "<br/>",
                # Image.
                field.img(
                    keys=roots_col("key"),
                    # Although the same result can be obtained using
                    # glob.glob(f"dictionary/marcion.sourceforge.net/data/img-300/{key}-*")
                    # we use this method in order to avoid using the computationally expensive
                    # glob.glob.
                    get_paths=explanatory_images.get,
                    sort_paths=utils.sort_semver,
                    fmt_args=lambda path: {
                        "caption": image_sensor.get_caption(path),
                        "id": "explanatory" + utils.stem(path),
                    },
                    caption=True,
                    id=True,
                    force=False,
                ),
                # Editor's notes.
                field.aon(
                    "<i>Editor's Note: </i>",
                    root_appendix("notes", line_br=True, force=False),
                    "<br/>",
                ),
                # Horizontal line.
                "<hr/>",
                # Full entry.
                roots_col("word-parsed-classify", line_br=True),
                # Derivations.
                field.apl(
                    greek, roots_col("derivations-table", line_br=True, force=False)
                ),
                # Crum's pages.
                field.cat(
                    "<hr/>",
                    '<span id="crum" class="right">',
                    field.fmt(
                        f"<b>Crum: </b>{CRUM_FMT}",
                        {"crum": roots_col("crum")},
                    ),
                    "</span>",
                    field.img(
                        keys=roots_col(
                            "crum-pages",
                            force=False,  # TODO: Why is this not enforced? Is it the Nag Hammadi words?
                        ),
                        get_paths=lambda page_ranges: [
                            f"dictionary/marcion.sourceforge.net/data/crum/{k+20}.png"
                            for k in _page_numbers(page_ranges=page_ranges)
                        ],
                        sort_paths=utils.sort_semver,
                        fmt_args=lambda path: {
                            "caption": CRUM_EXTERNAL_FMT.format(
                                crum=int(utils.stem(path)) - 20
                            ),
                            "id": f"crum{int(utils.stem(path)) - 20}",
                            "alt": int(utils.stem(path)) - 20,
                            "width": DICT_WIDTH,
                        },
                        caption=True,
                        id=True,
                        force=False,
                    ),
                ),
                # Dawoud's pages.
                field.aon(
                    "<hr/>",
                    '<span id="dawoud" class="right">',
                    field.aon(
                        "<b>Dawoud: </b>",
                        field.apl(
                            lambda pages: DICTIONARY_PAGE_RE.sub(
                                r'<span class="dawoud-page">\1</span>', pages
                            ),
                            root_appendix("dawoud-pages", force=False),
                        ),
                    ),
                    "</span>",
                    field.img(
                        root_appendix("dawoud-pages", force=False),
                        get_paths=lambda page_ranges: [
                            f"dictionary/copticocc.org/data/dawoud-D100/{k+16}.jpg"
                            for k in _page_numbers(page_ranges=page_ranges)
                        ],
                        fmt_args=lambda path: {
                            "caption": int(utils.stem(path)) - 16,
                            "id": f"dawoud{int(utils.stem(path)) - 16}",
                            "alt": int(utils.stem(path)) - 16,
                            "width": DICT_WIDTH,
                        },
                        caption=True,
                        id=True,
                        force=False,
                    ),
                ),
                # Audio.
                # TODO: Label the per-dialect audios, like you did for the front.
                # If this deck contains multiple dialects, it won't be clear for
                # the user which audios belong to which dialect!
                # Note: The use of nested all-or-nothing and concatenate fields
                # here is intentional. It may not be obvious now, but this
                # structure will be necessary if we want to include more audio
                # authors.
                field.aon(
                    "<hr/>",
                    field.cat(
                        # Pishoy's pronunciation.
                        field.aon(
                            "Pishoy: ",
                            field.cat(
                                *[
                                    field.snd(
                                        keys=roots_col("key"),
                                        get_paths=pronunciations[col].get,
                                        sort_paths=sorted,
                                        force=False,
                                    )
                                    for col in dialect_cols
                                ],
                            ),
                        ),
                    ),
                ),
            ),
        ),
        title=roots_col("word-title"),
        force_front=force_front,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def copticsite_com(deck_name: str, deck_id: int) -> deck.deck:
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def col(col_name: str, line_br: bool = False, force: bool = True) -> field.tsvs:
        return field.tsvs(
            "dictionary/copticsite.com/data/output/tsvs/output.tsvs",
            col_name,
            line_br=line_br,
            force=force,
        )

    return deck.deck(
        # N.B. The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=f"{HOME}\n{EMAIL}",
        css=utils.read("flashcards/constants/copticsite/style.css"),
        javascript="",
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.seq(),
        front=col("prettify", force=False),
        back=field.cat(
            field.aon(
                "(",
                "<b>",
                field.jne(
                    " - ",
                    col("Word Kind", force=False),
                    col("Word Gender", force=False),
                    col("Origin", force=False),
                ),
                "</b>",
                ")",
                "<br/>",
            ),
            col("Meaning", line_br=True, force=False),
        ),
        title=field.txt("", force=False),
        force_front=False,
        force_back=False,
        force_title=False,
        key_for_title=True,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def kellia(deck_name: str, deck_id: int, basename: str) -> deck.deck:
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def col(col_name: str, line_br: bool = False, force: bool = True) -> field.tsvs:
        return field.tsvs(
            f"dictionary/kellia.uni-goettingen.de/data/output/tsvs/{basename}.tsvs",
            col_name,
            line_br=line_br,
            force=force,
        )

    return deck.deck(
        # N.B. The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=f"{HOME}\n{EMAIL}",
        css=utils.read("flashcards/constants/kellia/style.css"),
        javascript="",
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=col("entry_xml_id"),
        front=col("orthstring-pishoy", line_br=True),
        back=field.cat(
            field.cat(
                col("merged-pishoy", line_br=True),
                col("etym_string-processed", line_br=True, force=False),
                "<hr/>",
            ),
            field.aon(
                "Coptic Dictionary Online: ",
                '<a href="',
                col("cdo"),
                '">',
                col("entry_xml_id"),
                "</a>",
            ),
        ),
        title=field.txt("", force=False),
        force_title=False,
        key_for_title=True,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
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
    out = []
    for x in arr:
        if out and out[-1] == x:
            continue
        out.append(x)
    return out


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _page_numbers(page_ranges: str) -> list[int]:
    """
    page_ranges is a comma-separated list of integers or integer ranges, just
    like what you type when you're using your printer.
    For example, "1,3-5,8-9" means [1, 3, 4, 5, 8, 9].
    """

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
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


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class _dir_lister:
    def __init__(self, dir: str, get_key: enforcer.Callable) -> None:
        self.cache = {}
        if not os.path.exists(dir):
            return
        for file in os.listdir(dir):
            path = os.path.join(dir, file)
            key = get_key(file)
            if key not in self.cache:
                self.cache[key] = []
            self.cache[key].append(path)

    def get(self, key: str) -> list[str]:
        return self.cache.get(key, [])


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
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
                # TODO: (#189): Require the presence of a sense once the sense
                # data has been fully populated.
                self.d[key].get(sense, sense),
                "</span>",
            ]
        )


# N.B. The deck IDs are protected fields. They are used as database keys for the
# decks. Do NOT change them!
#
# The deck names are protected fields. Do NOT change them. They are used for:
# 1. Display in the Anki UI, including nesting.
# 2. Prefixes for the note keys, to prevent collisions between notes in
#    different decks.
# 3. Model names (largely irrelevant).
#
# N.B. If the `name` argument is provided, it overrides the first use case
# (display), but the deck names continue to be used for prefixing and model
# names.
# It's for the second reason, and to a lesser extend the first as well, that
# the names should NOT change. If the DB keys diverge, synchronization will
# mess up the data! Importing a new deck will result in the notes being
# duplicated rather than replaced or updated.

# N.B. Besides the constants hardcoded below, the "name" and "key" fields in
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


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def file_name(deck_name: str) -> str:
    """
    Given a deck name, return a string that is valid as a file name. Remove
    invalid characters, and make it filename-like.
    """
    return deck_name.lower().replace(" ", "_").replace(":", "_").replace("/", "-")


LAMBDAS: dict[str, enforcer.Callable] = {
    CRUM_ALL: lambda deck_name: crum(
        deck_name,
        1284010387,
        ["word-parsed-prettify"],
    ),
    CRUM_BOHAIRIC: lambda deck_name: crum(
        deck_name, 1284010383, ["dialect-B"], force_front=False
    ),
    CRUM_SAHIDIC: lambda deck_name: crum(
        deck_name, 1284010386, ["dialect-S"], force_front=False
    ),
    CRUM_BOHAIRIC_SAHIDIC: lambda deck_name: crum(
        deck_name,
        1284010390,
        ["dialect-B", "dialect-S"],
        force_front=False,
    ),
    COPTICSITE_NAME: lambda deck_name: copticsite_com(deck_name, 1284010385),
    KELLIA_COMPREHENSIVE: lambda deck_name: kellia(
        deck_name, 1284010391, "comprehensive"
    ),
    KELLIA_EGYPTIAN: lambda deck_name: kellia(deck_name, 1284010392, "egyptian"),
    KELLIA_GREEK: lambda deck_name: kellia(deck_name, 1284010393, "greek"),
}
