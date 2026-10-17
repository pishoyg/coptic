"""Process our transcription of Kasser's Compléments and Morphologiques.

Kasser published two supplements to Crum's dictionary:
- Compléments au dictionnaire copte de Crum (IFAO, 1964).
- Compléments morphologiques au dictionnaire de Crum (BIFAO 64, 1966).
"""

import enum
import functools
import pathlib
import typing
from collections import abc

import regex

from dictionary import cls as dict_cls
from dictionary.marcion_sourceforge_net import cls, ids, randy
from utils import ensure, file, log, page, paths

# RAW_RE should match a raw entry.
# All non-Latin text is expected to be surrounded by double square brackets.
# Outside of double square brackets, there should remain only Latin text, drawn
# from the alphabet below. RAW_RE can be used to verify this structure.
RAW_RE: regex.Pattern[str] = regex.compile(
    "|".join(
        (
            r"\[\[.*?\]\]",
            # The backslash is only used in our notation, but should be absent
            # from the output.
            # TODO: (#786) Mathematical angle brackets are used by the
            # materialization. If Kasser were to get materialized, we might want
            # to change the materializer's notation to avoid confusion.
            r"[\p{Latin}=^0-9 *⟨⟩!–'(),\-./:;?\[\]_~«»\\°&]",
        ),
    ),
)

# The languages we recognize. Each name is spelled as it appears in the
# Unicode names of the characters belonging to the language, because
# `randy.Languages.identify` identifies a text by searching those names for it.
# Latin text inside brackets is a siglum, and is handled separately. See
# `replace_siglum`.
Language: typing.TypeAlias = typing.Literal[
    "GREEK",
    "COPTIC",
]

# A language's alphabet is the character-class atoms — single characters,
# ranges, and Unicode property classes — that its text may be built from. Text
# belongs to a language when every one of its characters is drawn from that
# language's alphabet.
#
# NOTE: We spell the alphabets out, rather than reaching for `\p{Script=...}`
# and `\p{M}`, so that the pipeline enforces a limited, reviewed inventory. A
# character that nobody has vetted fails validation instead of slipping in
# unnoticed, and `_ALPHABETS` doubles as the record of what our transcription
# actually employs.
#
# NOTE: Entry order is load-bearing for language determination. A text is
# assigned the first language that any of its characters belongs to.
# NOTE: An atom is inserted into a character class verbatim, so a literal `-`,
# `]` or `^` has to be written escaped. Order within a character class is
# meaningless.
_ALPHABETS: dict[Language, tuple[str, ...]] = {
    "GREEK": (
        "α-ω",  # The Greek letters, final sigma included,
        "Α-Ρ",  # and their capitals, split in two because U+03A2
        "Σ-Ω",  # is unassigned.
        "\u0300",  # Grave accent.
        "\u0301",  # Acute accent.
        "\u0308",  # Diaeresis.
        "\u0313",  # Comma above, the smooth breathing.
        "\u0314",  # Reversed comma above, the rough breathing.
        "\u0342",  # Perispomeni.
        "\u0345",  # Ypogegrammeni.
        " ",
        ".",  # A lacuna: ...θυμιῶσαι.
    ),
    "COPTIC": (
        # See The Unicode Standard, ch. 7, Supralineation:
        # https://unicode.org/versions/Unicode16.0.0/core-spec/chapter-7/#G16256
        "\u0304",  # Macron, the syllabic stroke: ⲕⲱⲗ̄ⲡ.
        "\u0305",  # Overline, for numerals: ⲓ̅ⲃ̅.
        "\ufe24",  # Macron left half, opening a nomen sacrum's stroke.
        "\ufe25",  # Macron right half, closing it.
        "\ufe26",  # Conjoining macron, continuing it: ⲏ︤ⲗ︦ⲉ︦ⲙ︦ⲁ︦ⲥ︥.
        "\u0308",  # Diaeresis, over ⲓ̈.
        "\u0323",  # Dot below, marking an uncertain letter: ⲗⲁⲕⲟ̣.ⲧ.
        "ⲁ-ⲱ",  # The Coptic letters,
        "ϣ-ϯ",  # those of them borrowed from Demotic,
        "ⳉ",  # Akhmimic khei,
        "ⳤ",  # the kai symbol,
        "ⲹ",  # and the letters of dialect P: kapa,
        "ⲻ",  # ni,
        "ⲳ",  # alef,
        "ⳋ",  # and hori.
        # TODO: (#786) Dialect P has a fifth letter, a kapa with a hook that
        # stands for ϭ (Morphologiques, p. 20). Pick a character for it.
        "ⳓ",  # Old Coptic hei.
        "⸗",  # Double oblique hyphen, marking a pronominal form,
        "†",  # and dagger, marking a qualitative one.
        " ",
        ".",
        "?",  # An uncertain lacuna: ⲛ[?].
        "/",  # An abbreviation: ⲉⲅⲣⲁⲫ/.
        "(",
        ")",
        # Angle brackets mark letters supplied by the editor: ⲛⲁ⟨ⲧ⟩ϩⲁⲡ.
        # TODO: (#786) The materialization (`wiki.ts`) uses angle brackets to
        # delimit a language span. If we were to materialize Kasser, it should
        # perhaps pick a different symbol.
        # NOTE: Kasser also writes `⟨sim.⟩`, which "indique qu'une partie du
        # mot a été omise (ou redoublée vraisemblablement par haplographie (ou
        # dittographie), suivant ou précédant un groupe de lettres similaires"
        # (Sigles et Abréviations). We have chosen to keep `⟨sim.⟩`, along with
        # a hyphen that follows it, out of the Coptic word: `⟨sim.⟩[[ⲓⲛⲉ]]`,
        # `[[ⲕⲧ]]⟨sim.⟩-`.
        # TODO: (#786) Revisit this decision. `⟨sim.⟩` marks an omission or a
        # repetition within the word, so it arguably belongs to the word, and
        # the hyphen that follows it certainly does.
        "⟨",
        "⟩",
        "\\-",
        "\\[",  # Square brackets mark a lacuna, or, in the Morphologiques,
        "\\]",  # the Crum lemma that an entry falls under.
    ),
}


