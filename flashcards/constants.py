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
def crum(deck_name: str, deck_id: int, front_column: str, force_front: bool):
    return deck.deck(
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description="URL: https://github.com/pishoyg/coptic/.\n"
        "Contact: pishoybg@gmail.com.",
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
        key=field.tsv(
            "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
            "key",
        ),
        front=field.tsv(
            "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
            front_column,
        ),
        back=field.cat(
            # Type.
            field.aon(
                field.txt("("),
                field.txt("<b>"),
                field.tsv(
                    "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                    "type-parsed",
                ),
                field.txt("</b>"),
                field.txt(")"),
                field.txt("<br>"),
            ),
            # Meaning.
            field.aon(
                field.tsv(
                    "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                    "en-parsed-no-greek",
                ),
                field.txt("<br>"),
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
            field.txt("<hr>"),
            # Full entry.
            field.aon(
                field.txt("<b>Word:</b>"),
                field.txt("<br>"),
                field.tsv(
                    "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                    "word-parsed-no-ref",
                ),
                field.txt("<hr>"),
            ),
            # Full meaning.
            field.aon(
                field.txt("<b>Meaning:</b>"),
                field.txt("<br>"),
                field.tsv(
                    "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                    "en-parsed",
                ),
                field.txt("<hr>"),
            ),
            # Crum's entry.
            field.aon(
                field.txt("<b>Crum: </b>"),
                field.tsv(
                    "dictionary/marcion.sourceforge.net/data/output/roots.tsv", "crum"
                ),
                field.txt("<br>"),
                field.img(
                    "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                    "crum-pages",
                    "dictionary/marcion.sourceforge.net/data/crum",
                    "numexpr({key}+20).png",
                    "KEY",
                ),
                field.txt("<hr>"),
            ),
            # Marcion's key.
            field.aon(
                field.txt("<b>Key: </b>"),
                field.tsv(
                    "dictionary/marcion.sourceforge.net/data/output/roots.tsv", "key"
                ),
            ),
        ),
        force_single_deck=True,
        force_key=True,
        force_no_duplicate_keys=True,
        force_front=force_front,
        force_back=True,
    )


@type_enforced.Enforcer
def bible(deck_name: str, deck_id: int, front_dialects: list[str]):

    def tsv_column(col_name):
        return field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", col_name)

    def verse(language):
        return field.aon(
            field.txt(f"<b>{language}</b>"),
            field.txt(":"),
            field.txt("<br>"),
            tsv_column(language),
            field.txt("<br>"),
            field.txt("<br>"),
        )

    assert all(dialect in BIBLE_LANGUAGES for dialect in front_dialects)

    return deck.deck(
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description="URL: https://github.com/pishoyg/coptic/.\n"
        "Contact: pishoybg@gmail.com.",
        css=".card { font-size: 18px; }",
        # N.B. The name is a protected field.
        name=field.aon(
            field.txt(deck_name),
            field.txt("::"),
            tsv_column("section-indexed-no-testament"),
            field.txt("::"),
            tsv_column("book-indexed"),
            field.txt("::"),
            tsv_column("chapter-zfilled"),
        ),
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.aon(
            field.txt("("),
            tsv_column("book"),
            field.txt(" "),
            tsv_column("chapter"),
            field.txt(":"),
            tsv_column("verse"),
            field.txt(")"),
        ),
        front=(
            field.cat(*[verse(lang) for lang in front_dialects])
            if len(front_dialects) > 1
            else tsv_column(front_dialects[0])
        ),
        back=field.cat(
            # Reference.
            field.aon(
                field.txt("("),
                tsv_column("book"),
                field.txt(" "),
                tsv_column("chapter"),
                field.txt(":"),
                tsv_column("verse"),
                field.txt(")"),
                field.txt("<br>"),
                field.txt("<br>"),
            ),
            *[verse(lang) for lang in BIBLE_LANGUAGES if lang not in front_dialects],
        ),
    )


@type_enforced.Enforcer
def copticsite_com(deck_name: str, deck_id: int):
    return deck.deck(
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description="URL: https://github.com/pishoyg/coptic/.\n"
        "Contact: pishoybg@gmail.com.",
        css=".card { text-align: center; }",
        # N.B. The name is a protected field, although it is unused in this case
        # because we generate a single deck, thus the deck name is a constant for
        # all notes.
        name=None,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.seq(),
        front=field.tsv(
            "dictionary/copticsite.com/data/output/output.tsv",
            "prettify",
        ),
        back=field.cat(
            field.aon(
                field.txt("("),
                field.txt("<b>"),
                field.cat(
                    field.tsv(
                        "dictionary/copticsite.com/data/output/output.tsv", "Word Kind"
                    ),
                    field.aon(
                        field.txt(" - "),
                        field.tsv(
                            "dictionary/copticsite.com/data/output/output.tsv",
                            "Word Gender",
                        ),
                    ),
                    field.aon(
                        field.txt(" - "),
                        field.tsv(
                            "dictionary/copticsite.com/data/output/output.tsv", "Origin"
                        ),
                    ),
                ),
                field.txt("</b>"),
                field.txt(")"),
                field.txt("<br>"),
            ),
            field.tsv("dictionary/copticsite.com/data/output/output.tsv", "Meaning"),
        ),
        force_single_deck=True,
        force_key=True,
        force_no_duplicate_keys=True,
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
    "A Coptic Dictionary::Bohairic", 1284010383, "dialect-B", force_front=False
)
SAHIDIC_CRUM = crum(
    "A Coptic Dictionary::Sahidic", 1284010386, "dialect-S", force_front=False
)
CRUM_ALL = crum(
    "A Coptic Dictionary::All Dialects",
    1284010387,
    "word-parsed-prettify",
    force_front=True,
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
