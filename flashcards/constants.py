import deck
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


@type_enforced.Enforcer
def crum(deck_name: str, deck_id: int, front_column: str, allow_no_front: bool = False):

    @type_enforced.Enforcer
    def roots_col(col_name: str, force: bool = False) -> field.tsv:
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
        "figure {display: inline-block; border: 1px transparent; margin: 10px; }"
        "figure figcaption { text-align: center; }"
        "figure img { vertical-align: top; }",
        # N.B. The name is a protected field, although it is unused in this
        # case because we generate a single deck, thus the deck name is a
        # constant for all notes.
        name=None,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=roots_col("key"),
        front=roots_col(front_column),
        back=field.cat(
            # Type.
            field.aon(
                "(",
                "<b>",
                roots_col("type-parsed"),
                "</b>",
                ")",
                "<br>",
            ),
            # Meaning.
            field.aon(
                roots_col("en-parsed-no-greek"),
                "<br>",
            ),
            # Image.
            field.img(
                "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                "key",
                "dictionary/marcion.sourceforge.net/data/img",
                "{key}-*.*",
                "STEM",
                300,
            ),
            # Horizonal line.
            "<hr>",
            # Full entry.
            field.aon(
                "<b>Word:</b>",
                "<br>",
                roots_col("word-parsed-no-ref"),
                "<hr>",
            ),
            # Full meaning.
            field.aon(
                "<b>Meaning:</b>",
                "<br>",
                roots_col("en-parsed"),
                "<hr>",
            ),
            # Crum's entry.
            field.aon(
                "<b>Crum: </b>",
                roots_col("crum"),
                "<br>",
                field.img(
                    "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                    "crum-pages",
                    "dictionary/marcion.sourceforge.net/data/crum",
                    "numexpr({key}+20).png",
                    "KEY",
                    None,
                    force=True,
                ),
                "<hr>",
            ),
            # Marcion's key.
            field.aon(
                "<b>Key: </b>",
                roots_col("key"),
            ),
        ),
        allow_no_front=allow_no_front,
    )


@type_enforced.Enforcer
def bible(deck_name: str, deck_id: int, front_dialects: list[str]):

    @type_enforced.Enforcer
    def tsv_column(col_name: str, force: bool = False) -> field.tsv:
        return field.tsv(
            "bible/stshenouda.org/data/output/csv/bible.csv", col_name, force
        )

    def verse(language):
        return field.aon(
            f"<b>{language}</b>",
            ":",
            "<br>",
            tsv_column(language),
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
            tsv_column("section-indexed-no-testament", True),
            "::",
            tsv_column("book-indexed", True),
            "::",
            tsv_column("chapter-zfilled", True),
        ),
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.aon(
            "(",
            tsv_column("book", True),
            " ",
            tsv_column("chapter", True),
            ":",
            tsv_column("verse"),
            ")",
        ),
        front=(
            field.cat(*[verse(lang) for lang in front_dialects])
            if len(front_dialects) > 1
            else tsv_column(front_dialects[0])
        ),
        back=field.cat(
            # Reference.
            field.aon(
                "(",
                tsv_column("book", True),
                " ",
                tsv_column("chapter", True),
                ":",
                tsv_column("verse"),
                ")",
                "<br>",
                "<br>",
            ),
            *[verse(lang) for lang in BIBLE_LANGUAGES if lang not in front_dialects],
        ),
        allow_multiple_decks=True,
        allow_no_key=True,
        allow_duplicate_keys=True,
        allow_no_front=True,
        allow_no_back=True,
    )


@type_enforced.Enforcer
def copticsite_com(deck_name: str, deck_id: int):
    @type_enforced.Enforcer
    def tsv_col(col_name: str) -> field.tsv:
        return field.tsv("dictionary/copticsite.com/data/output/output.tsv", col_name)

    return deck.deck(
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description="https://github.com/pishoyg/coptic/.\n" "pishoybg@gmail.com.",
        css=".card { text-align: center; }",
        # N.B. The name is a protected field, although it is unused in this case
        # because we generate a single deck, thus the deck name is a constant for
        # all notes.
        name=None,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.seq(),
        front=tsv_col("prettify"),
        back=field.cat(
            field.aon(
                "(",
                "<b>",
                field.cat(
                    tsv_col("Word Kind"),
                    field.aon(
                        " - ",
                        tsv_col("Word Gender"),
                    ),
                    field.aon(
                        " - ",
                        tsv_col("Origin"),
                    ),
                ),
                "</b>",
                ")",
                "<br>",
            ),
            tsv_col("Meaning"),
        ),
        allow_no_front=True,
        allow_no_back=True,
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

BOHAIRIC_CRUM = crum(
    "A Coptic Dictionary::Bohairic", 1284010383, "dialect-B", allow_no_front=True
)
SAHIDIC_CRUM = crum(
    "A Coptic Dictionary::Sahidic", 1284010386, "dialect-S", allow_no_front=True
)
CRUM_ALL = crum(
    "A Coptic Dictionary::All Dialects",
    1284010387,
    "word-parsed-prettify",
)

BOHAIRIC_BIBLE = bible("Bible::Bohairic", 1284010384, ["Bohairic"])
SAHIDIC_BIBLE = bible("Bible::Sahidic", 1284010388, ["Sahidic"])
BIBLE_ALL = bible(
    "Bible::All Dialects",
    1284010389,
    [lang for lang in BIBLE_LANGUAGES if lang != "English" and lang != "Greek"],
)

COPTICSITE_COM = copticsite_com("copticsite.com", 1284010385)

DECKS = [
    BOHAIRIC_CRUM,
    SAHIDIC_CRUM,
    CRUM_ALL,
    BOHAIRIC_BIBLE,
    SAHIDIC_BIBLE,
    BIBLE_ALL,
    COPTICSITE_COM,
]