class Languages(randy.Languages[Language]):
    """The languages that the bracketed text of a transcription may be in."""

    @typing.override
    def normalize_for_validation(self, language: Language, text: str) -> str:
        text = super().normalize_for_validation(language, text)
        # An asterisk marks a Coptic form as a reconstruction. It sits inside
        # the brackets, at the very beginning, and is substituted later.
        if language == "COPTIC":
            text = text.removeprefix("*")
        return text


_LANGUAGES: Languages = Languages(
    typing.get_args(Language),
    _ALPHABETS,
    {
        "GREEK": cls.GREEK,
        "COPTIC": cls.COPTIC,
    },
)


def replace_bracketed(match: regex.Match[str]) -> str:
    return _LANGUAGES.span(match.group(1))


# A siglum consists of an optional asterisk, a base, then any sequence of
# superscripts (`^`) and subscripts (`~`), each of which runs up to the next
# marker or the end of the siglum.
# A² is a base of its own. Kasser prints its 2 as a superscript, and so do we.
_SIGLUM_RE: regex.Pattern[str] = regex.compile(
    r"(\*)?(A\^2|\p{Latin})((?:[\^~][^\^~]+)*)",
)
_SIGLUM_MARK_RE: regex.Pattern[str] = regex.compile(r"([\^~])([^\^~]+)")

_BASES: list[str] = [
    "S",  # Sahidic
    "A",  # Akhmimic
    "A^2",  # Lycopolitan (Subakhmimic)
    "B",  # Bohairic
    "F",  # Fayyumic
    "M",  # Middle Egyptian (Kahle's)
    "P",  # The dialect of P. Bodmer VI (Proverbs)
    "H",  # Hermopolitan (Kasser's "achmouninique")
    "G",  # Kasser's G, closest to Bohairic
    "O",  # Old Coptic
]
# NOTE: Kasser's X only occurs as a superscript.
_SUPERSCRIPTS: list[str] = [
    "a",
    "b",
    "f",
    "h",
    "m",
    "o",
    "s",
    "x",
    "sx",
    "xm",
    "xs",
    "·a",
    ":f",
    ":s",
    ":sx",
]
_SUBSCRIPTS: list[str] = [
    "o",
    "vl",
    "vl?",
    "o·vl",
    "(h)",
    "(hl)",
    "(qq)",
    "(vl ?)",
    "o(h)",
    "o(h ?)",
    "o(qq)",
    "o(vl)",
    "o(vl ?)",
    "(vl)",
    "vl·o",
]
_CANONICAL: dict[str, str] = {"A^2": "L"}


