import glob
import re
import typing

import deck
import field
import type_enforced

CRUM_RE = re.compile(r"<b>Crum: </b>(\d+(a|b))")
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


@type_enforced.Enforcer
def crum(deck_name: str, deck_id: int, dialect_col: str, force_front: bool = True):

    @type_enforced.Enforcer
    def roots_col(col_name: str, force: bool = True) -> field.tsv:
        return field.tsv(
            "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
            col_name,
            force=force,
        )

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
        ".nightMode #bordered { border:1px solid white; }",
        # N.B. The name is a protected field, although it is unused in this
        # case because we generate a single deck, thus the deck name is a
        # constant for all notes.
        name=None,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=roots_col("key", force=True),
        front=roots_col(dialect_col, force=False),
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
                    '<a href="https://coptot.manuscriptroom.com/crum-coptic-dictionary?pageID=',
                    roots_col("crum", force=True),
                    '">',
                    roots_col("crum", force=True),
                    "</a>" "</span>",
                    "<br>",
                ),
            ),
            # Meaning.
            field.aon(
                roots_col("en-parsed-light-greek", force=False),
                "<br>",
            ),
            # Image.
            field.img(
                tsv_path="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                column_name="key",
                get_paths=lambda key: glob.glob(
                    f"dictionary/marcion.sourceforge.net/data/img-300/{key}-*-*.*"
                ),
                sort_paths=field.sort_semver,
                get_caption=field.stem,
                force=False,
            ),
            # Horizonal line.
            "<hr>",
            # Full entry.
            roots_col("word-parsed-no-ref", force=True),
            # Derivations.
            field.apl(
                add_crum_links,
                roots_col("derivations-table", force=False),
            ),
            "<hr>",
            # Crum's pages.
            field.cat(
                field.img(
                    tsv_path="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                    column_name="crum-pages",
                    get_paths=lambda page_ranges: [
                        f"dictionary/marcion.sourceforge.net/data/crum/{k+20}.png"
                        for k in field.page_numbers(page_ranges=page_ranges)
                    ],
                    sort_paths=field.sort_semver,
                    get_caption=lambda path: int(field.stem(path)) - 20,
                    force=False,
                ),
                "<hr>",
            ),
            # Audio.
            field.aon(
                field.cat(
                    # Pishoy's pronunciation.
                    field.aon(
                        "Pishoy: ",
                        field.snd(
                            tsv_path="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                            column_name="key",
                            get_paths=lambda key: glob.glob(
                                f"dictionary/marcion.sourceforge.net/data/snd-pishoy/{dialect_col}/{key}.*"
                            ),
                            sort_paths=sorted,
                            force=False,
                        ),
                    ),
                ),
                "<hr>",
            ),
            # Marcion's key.
            field.aon(
                "<b>Key: </b>",
                roots_col("key", force=True),
            ),
        ),
        force_front=force_front,
    )


@type_enforced.Enforcer
def bible(deck_name: str, deck_id: int, front_dialects: list[str]):

    @type_enforced.Enforcer
    def tsv_column(col_name: str, force: bool = True) -> field.tsv:
        return field.tsv(
            "bible/stshenouda.org/data/output/csv/bible.csv", col_name, force
        )

    def verse(language):
        return field.aon(
            f"<b>{language}</b>",
            ":",
            "<br>",
            tsv_column(language, force=False),
            "<br>",
            "<br>",
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
                "<br>",
                "<br>",
            ),
            *[verse(lang) for lang in BIBLE_LANGUAGES if lang not in front_dialects],
        ),
        force_single_deck=False,
        force_key=False,
        force_no_duplicate_keys=False,
        force_front=False,
        force_back=False,
    )


@type_enforced.Enforcer
def copticsite_com(deck_name: str, deck_id: int):
    @type_enforced.Enforcer
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
                field.cat(
                    tsv_col("Word Kind", force=False),
                    field.aon(
                        " - ",
                        tsv_col("Word Gender", force=False),
                    ),
                    field.aon(
                        " - ",
                        tsv_col("Origin", force=False),
                    ),
                ),
                "</b>",
                ")",
                "<br>",
            ),
            tsv_col("Meaning", force=False),
        ),
        force_front=False,
        force_back=False,
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
CRUM_ALL = "A Coptic Dictionary::All Dialects"
BIBLE_BOHAIRIC = "Bible::Bohairic"
BIBLE_SAHIDIC = "Bible::Sahidic"
BIBLE_ALL = "Bible::All Dialects"
COPTICSITE_NAME = "copticsite.com"

LAMBDAS = {
    CRUM_BOHAIRIC: lambda deck_name: crum(
        deck_name, 1284010383, "dialect-B", force_front=False
    ),
    CRUM_SAHIDIC: lambda deck_name: crum(
        deck_name, 1284010386, "dialect-S", force_front=False
    ),
    CRUM_ALL: lambda deck_name: crum(
        deck_name,
        1284010387,
        "word-parsed-prettify",
    ),
    BIBLE_BOHAIRIC: lambda deck_name: bible(deck_name, 1284010384, ["Bohairic"]),
    BIBLE_SAHIDIC: lambda deck_name: bible(deck_name, 1284010388, ["Sahidic"]),
    BIBLE_ALL: lambda deck_name: bible(
        deck_name,
        1284010389,
        [lang for lang in BIBLE_LANGUAGES if lang != "English" and lang != "Greek"],
    ),
    COPTICSITE_NAME: lambda deck_name: copticsite_com(deck_name, 1284010385),
}


@type_enforced.Enforcer
def DECKS(deck_names: typing.Optional[list[str]]):
    if deck_names is None:
        return [lam(name) for name, lam in LAMBDAS.items()]
    assert deck_names
    return [LAMBDAS[name](name) for name in deck_names]


@type_enforced.Enforcer
def add_crum_links(html: str) -> str:
    return CRUM_RE.sub(
        r"<b>Crum: </b>"
        r'<a href="https://coptot.manuscriptroom.com/crum-coptic-dictionary?pageID=\1">'
        r"\1"
        "</a>",
        html,
    )
