import deck
import field
import type_enforced

# Deck IDs.
# N.B. These are protected fields. They are used as database keys for the
# decks. Do NOT change them!
BOHAIRIC_CRUM_ID = 1284010383
SAHIDIC_CRUM_ID = 1284010386
CRUM_ID = 1284010387

BOHAIRIC_BIBLE_ID = 1284010384
SAHIDIC_BIBLE_ID = 1284010388
BIBLE_ID = 1284010389

COPTICSITE_COM_ID = 1284010385

# Deck Names.
# N.B. These are protected fields. They are used to generate DB keys for the
# notes, and also as deck names. Do NOT change them!
BOHAIRIC_CRUM_NAME = "Crum::Coptic Dictionary - Bohairic"
SAHIDIC_CRUM_NAME = "Crum::Coptic Dictionary - Sahidic"
CRUM_NAME = "Crum::Coptic Dictionary"

BOHAIRIC_BIBLE_NAME = "Bible - Bohairic"
SAHIDIC_BIBLE_NAME = "Bible - Sahidic"
BIBLE_NAME = "Bible"

COPTICSITE_COM_NAME = "copticsite.com"

# N.B. Besides the constants defined above, the "name" and "key" fields in the
# deck generation logic are also protected.
# The "name" argument is used to generate deck names for datasets that generate
# multiple decks.
# The "key" field is used to key the notes.

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
def crum(deck_name: str, deck_id: int, front_column: str):
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
        key=field.cat(
            field.txt(deck_name),
            field.txt(" - "),
            field.tsv(
                "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                "key",
            ),
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
    )


@type_enforced.Enforcer
def bible(deck_name: str, deck_id: int, front_dialects: list[str], nest: str):

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
            field.txt(BIBLE_NAME),
            field.txt("::"),
            field.txt(nest),
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
            field.txt(deck_name),
            field.txt(" - "),
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


COPTICSITE_COM = deck.deck(
    deck_name=COPTICSITE_COM_NAME,
    deck_id=COPTICSITE_COM_ID,
    deck_description="URL: https://github.com/pishoyg/coptic/.\n"
    "Contact: pishoybg@gmail.com.",
    css=".card { text-align: center; }",
    # N.B. The name is a protected field, although it is unused in this case
    # because we generate a single deck, thus the deck name is a constant for
    # all notes.
    name=None,
    # N.B. The key is a protected field. Do not change unless you know what
    # you're doing.
    key=field.cat(
        field.txt(COPTICSITE_COM_NAME),
        field.txt(" - "),
        field.seq(),
    ),
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
)

BOHAIRIC_CRUM = crum(BOHAIRIC_CRUM_NAME, BOHAIRIC_CRUM_ID, "dialect-B")
SAHIDIC_CRUM = crum(SAHIDIC_CRUM_NAME, SAHIDIC_CRUM_ID, "dialect-S")
CRUM = crum(CRUM_NAME, CRUM_ID, "word-parsed-prettify")

BOHAIRIC_BIBLE = bible(BOHAIRIC_BIBLE_NAME, BOHAIRIC_BIBLE_ID, ["Bohairic"], "Bohairic")
SAHIDIC_BIBLE = bible(SAHIDIC_BIBLE_NAME, SAHIDIC_BIBLE_ID, ["Sahidic"], "Sahidic")
BIBLE = bible(
    BIBLE_NAME,
    BIBLE_ID,
    [lang for lang in BIBLE_LANGUAGES if lang != "English" and lang != "Greek"],
    "Coptic",
)

DECKS = [
    BOHAIRIC_CRUM,
    SAHIDIC_CRUM,
    CRUM,
    BOHAIRIC_BIBLE,
    SAHIDIC_BIBLE,
    BIBLE,
    COPTICSITE_COM,
]