def replace_siglum(match: regex.Match[str]) -> str:
    text: str = match.group(1)
    del match
    siglum: regex.Match[str] | None = _SIGLUM_RE.fullmatch(text)
    ensure.ensure(siglum, "invalid siglum:", repr(text))
    assert siglum
    asterisk, base, marks = siglum.groups()
    ensure.ensure(base in _BASES, "unknown siglum base:", base, "in", text)
    html: list[str] = [page.ASTERISK if asterisk else ""]
    html.append(base.replace("^2", "<sup>2</sup>"))
    for marker, mark in _SIGLUM_MARK_RE.findall(marks):
        if marker == "^":
            ensure.ensure(
                mark in _SUPERSCRIPTS,
                "unknown superscript:",
                mark,
                "in",
                text,
            )
            html.append(f"<sup>{mark}</sup>")
            continue
        assert marker == "~"
        ensure.ensure(
            mark in _SUBSCRIPTS,
            "unknown subscript:",
            mark,
            "in",
            text,
        )
        html.append(f"<sub>{mark}</sub>")
    klass: str = _CANONICAL.get(base, base)
    return f'<span class="{dict_cls.DIALECT} {klass}">{"".join(html)}</span>'


def replace_subscript(match: regex.Match[str]) -> str:
    mark: str = match.group(1)
    ensure.ensure(mark in _SUBSCRIPTS, "unknown subscript:", repr(mark))
    return f"<sub>{mark}</sub>"


_ITALIC_RE: regex.Pattern[str] = regex.compile(r"[\p{Latin} .',]+")
# A gloss may contain italics, and Greek words in double square brackets, which
# are substituted (and validated) later: «... des deux cents [[κόλλαθον]]».
# Only Greek is allowed, because bracketed Coptic marks a quotation:
# «[[ϭⲁⲡⲉⲓ]] (?)».
# NOTE: A gloss can't contain single square brackets, with which Kasser
# supplies a word in a translation: «... mêlée à elle [l'eau froide]). This
# only occurs once, in a gloss that Kasser leaves open without an ellipsis,
# which we couldn't recognize anyway. See `replace_unclosed`.
_GLOSS_RE: regex.Pattern[str] = regex.compile(
    r"(?:[\p{Latin} ',\-.?!()_:]|\[\[[\p{Greek}\p{M} .]+\]\])+",
)


def replace_italic(match: regex.Match[str]) -> str:
    italic: str = match.group(2)
    ensure.fullmatch(_ITALIC_RE, italic, "italic")
    return f"<i>{italic}</i>"


# NOTE: Guillemets enclose either a gloss or a quotation, such as the text of
# Crum's that a correction deletes or inserts.
# We tell them apart by their content: whatever matches `_GLOSS_RE` is a gloss.
# This is a heuristic that happens to be correct so far, although it's
# possible that cases in the remainder of the book will violate it. A gloss
# straying outside `_GLOSS_RE` would be taken for a quotation (which `_gloss`
# reports), but a quotation that fits it would pass for a gloss unnoticed.
_GUILLEMETS_SUB_RE: str = r"«((?:[^«»()]|\([^()]*\))*?)»"
# Kasser leaves a gloss open when it translates a quotation that breaks off, in
# which case it ends in an ellipsis. It runs no further than the parenthesis
# that encloses it, though it may stop short of it.
_UNCLOSED_SUB_RE: str = r"«((?:[^«»()]|\([^()]*\))*\.\.\.)?"


# The guillemets aren't part of the gloss, so they get a class of their own.
# They are written as character references, so that a stray guillemet trips the
# ban.
_OPEN_GUILLEMET: str = f'<span class="{cls.GUILLEMET}">&laquo;</span>'
_CLOSE_GUILLEMET: str = f'<span class="{cls.GUILLEMET}">&raquo;</span>'


def _gloss(match: regex.Match[str]) -> str:
    text: str = match.group(1)
    if _GLOSS_RE.fullmatch(text):
        return f'<span class="{cls.GLOSS}">{text}</span>'
    # The guess may be wrong. See `_GUILLEMETS_SUB_RE`.
    log.warn(
        "guillemets taken for a quotation:",
        repr(text),
        "in",
        match.string,
    )
    return text


