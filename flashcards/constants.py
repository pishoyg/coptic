import deck
import field
import type_enforced

# Deck IDs.
# N.B. These are protected fields. They are used as database keys for the
# decks. Do NOT change them!
BOHAIRIC_CRUM_ID = 1284010383
SAHIDIC_CRUM_ID = 1284010386
CRUM_ID = 1284010387
BIBLE_ID = 1284010384
COPTICSITE_COM_ID = 1284010385

# Deck Names.
# N.B. These are protected fields. They are used to generate DB keys for the
# notes, and also as deck names. Do NOT change them!
BOHAIRIC_CRUM_NAME = "Crum::Coptic Dictionary - Bohairic"
SAHIDIC_CRUM_NAME = "Crum::Coptic Dictionary - Sahidic"
CRUM_NAME = "Crum::Coptic Dictionary"
BIBLE_NAME = "Bible"
COPTICSITE_COM_NAME = "copticsite.com"

# N.B. Besides the constants defined above, the "name" and "key" fields in the
# deck generation logic are also protected.
# The "name" argument is used to generate deck names for datasets that generate
# multiple decks.
# The "key" field is used to key the notes.


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


BIBLE = deck.deck(
    deck_name=BIBLE_NAME,
    deck_id=BIBLE_ID,
    deck_description="URL: https://github.com/pishoyg/coptic/.\n"
    "Contact: pishoybg@gmail.com.",
    css=".card { font-size: 18px; }",
    # N.B. The name is a protected field.
    name=field.aon(
        field.txt(BIBLE_NAME),
        field.txt("::"),
        field.tsv(
            "bible/stshenouda.org/data/output/csv/bible.csv", "testament-indexed"
        ),
        field.txt("::"),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "section-indexed"),
        field.txt("::"),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "book-indexed"),
        field.txt("::"),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "chapter-zfilled"),
    ),
    # N.B. The key is a protected field. Do not change unless you know what
    # you're doing.
    key=field.aon(
        field.txt(BIBLE_NAME),
        field.txt("::"),
        field.txt("Bohairic"),
        field.txt(" - "),
        field.txt("("),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "book"),
        field.txt(" "),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "chapter"),
        field.txt(":"),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "verse"),
        field.txt(")"),
    ),
    front=field.aon(
        field.tsv(
            "bible/stshenouda.org/data/output/csv/bible.csv",
            "Bohairic",
        )
    ),
    back=field.cat(
        # Reference.
        field.aon(
            field.txt("("),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "book"),
            field.txt(" "),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "chapter"),
            field.txt(":"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "verse"),
            field.txt(")"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # English.
        field.aon(
            field.txt("<b>English:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "English"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # Sahidic.
        field.aon(
            field.txt("<b>Sahidic:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "Sahidic"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # Fayyumic.
        field.aon(
            field.txt("<b>Fayyumic:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "Fayyumic"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # Akhmimic.
        field.aon(
            field.txt("<b>Akhmimic:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "Akhmimic"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # OldBohairic.
        field.aon(
            field.txt("<b>OldBohairic:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "OldBohairic"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # Mesokemic.
        field.aon(
            field.txt("<b>Mesokemic:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "Mesokemic"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # DialectP.
        field.aon(
            field.txt("<b>DialectP:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "DialectP"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # Lycopolitan.
        field.aon(
            field.txt("<b>Lycopolitan:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "Lycopolitan"),
            field.txt("<br>"),
            field.txt("<br>"),
        ),
        # Greek.
        field.aon(
            field.txt("<b>Greek:</b>"),
            field.txt("<br>"),
            field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "Greek"),
        ),
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

DECKS = [BOHAIRIC_CRUM, SAHIDIC_CRUM, CRUM, BIBLE, COPTICSITE_COM]
