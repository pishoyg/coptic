import deck
import field

CRUM_BOHAIRIC = deck.deck(
    key=field.aon(
        field.txt("Crum: Bohairic Dictionary"),
        field.txt(" - "),
        field.tsv("dictionary/marcion.sourceforge.net/data/output/roots.tsv", "key"),
    ),
    front=field.tsv(
        "dictionary/marcion.sourceforge.net/data/output/roots.tsv", "dialect-B"
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
                "dictionary/marcion.sourceforge.net/data/output/roots.tsv", "en-parsed"
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
    model_name=field.txt(
        "Dictionary",
    ),
    model_id=field.txt(
        "1284010383",
    ),
    css=field.txt(
        ".card { font-size: 18px; }",
        "#front { text-align: center; }",
        "figure {display: inline-block; border: 1px transparent; margin: 10px; }",
        "figure figcaption { text-align: center; }",
        "figure img { vertical-align: top; }",
    ),
    name=field.txt(
        "Crum: Bohairic Dictionary",
    ),
    id=field.txt(
        "1284010383",
    ),
    description=field.txt(
        """URL: https://github.com/pishoyg/coptic/.
    Contact: pishoybg@gmail.com.""",
    ),
)

BIBLE = deck.deck(
    key=field.aon(
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
    model_name=field.txt(
        "Bible",
    ),
    model_id=field.txt(
        "1284010384",
    ),
    css=field.txt(
        ".card { font-size: 18px; }",
    ),
    name=field.aon(
        field.txt("Bible"),
        field.txt(":"),
        field.txt(":"),
        field.tsv(
            "bible/stshenouda.org/data/output/csv/bible.csv", "testament-indexed"
        ),
        field.txt(":"),
        field.txt(":"),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "section-indexed"),
        field.txt(":"),
        field.txt(":"),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "book-indexed"),
        field.txt(":"),
        field.txt(":"),
        field.tsv("bible/stshenouda.org/data/output/csv/bible.csv", "chapter-zfilled"),
    ),
    id=field.txt(""),
    description=field.txt(
        "URL: https://github.com/pishoyg/coptic/.\nContact: pishoybg@gmail.com.",
    ),
)

COPTICSITE_COM = deck.deck(
    key=field.seq("copticsite.com - {}", 0),
    front=field.tsv(
        "dictionary/copticsite.com/data/output/output.tsv",
        "Coptic Unicode Alphabet",
    ),
    back=field.cat(
        field.aon(
            field.txt("("),
            field.txt("<b>"),
            field.tsv("dictionary/copticsite.com/data/output/output.tsv", "Word Kind"),
            field.txt("</b>"),
            field.txt(")"),
            field.txt("<br>"),
        ),
        field.aon(
            field.txt("("),
            field.txt("<b>"),
            field.tsv(
                "dictionary/copticsite.com/data/output/output.tsv", "Word Gender"
            ),
            field.txt("</b>"),
            field.txt(")"),
            field.txt("<br>"),
        ),
        field.aon(
            field.txt("("),
            field.txt("<b>"),
            field.tsv("dictionary/copticsite.com/data/output/output.tsv", "Origin"),
            field.txt("</b>"),
            field.txt(")"),
            field.txt("<br>"),
        ),
        field.tsv("dictionary/copticsite.com/data/output/output.tsv", "Meaning"),
    ),
    model_name=field.txt(
        "copticsite.com",
    ),
    model_id=field.txt(
        "1284010385",
    ),
    css=field.txt(
        ".card { text-align: center; }",
    ),
    name=field.txt(
        "copticsite.com",
    ),
    id=field.txt(
        "1284010385",
    ),
    description=field.txt(
        """URL: https://github.com/pishoyg/coptic/.
    Contact: pishoybg@gmail.com.""",
    ),
)

DECKS = [CRUM_BOHAIRIC, BIBLE, COPTICSITE_COM]
