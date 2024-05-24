import itertools
import typing

import deck
import field
import type_enforced

NUM_COLS = 10
MAX_DERIVATION_DEPTH = 4

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

    def derivations_col(col_name: str, force: bool = True) -> field.grp:
        return field.grp(
            key_file_path="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
            key_col_name="key",
            group_file_path="dictionary/marcion.sourceforge.net/data/output/derivations.tsv",
            group_by_col_name="key_word",
            select_col=col_name,
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
        ".nightMode #bordered { border:1px solid white; }",
        # N.B. The name is a protected field, although it is unused in this
        # case because we generate a single deck, thus the deck name is a
        # constant for all notes.
        name=None,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=roots_col("key", force=True),
        front=roots_col(front_column),
        back=field.cat(
            # Type.
            field.aon(
                "(",
                "<b>",
                roots_col("type-parsed", force=True),
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
                roots_col("word-parsed-no-ref", force=True),
                "<hr>",
            ),
            # Full meaning.
            field.aon(
                "<b>Meaning:</b>",
                "<br>",
                roots_col("en-parsed"),
                "<hr>",
            ),
            field.cat(
                "<b>Crum: </b>",
                roots_col("crum", force=True),
            ),
            field.apl(
                build_tree,
                derivations_col("depth", force=True),
                derivations_col("word-parsed-prettify", force=False),
                derivations_col("type-parsed", force=True),
                derivations_col("en-parsed", force=False),
                derivations_col("crum", force=True),
            ),
            # Crum's entry.
            field.img(
                "dictionary/marcion.sourceforge.net/data/output/roots.tsv",
                "crum-pages",
                "dictionary/marcion.sourceforge.net/data/crum",
                "numexpr({key}+20).png",
                "KEY",
                None,
                force=False,
            ),
            field.txt("<hr>"),
            # Marcion's key.
            field.aon(
                "<b>Key: </b>",
                roots_col("key", force=True),
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
    def tsv_col(col_name: str, force: bool = False) -> field.tsv:
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


class derivation:
    def __init__(self, depth, word, type, meaning, crum):
        depth = int(depth)
        assert depth >= 0 and depth <= MAX_DERIVATION_DEPTH
        assert type
        assert crum

        self.depth = depth
        self.word = word
        self.type = type
        self.meaning = meaning
        self.crum = crum


@type_enforced.Enforcer
def build_crum_row_spans(derivations: list[derivation]) -> list[tuple[str, int]]:
    crum_column = [d.crum for d in derivations]
    out = []
    for group in itertools.groupby(crum_column):
        # Validate that all elements are equal.
        crum = group[0]
        repetitions = len(list(group[1]))
        out.append((crum, repetitions))
        for _ in range(repetitions - 1):
            out.append(("", 0))
    return out


@type_enforced.Enforcer
def build_tree(*columns: list[str]) -> str:
    """
    derivations is a set of exactly five columns, each representing one field,
    namely:
        - depth
        - word-parsed-prettify
        - type-parsed
        - en-parsed
        - crum
    They are expected to be pre-sorted, and to belong to a single word.
    """
    # TODO: Prettify the HTML.
    assert len(columns) == 5
    num_rows = len(columns[0])
    assert all(len(column) == num_rows for column in columns)
    derivations = [derivation(*row) for row in zip(*columns)]
    crum_row_spans = build_crum_row_spans(derivations)

    out = []
    out.extend(
        [
            "<table>",
            "<colgroup>",
        ]
    )
    out.extend([f'<col width="{100/NUM_COLS}%">'] * NUM_COLS)
    out.extend(["</colgroup>"])

    for d, crum_row_span in zip(derivations, crum_row_spans):
        crum, crum_span = crum_row_span
        assert bool(crum) == bool(crum_span)
        word_width = int((NUM_COLS - d.depth) / 2) if d.word else 0
        # TODO: Handle the case when the meaning is absent.
        meaning_width = NUM_COLS - word_width - d.depth - 1
        out.extend(
            [
                # New row.
                "<tr>",
                # Margin.
                f'<td colspan="{d.depth}"></td>' if d.depth else "",
                # Word.
                (
                    f'<td colspan="{word_width}" id="bordered">{d.word}</td>'
                    if word_width
                    else ""
                ),
                # Meaning.
                f'<td colspan="{meaning_width}" id="bordered">',
                # TODO: Retrieve these types from Marcion rather than hardcode
                # them here.
                f"<b>({d.type})</b><br>" if d.type not in ["-", "HEADER"] else "",
                d.meaning,
                "</td>",
                (
                    f'<td rowspan="{crum_span}" id="bordered"><b>Crum: </b>{crum}</td>'
                    if crum_span
                    else ""
                ),
                # End row.
                "</tr>",
            ]
        )
    out.append("</table>")
    out = " ".join(out)
    return out


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
        deck_name, 1284010383, "dialect-B", allow_no_front=True
    ),
    CRUM_SAHIDIC: lambda deck_name: crum(
        deck_name, 1284010386, "dialect-S", allow_no_front=True
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