def replace_guillemets(match: regex.Match[str]) -> str:
    return _OPEN_GUILLEMET + _gloss(match) + _CLOSE_GUILLEMET


def replace_unclosed(match: regex.Match[str]) -> str:
    if match.group(1) is None:
        log.warn("unclosed guillemet without an ellipsis:", match.string)
        return _OPEN_GUILLEMET
    return _OPEN_GUILLEMET + _gloss(match)


_SUBSTITUTIONS: list[randy.Substitution] = [
    # Replace occurrences of ampersand with the HTML encoding.
    # NOTE: The ampersand substitution must precede the substitutions that
    # produce character references, which it would otherwise escape. As a
    # result, the others see an ampersand as escaped.
    randy.Substitution("&", "&amp;", ban=["&amp;amp"]),
    # NOTE: The guillemet substitutions must precede the italic one, so that
    # they see the italics within a gloss as typed. Closed guillemets must be
    # substituted before unclosed ones.
    randy.Substitution(_GUILLEMETS_SUB_RE, replace_guillemets, ban=["«", "»"]),
    randy.Substitution(_UNCLOSED_SUB_RE, replace_unclosed, ban=["«", "»"]),
    # The transcription may italicize with a single underscore or a double one.
    # Whatever the distinction it intends, we render both alike.
    randy.Substitution(r"(__?)(.+?)\1", replace_italic, ban=["_"]),
    # A double-bracketed text that starts with a Latin letter (optionally
    # preceded by an asterisk) is a siglum. The siglum substitution must
    # precede the language one.
    randy.Substitution(
        randy.bracketed(r"(\*?\p{Latin}[^\[\]]*)"),
        replace_siglum,
        ban=["^"],
    ),
    randy.Substitution(
        randy.bracketed(r"(.*?)"),
        replace_bracketed,
        ban=["[[", "]]"],
    ),
    # An asterisk may also occur outside brackets, e.g. before a reference:
    # (*Jr Bal.146).
    # NOTE: The asterisk substitution must follow the siglum and language ones,
    # which expect to find the asterisk inside the brackets.
    randy.Substitution(r"\*", page.ASTERISK, ban=["*"]),
    # Outside sigla, a subscript occurs in the manuscript numbers M₁ to M₁₀ and
    # G₂ to G₄ (see Kasser's Sigles et Abréviations), and in a qualifier that
    # follows a form or a reference, which is usually parenthesized:
    # [[ⲁⲁ]]~(h), (ManiP~(qq)), (C 206,46 ~vl?).
    # NOTE: The subscript substitutions must follow the siglum one.
    # TODO: (#0) Simplify subscript substitutions. A single substitution should
    # suffice, even if it's more permissive than three narrow ones.
    randy.Substitution(r"M~([1-9]|10)(?!\d)", r"M<sub>\1</sub>", ban=["~"]),
    randy.Substitution(r"G~([2-4])(?!\d)", r"G<sub>\1</sub>", ban=["~"]),
    # TODO: (#786) Where the subscript represents a dialect subscript that
    # simply happens to lack the siglum (e.g. `~(h)` instead of `S~h`), it may
    # be appropriate to still give it the same treatment as a dialect siglum.
    # This would also help us avoid hardcoding `vl?` below, since all orphan
    # subscripts will be treated uniformly.
    randy.Substitution(r"~(\([^()]+\)|vl\?)", replace_subscript, ban=["~"]),
    randy.PARAGRAPH,
    randy.SUPERSCRIPT,
]


class Col(enum.StrEnum):
    """Name of a column in the Kasser sheets that the pipeline reads.

    Both sheets share the same columns. The order is that of the sheets, and
    the snapshots retain it.
    """

    KASSER = "Kasser"
    MARCION = "Marcion"
    VIDE = "_v_"
    ENTRY = "Entry"


class Book(enum.StrEnum):
    """A book of Kasser's. The value is the HTML class of its element."""

    COMPLEMENTS = cls.COMPLEMENTS
    MORPHOLOGIQUES = cls.MORPHOLOGIQUES


