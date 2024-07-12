import glob
import os
import typing

import deck
import enforcer
import field
import type_enforced

BIBLE_LANGUAGES = [
    "Bohairic",
    "English",
    "Sahidic",
    "Fayyumic",
    "Akhmimic",
    "OldBohairic",
    "Mesokemic",
    "DialectP",
    "Lycopolitan",
    "Greek",
]


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def crum(
    deck_name: str, deck_id: int, dialect_cols: list[str], force_front: bool = True
):

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def roots_col(col_name: str, force: bool = True) -> field.tsv:
        return field.tsv(
            "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
            col_name,
            force=force,
        )

    def dawoud_col(col_name: str, force: bool = True) -> field.tsv:
        return field.tsv(
            "dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv",
            col_name,
            force=force,
        )

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def create_front() -> field.Field:
        if len(dialect_cols) == 1:
            return roots_col(dialect_cols[0], force=False)

        def dialect(col):
            return field.aon(
                '<span id="left">',
                "(",
                "<b>",
                col[col.find("-") + 1 :],
                "</b>",
                ")",
                "</span>",
                "<br/>",
                roots_col(col, force=False),
            )

        return field.jne("<br/>", *[dialect(col) for col in dialect_cols])

    explanatory_images = field.dir_lister(
        "dictionary/marcion.sourceforge.net/data/img-300",
        lambda file: file[: file.find("-")],
    )
    pronunciations = {
        col: field.dir_lister(
            f"dictionary/marcion.sourceforge.net/data/snd-pishoy/{col}/",
            lambda file: file[: file.find(".")],
        )
        for col in dialect_cols
    }
    return deck.deck(
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description="https://github.com/pishoyg/coptic/.\n" "pishoybg@gmail.com.",
        css=".card { font-size: 18px; }"
        "#front { text-align: center; }"
        "figure { display: inline-block; border: 1px transparent; margin: 10px; }"
        "figure figcaption { text-align: center; }"
        "figure img { vertical-align: top; }"
        "#bordered { border:1px solid black; }"
        "#right { float:right; }"
        "#left { float: left; }"
        "#center { text-align: center; }"
        ".nightMode #bordered { border:1px solid white; }",
        # N.B. The name is a protected field, although it is unused in this
        # case because we generate a single deck, thus the deck name is a
        # constant for all notes.
        name=None,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=roots_col("key", force=True),
        front=create_front(),
        back=field.cat(
            # Type and Crum page.
            field.cat(
                field.aon(
                    "(",
                    "<b>",
                    roots_col("type-parsed", force=True),
                    "</b>",
                    ")",
                ),
                field.aon(
                    '<span id="right">',
                    "<b>Crum: </b>",
                    roots_col("crum-link", force=True),
                    "</span>",
                    "<br/>",
                ),
            ),
            # Meaning.
            field.aon(
                roots_col("en-parsed-link-light-greek", force=False),
                "<br/>",
            ),
            # Image.
            field.img(
                keys=field.tsv(
                    file_path="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                    column_name="key",
                    force=False,
                ),
                # Although the same result can be obtained using
                # glob.glob(f"dictionary/marcion.sourceforge.net/data/img-300/{key}-*")
                # we use this method in order to avoid using the computationally expensive
                # glob.glob.
                # TODO: Move this to a class in `field.py`, and use with the sound media as
                # well.
                get_paths=explanatory_images.get,
                sort_paths=field.sort_semver,
                get_caption=field.stem,
                force=False,
            ),
            # Horizonal line.
            "<hr/>",
            # Full entry.
            roots_col("word-parsed-no-ref", force=True),
            # Derivations.
            roots_col("derivations-table", force=False),
            "<hr/>",
            # Crum's pages.
            field.cat(
                field.img(
                    keys=field.tsv(
                        file_path="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                        column_name="crum-pages",
                        force=False,
                    ),
                    get_paths=lambda page_ranges: [
                        f"dictionary/marcion.sourceforge.net/data/crum/{k+20}.png"
                        for k in field.page_numbers(page_ranges=page_ranges)
                    ],
                    sort_paths=field.sort_semver,
                    get_caption=lambda path: int(field.stem(path)) - 20,
                    force=False,
                ),
                "<hr/>",
            ),
            # Dawoud's pages.
            field.aon(
                '<span id="right">',
                "<b>Dawoud: </b>",
                field.grp(
                    keys=roots_col("key", force=True),
                    group_by=dawoud_col("key", force=True),
                    selected=field.xor(
                        dawoud_col("dawoud-pages-redone", force=False),
                        dawoud_col("dawoud-pages", force=False),
                    ),
                    force=False,
                    unique=True,
                ),
                "</span>",
                "<br/>",
                field.img(
                    field.grp(
                        keys=roots_col("key", force=True),
                        group_by=dawoud_col("key", force=True),
                        selected=field.xor(
                            dawoud_col("dawoud-pages-redone", force=False),
                            dawoud_col("dawoud-pages", force=False),
                        ),
                        force=False,
                        unique=True,
                    ),
                    get_paths=lambda page_ranges: [
                        f"dictionary/copticocc.org/dawoud-D100/{k+16}.jpg"
                        for k in field.page_numbers(page_ranges=page_ranges)
                    ],
                    get_caption=lambda path: int(field.stem(path)) - 16,
                    force=False,
                ),
                "<hr/>",
            ),
            # Audio.
            # TODO: Label the per-dialect audios, like you did for the front.
            field.aon(
                field.cat(
                    # Pishoy's pronunciation.
                    field.aon(
                        "Pishoy: ",
                        *[
                            field.snd(
                                keys=field.tsv(
                                    file_path="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                                    column_name="key",
                                    force=False,
                                ),
                                get_paths=pronunciations[col].get,
                                sort_paths=sorted,
                                force=False,
                            )
                            for col in dialect_cols
                        ],
                    ),
                ),
                "<hr/>",
            ),
            # Marcion's key.
            field.cat(
                field.aon(
                    "<b>Key: </b>",
                    roots_col("key", force=True),
                    " ",
                ),
                field.txt(
                    '<span id="right">'
                    '<a href="https://github.com/pishoyg/coptic/">Home</a>'
                    ", "
                    '<a href="mailto:pishoybg@gmail.com">Contact</a>'
                    "</span>"
                ),
            ),
        ),
        force_front=force_front,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def bible(deck_name: str, deck_id: int, front_dialects: list[str]):

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def tsv_column(col_name: str, force: bool = True) -> field.tsv:
        return field.tsv(
            "bible/stshenouda.org/data/output/csv/bible.csv", col_name, force
        )

    def verse(language):
        return field.aon(
            f"<b>{language}</b>",
            ":",
            "<br/>",
            tsv_column(language, force=False),
            "<br/>",
            "<br/>",
        )

    assert all(dialect in BIBLE_LANGUAGES for dialect in front_dialects)

    return deck.deck(
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description="https://github.com/pishoyg/coptic/.\n" "pishoybg@gmail.com.",
        css=".card { font-size: 18px; }",
        # N.B. The name is a protected field.
        name=field.aon(
            deck_name,
            "::",
            tsv_column("section-indexed-no-testament", force=True),
            "::",
            tsv_column("book-indexed", force=True),
            "::",
            tsv_column("chapter-zfilled", force=True),
        ),
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.aon(
            "(",
            tsv_column("book", force=True),
            " ",
            tsv_column("chapter", force=True),
            ":",
            tsv_column("verse", force=False),
            ")",
        ),
        front=(
            field.cat(*[verse(lang) for lang in front_dialects])
            if len(front_dialects) > 1
            else tsv_column(front_dialects[0], force=False)
        ),
        back=field.cat(
            # Reference.
            field.aon(
                "(",
                tsv_column("book", force=True),
                " ",
                tsv_column("chapter", force=True),
                ":",
                tsv_column("verse", force=False),
                ")",
                "<br/>",
                "<br/>",
            ),
            *[verse(lang) for lang in BIBLE_LANGUAGES if lang not in front_dialects],
        ),
        force_single_deck=False,
        force_key=False,
        force_no_duplicate_keys=False,
        force_front=False,
        force_back=False,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def copticsite_com(deck_name: str, deck_id: int):
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def tsv_col(col_name: str, force: bool = True) -> field.tsv:
        return field.tsv(
            "dictionary/copticsite.com/data/output/output.tsv", col_name, force=force
        )

    return deck.deck(
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description="https://github.com/pishoyg/coptic/.\n" "pishoybg@gmail.com.",
        css=".card { text-align: center; font-size: 18px; }",
        # N.B. The name is a protected field, although it is unused in this case
        # because we generate a single deck, thus the deck name is a constant for
        # all notes.
        name=None,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.seq(),
        front=tsv_col("prettify", force=False),
        back=field.cat(
            field.aon(
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
                "<br/>",
            ),
            tsv_col("Meaning", force=False),
        ),
        force_front=False,
        force_back=False,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def kellia(deck_name: str, deck_id: int, tsv_basename: str):
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def tsv_col(col_name: str, force: bool = True) -> field.tsv:
        return field.tsv(
            f"dictionary/kellia.uni-goettingen.de/data/output/{tsv_basename}.tsv",
            col_name,
            force=force,
        )

    return deck.deck(
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description="https://github.com/pishoyg/coptic/.\n" "pishoybg@gmail.com.",
        css=".card { font-size: 18px; }"
        ".table { display: block; width: 100%; text-align: center; }"
        "#orth { min-width: 120px; }"
        "#geo { text-align: center; color: darkred; min-width: 40px; }"
        "#gram_grp { color: gray; font-style: italic; }"
        "#sense_n { display: none; }"
        "#sense_id { display: none; }"
        "#quote { }"
        "#definition { }"
        "#bibl { color: gray; float: right; text-align: right; min-width: 100px; }"
        "#ref { color: gray; }"
        "#meaning { min-width: 220px; }"
        "#ref_xr { }"
        "#xr { color: gray; }"
        "#lang { color: gray }",
        # N.B. The name is a protected field, although it is unused in this case
        # because we generate a single deck, thus the deck name is a constant for
        # all notes.
        name=None,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=tsv_col("entry_xml_id"),
        front=tsv_col("orthstring-pishoy"),
        back=field.cat(
            field.cat(
                tsv_col("merged-pishoy"),
                tsv_col("etym_string-processed", force=False),
                "<hr/>",
            ),
            field.aon(
                "Coptic Dictionary Online: ",
                '<a href="',
                tsv_col("cdo"),
                '">',
                tsv_col("entry_xml_id"),
                "</a>",
            ),
        ),
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
BIBLE_BOHAIRIC = "Bible::Bohairic"
BIBLE_SAHIDIC = "Bible::Sahidic"
BIBLE_ALL = "Bible::All Dialects"
COPTICSITE_NAME = "copticsite.com"
KELLIA_COMPREHENSIVE = "KELLIA::Comprehensive"
KELLIA_EGYPTIAN = "KELLIA::Egyptian"
KELLIA_GREEK = "KELLIA::Greek"

LAMBDAS = {
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
    CRUM_ALL: lambda deck_name: crum(
        deck_name,
        1284010387,
        ["word-parsed-prettify"],
    ),
    BIBLE_BOHAIRIC: lambda deck_name: bible(deck_name, 1284010384, ["Bohairic"]),
    BIBLE_SAHIDIC: lambda deck_name: bible(deck_name, 1284010388, ["Sahidic"]),
    BIBLE_ALL: lambda deck_name: bible(
        deck_name,
        1284010389,
        [lang for lang in BIBLE_LANGUAGES if lang != "English" and lang != "Greek"],
    ),
    COPTICSITE_NAME: lambda deck_name: copticsite_com(deck_name, 1284010385),
    KELLIA_COMPREHENSIVE: lambda deck_name: kellia(
        deck_name, 1284010391, "comprehensive"
    ),
    KELLIA_EGYPTIAN: lambda deck_name: kellia(deck_name, 1284010392, "egyptian"),
    KELLIA_GREEK: lambda deck_name: kellia(deck_name, 1284010393, "greek"),
}


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def DECKS(deck_names: typing.Optional[list[str]]):
    if deck_names is None:
        return [lam(name) for name, lam in LAMBDAS.items()]
    assert deck_names
    return [LAMBDAS[name](name) for name in deck_names]