# Each book has a sheet of its own, and therefore a snapshot of its own.
TSV: dict[Book, pathlib.Path] = {
    Book.COMPLEMENTS: paths.KASSER_COMPLEMENTS_TSV,
    Book.MORPHOLOGIQUES: paths.KASSER_MORPHOLOGIQUES_TSV,
}
ensure.equal_sets(Book, TSV.keys(), "Kasser snapshots")

# Each book's entries are rendered under an element of its own.
ID: dict[Book, str] = {
    Book.COMPLEMENTS: ids.COMPLEMENTS,
    Book.MORPHOLOGIQUES: ids.MORPHOLOGIQUES,
}
ensure.equal_sets(Book, ID.keys(), "Kasser element ids")


class _ComplementsColumn(randy.Column):
    FIRST = 1
    LAST = 115


class _MorphologiquesColumn(randy.Column):
    FIRST = 25
    LAST = 66


COLUMN: dict[Book, type[randy.Column]] = {
    Book.COMPLEMENTS: _ComplementsColumn,
    Book.MORPHOLOGIQUES: _MorphologiquesColumn,
}
ensure.equal_sets(Book, COLUMN.keys(), "Kasser columns")


@typing.final
class Entry(randy.Entry[randy.Column]):
    """Entry represents an entry in the Kasser sheet."""

    def __init__(
        self,
        record: dict[typing.Hashable, typing.Any],
        book: Book,
    ) -> None:
        self.book: Book = book
        super().__init__(
            COLUMN[book](record[Col.KASSER]),
            record[Col.ENTRY],
            record[Col.MARCION],
            record[Col.VIDE],
            RAW_RE,
        )

        ensure.ensure(
            self.entry == self.entry.strip(),
            self,
            "has a leading or trailing space",
        )
        ensure.ensure(
            "  " not in self.entry,
            self,
            "has a double space",
        )

    @typing.override
    def subs(self) -> abc.Generator[randy.Substitution]:
        yield from _SUBSTITUTIONS
        # Kasser's addenda span only two pages, without columns, so the page is
        # always inferred, and an addendum can't name one.
        yield self.addendum_substitution()

    @property
    @typing.override
    def addenda_page(self) -> str:
        # Only the Compléments has addenda. Those for pages up to 35 are on
        # page 115, and those for pages from 47 onward are on page 116. Pages
        # 36 to 46 have none.
        ensure.ensure(
            self.book == Book.COMPLEMENTS,
            self,
            "has an addendum, but the",
            self.book,
            "has no addenda",
        )
        num: int = self.page.num()
        if num <= 35:
            return "115"
        ensure.ensure(
            num >= 47,
            self,
            "has an addendum, but its page has no addenda",
        )
        return "116"

    @typing.override
    def __str__(self) -> str:
        return f"{self.book} {self.page} {self.entry}"


@functools.cache
def entries(book: Book) -> list[Entry]:
    """Read the entries of a book's sheet snapshot.

    Every row is validated, but only those with an entry are returned. A row
    with no entry is not yet transcribed, and has nothing to render.

    Args:
        book: The book whose snapshot to read.

    Returns:
        The entries that have text.
    """
    records: list[dict[typing.Hashable, typing.Any]] = file.read_tsv(
        TSV[book],
    ).to_dict(orient="records")
    es: list[Entry] = [Entry(r, book) for r in records]
    return [e for e in es if e.entry]


@functools.cache
def by_marcion_key(book: Book) -> dict[str, list[Entry]]:
    return randy.by_marcion_key(entries(book))


def root_html(key: str) -> abc.Generator[str]:
    """Render the Kasser entries of a Marcion root.

    Args:
        key: The root's Marcion key.

    Yields:
        The Kasser element, or nothing if neither book has an entry for the
        root.
    """
    # TODO: (#786) Index the Kasser entries in Xooxle. (They're currently in the
    # `Appendix`, but may be more suitable for a separate layer.)
    books: dict[Book, list[Entry]] = {
        book: by_marcion_key(book).get(key, []) for book in Book
    }
    if not any(books.values()):
        return
    yield f'<div class="{cls.KASSER}" id="{ids.KASSER}">'
    for book, es in books.items():
        if not es:
            continue
        yield f'<div class="{book}" id="{ID[book]}">'
        yield from randy.columns(cls.KASSER_PAGE, es)
        yield "</div>"
    yield "</div>"
