"""Process our transcription of Kasser's Compléments and Morphologiques.

Kasser published two supplements to Crum's dictionary:
- Compléments au dictionnaire copte de Crum (IFAO, 1964).
- Compléments morphologiques au dictionnaire de Crum (BIFAO 64, 1966).
"""

# TODO: (#786) This module was forked from `wiki.py`, and duplicates much of
# it: `Substitution`, `bracketed`, `RAW_RE`, the alphabets and validators, the
# addenda, and the `Column` rendering. Move the shared parts to a common
# package, once the two have settled.

import enum
import functools
import itertools
import pathlib
import typing
import unicodedata
from collections import abc, defaultdict

import regex

from dictionary import cls as dict_cls
from dictionary.marcion_sourceforge_net import cls, ids
from utils import ensure, file, lang, orth, page, paths

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
            r"[\p{Latin}0-9 *⟨⟩!–'(),\-./:;?\[\]_~«»\\]",
        ),
    ),
)

# Coptic combining marks.
#
# Coptic uses two contrastive supralinear strokes, and Unicode gives each its
# own encoding (The Unicode Standard, ch. 7, "Supralineation"). Kasser's body
# employs the syllabic stroke, which we encode with U+0304. The overline only
# occurs in the texts he quotes, over numerals and nomina sacra.
_COPTIC_MARKS: str = (
    # Supralineation:
    "\u0304"  # Macron, the syllabic stroke: ⲕⲱⲗ̄ⲡ.
    "\u0305"  # Overline, for numerals: ⲓ̅ⲃ̅.
    "\ufe24"  # Macron left half, opening a nomen sacrum's stroke.
    "\ufe25"  # Macron right half, closing it.
    "\ufe26"  # Conjoining macron, continuing it: ⲏ︤ⲗ︦ⲉ︦ⲙ︦ⲁ︦ⲥ︥.
    # Diacritics above:
    "\u0308"  # Diaeresis, over ⲓ̈.
    # Diacritics below:
    "\u0323"  # Dot below, marking an uncertain letter: ⲗⲁⲕⲟ̣.ⲧ.
)

_SPACE_AT_TAG_BORDER_RE: regex.Pattern[str] = regex.compile(
    r"<(?!/)[^>]+> [^<]*|[^<>]* </[^>]+>",
)


class Substitution:
    """A class to represent a single regex substitution."""

    def __init__(
        self,
        pattern: str,
        repl: str | typing.Callable[[regex.Match[str]], str],
        ban: list[str] | None = None,
    ):
        """Initializes a Substitution object.

        Args:
            pattern: The regular expression pattern to search for.
            repl: The replacement string.
            ban: A list of tokens that are used for substitution, and
                can't be present in the HTML post-processing. Use this optional
                field to verify that all substitutions are well-formed.
        """
        self.pattern: regex.Pattern[str] = regex.compile(pattern)
        self.repl: str | typing.Callable[[regex.Match[str]], str] = repl
        self.ban: list[str] = ban or []

    def html(self, raw: str) -> str:
        return self.pattern.sub(self.repl, raw)


def bracketed(exp: str, repeat: int = 2) -> str:
    """Construct a regex to match text surrounded by square brackets.

    The expression will use negative lookbehind and lookahead to ensure that
    whatever character follows or precedes is not a square bracket. This is
    useful if your expression itself can contain brackets.

    Args:
        exp: Core of the expression.
        repeat: How many square brackets need to be present on each side of the
            expression.

    Returns:
        A string representing the full expression.
    """
    return r"(?<!\[)" + r"\[" * repeat + exp + r"\]" * repeat + r"(?!\])"


# The languages we recognize. Each name is spelled as it appears in the
# Unicode names of the characters belonging to the language, because
# `_language` identifies a text by searching those names for it.
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
        _COPTIC_MARKS,
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
        "⟨",
        "⟩",
        "\\-",
        "\\[",  # Square brackets mark a lacuna, or, in the Morphologiques,
        "\\]",  # the Crum lemma that an entry falls under.
    ),
}

# The HTML class used for each language.
_CLASSES: dict[Language, str] = {
    "GREEK": cls.GREEK,
    "COPTIC": cls.COPTIC,
}

ensure.equal_sets(typing.get_args(Language), _ALPHABETS.keys(), "alphabets")
ensure.equal_sets(typing.get_args(Language), _CLASSES.keys(), "classes")

# The validation pattern for text marked as belonging to each language.
_VALIDATORS: dict[Language, regex.Pattern[str]] = {
    language: regex.compile("".join(("[", *alphabet, "]+")))
    for language, alphabet in _ALPHABETS.items()
}


def _normalize_for_validation(language: Language, text: str) -> str:
    # Greek is often transcribed with precomposed characters, which are not
    # represented in our regex, so we NFD-normalize it.
    # NOTE: The Greek alphabet constrains the decomposed form only: a
    # precomposed Greek letter whose parts are all listed passes unvetted.
    if language == "GREEK":
        text = orth.normalize(text)
    return text


def _language(text: str) -> Language | None:
    text = orth.clean_diacritics(text)
    for language in _ALPHABETS:
        if lang.has_lang(language, text):
            return language
    return None


def replace_bracketed(match: regex.Match[str]) -> str:
    text: str = match.group(1)
    del match

    # An asterisk marks a Coptic form as a reconstruction. It sits inside the
    # brackets, at the very beginning.
    asterisk: str = ""
    if text.startswith("*"):
        asterisk = page.ASTERISK
        text = text.removeprefix("*")

    language: Language | None = _language(text)
    ensure.ensure(language, "unknown language:", repr(text))
    assert language

    ensure.ensure(
        not asterisk or language == "COPTIC",
        "an asterisk may only precede Coptic or a siglum:",
        repr(text),
    )

    ensure.fullmatch(
        _VALIDATORS[language],
        _normalize_for_validation(language, text),
        language,
    )

    return f'<span class="{_CLASSES[language]}">{asterisk}{text}</span>'


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
    ":sx",
]
_SUBSCRIPTS: list[str] = [
    "o",
    "vl",
    "o · vl",
    "(h)",
    "(hl)",
    "(qq)",
    "(vl ?)",
    "o(h)",
    "o(h ?)",
    "o(qq)",
    "o(vl ?)",
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
# A gloss may contain italics, which are substituted later.
_GLOSS_RE: regex.Pattern[str] = regex.compile(r"[\p{Latin} ',\-.?!()_]+")


def replace_italic(match: regex.Match[str]) -> str:
    italic: str = match.group(2)
    ensure.fullmatch(_ITALIC_RE, italic, "italic")
    return f"<i>{italic}</i>"


# A gloss opens with a guillemet, and normally closes with one. Kasser leaves a
# gloss open when it translates a quotation that breaks off, in which case it
# ends in an ellipsis, and runs up to the parenthesis that encloses it:
# (ManiP:208 [[...]] «creuse la terre avec la ...).
# Requiring the ellipsis lets a forgotten guillemet trip the ban.
# A gloss may itself contain parentheses: «(durée de la) vie».
_GLOSS_SUB_RE: str = r"«((?:[^«»()]|\([^()]*\))*?)(»|(?<=\.\.\.)(?=\)))"


def replace_gloss(match: regex.Match[str]) -> str:
    # The guillemets aren't part of the gloss, so they get a class of their
    # own. They are written as character references, so that a stray guillemet
    # trips the ban.
    gloss, close = match.groups()
    ensure.fullmatch(_GLOSS_RE, gloss, "gloss")
    html: str = (
        f'<span class="{cls.GUILLEMET}">&laquo;</span>'
        f'<span class="{cls.GLOSS}">{gloss}</span>'
    )
    if close:
        html += f'<span class="{cls.GUILLEMET}">&raquo;</span>'
    return html


OPEN_PARAGRAPH: str = "<p>"
CLOSE_PARAGRAPH: str = "</p>"


def _mark(char: str) -> str:
    return f'<span class="{cls.MARK}">{char}</span>'


# The addenda marker is intentionally fixed, because some addenda result in
# several edits throughout the text. Using numbered markers ([1], [2], ...)
# gives the impression that the edits come from multiple addenda and corrigenda,
# which is often incorrect.
_ADDENDUM_MARK: str = _mark("‡")


def _validate_addendum_group(group: str) -> None:
    # NOTE: An addendum may not contain a `\n`. Those are substituted by
    # paragraph boundaries, which would spill out of the addendum element
    # and corrupt the HTML.
    # NOTE: This assumes that the paragraph substitution precedes the
    # addenda substitution.
    ensure.ensure(
        OPEN_PARAGRAPH not in group,
        "addendum group contains paragraphing elements:",
        group,
    )


def replace_addendum(match: regex.Match[str]) -> str:
    """Render an addendum — a correction from Kasser's own addenda.

    Its two halves are the removed and the added text, either of which may be
    empty. Neither half may begin or end with a space, nor contain a `\\n`.

    Unlike Crum's, Kasser's addenda are only two pages long, so we don't
    record which page a correction comes from.

    Args:
        match: The addendum match. Its two groups are the removed and the added
            text.

    Returns:
        The addendum's HTML.
    """
    return "".join(_replace_addendum_aux(match))


def _replace_addendum_aux(match: regex.Match[str]) -> abc.Generator[str]:
    delete, insert = match.group(1), match.group(2)
    _validate_addendum_group(delete)
    _validate_addendum_group(insert)
    yield f'<span class="{cls.ADDENDUM}">'
    if delete:
        yield f"<del>{delete}</del>"
    if delete and insert:
        yield " "
    if insert:
        yield f"<ins>{insert}</ins>"
    yield _ADDENDUM_MARK
    yield "</span>"


_SUBSTITUTIONS: list[Substitution] = [
    # NOTE: The gloss substitution must precede the italic one, so that it
    # sees the italics within it as typed.
    Substitution(_GLOSS_SUB_RE, replace_gloss, ban=["«", "»"]),
    # The transcription may italicize with a single underscore or a double one.
    # Whatever the distinction it intends, we render both alike.
    Substitution(r"(__?)(.+?)\1", replace_italic, ban=["_"]),
    # A double-bracketed text that starts with a Latin letter (optionally
    # preceded by an asterisk) is a siglum. The siglum substitution must
    # precede the language one.
    Substitution(
        bracketed(r"(\*?\p{Latin}[^\[\]]*)"),
        replace_siglum,
        ban=["^"],
    ),
    Substitution(bracketed(r"(.*?)"), replace_bracketed, ban=["[[", "]]"]),
    # An asterisk may also occur outside brackets, e.g. before a reference:
    # (*Jr Bal.146).
    # NOTE: The asterisk substitution must follow the siglum and language ones,
    # which expect to find the asterisk inside the brackets.
    Substitution(r"\*", page.ASTERISK, ban=["*"]),
    # Outside sigla, a subscript occurs in the manuscript numbers M₁ to M₁₀ and
    # G₂ to G₄ (see Kasser's Sigles et Abréviations), and in a parenthesized
    # qualifier that follows a form or a reference: [[ⲁⲁ]]~(h), (ManiP~(qq)).
    # NOTE: The subscript substitutions must follow the siglum one.
    Substitution(r"M~([1-9]|10)(?!\d)", r"M<sub>\1</sub>", ban=["~"]),
    Substitution(r"G~([2-4])(?!\d)", r"G<sub>\1</sub>", ban=["~"]),
    Substitution(r"~(\([^()]+\))", replace_subscript, ban=["~"]),
    Substitution(
        r"\\n",
        CLOSE_PARAGRAPH + OPEN_PARAGRAPH,
        ban=["\\"],
    ),
    # An addendum takes the form `//deleted//inserted//`, either half of which
    # may be empty.
    # NOTE: The addendum substitution must follow the paragraph one. See
    # `_validate_addendum_group`.
    Substitution(r"//(.*?)//(.*?)//", replace_addendum, ban=["//"]),
]

_BANNED: set[str] = {token for sub in _SUBSTITUTIONS for token in sub.ban}

# A page in the Compléments or the Morphologiques, followed by its column.
_KASSER_PAGE_RE: regex.Pattern[str] = regex.compile(r"[1-9][0-9]*[ab]")


class Col(enum.StrEnum):
    """Name of a column in the Kasser sheets that the pipeline reads.

    Both sheets share the same columns. The order is that of the sheets, and
    the snapshots retain it.
    """

    KASSER = "Kasser"
    MARCION = "Marcion"
    VIDE = "_v_"
    ENTRY = "Entry"
    # TODO: (#786) Drop the WIP column once the transcription is complete, and
    # no entry is partially written.
    WIP = "WIP"


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


@typing.final
class Wiki:
    """Wiki represents an entry in the Kasser sheet."""

    def __init__(
        self,
        record: dict[typing.Hashable, typing.Any],
    ) -> None:
        # NFC normalization simplifies some validations below. It allows us to
        # use character classes for validation (e.g. \p{Latin}) without the
        # need for \p{Mark}.
        self.entry: str = unicodedata.normalize("NFC", record[Col.ENTRY])
        self.kasser: str = record[Col.KASSER]

        wip: str = record[Col.WIP]
        ensure.ensure(
            wip in ["", "*"],
            self,
            "has an invalid WIP entry:",
            wip,
        )
        if wip:
            # A partially written entry is treated as if it were empty.
            self.entry = ""
        del wip

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

        marcion: str = record[Col.MARCION]
        ensure.ensure(
            not marcion or regex.fullmatch(r"\d+( \d+)*", marcion),
            self,
            "has an invalid Marcion entry:",
            marcion,
        )
        self.keys: list[int] = (
            list(map(int, marcion.split())) if marcion else []
        )
        del marcion

        ensure.ensure(
            _KASSER_PAGE_RE.fullmatch(self.kasser)
            or (not self.kasser and not self.entry),
            self,
            "has an invalid Kasser page:",
            repr(self.kasser),
        )

        vide: str = record[Col.VIDE]
        ensure.ensure(
            vide in ["", "v"],
            self,
            "has an invalid vide entry:",
            vide,
        )
        self.vide = bool(vide)
        del vide

        if len(self.keys) > 1:
            ensure.ensure(
                self.vide,
                self,
                "is non-vide but has several keys:",
                self.keys,
            )

        # Validate entry.
        invalid: list[str] = [s for s in RAW_RE.split(self.entry) if s]
        ensure.ensure(
            not invalid,
            "contains invalid text:",
            invalid,
            "in:",
            self.entry,
        )

    @functools.cached_property
    def html(self) -> str:
        ensure.ensure(self.entry, self, "has no entry to render")
        html: str = "".join(self._html_aux())
        for token in _BANNED:
            ensure.ensure(
                token not in html,
                "Banned token",
                token,
                "found in entry",
                self,
                "output:",
                html,
            )
        # TODO: (#756) This check belongs in a shared package.
        invalid_tags: list[str] = _SPACE_AT_TAG_BORDER_RE.findall(html)
        ensure.ensure(
            not invalid_tags,
            self,
            "contains a space at either end of an element:",
            invalid_tags,
        )
        return html

    def _html_aux(self) -> abc.Generator[str]:
        classes: list[str] = [cls.ENTRY]
        if self.vide:
            classes.append(cls.VIDE)
        yield f'<div class="{" ".join(classes)}">'
        yield OPEN_PARAGRAPH

        raw: str = self.entry
        for s in _SUBSTITUTIONS:
            raw = s.html(raw)
        yield raw

        yield CLOSE_PARAGRAPH
        yield "</div>"

    @typing.override
    def __str__(self) -> str:
        return f"{self.kasser} {self.entry}"


@functools.cache
def wikis(book: Book) -> list[Wiki]:
    """Read the entries of a book's sheet snapshot.

    Every row is validated, but only those with an entry are returned. A row
    with no entry is either not yet transcribed or partially written, and has
    nothing to render.

    Args:
        book: The book whose snapshot to read.

    Returns:
        The entries that have text.
    """
    records: list[dict[typing.Hashable, typing.Any]] = file.read_tsv(
        TSV[book],
    ).to_dict(orient="records")
    ws: list[Wiki] = [w for w in map(Wiki, records) if w.entry]
    for prev, cur in itertools.pairwise(ws):
        ensure.ensure(
            _page_key(prev.kasser) <= _page_key(cur.kasser),
            book,
            "is out of order:",
            cur,
            "follows",
            prev,
        )
    return ws


def _page_key(kasser: str) -> tuple[int, str]:
    return int(kasser[:-1]), kasser[-1]


@functools.cache
def by_marcion_key(book: Book) -> dict[str, list[Wiki]]:
    by_key: dict[str, list[Wiki]] = defaultdict(list)
    for w in wikis(book):
        for key in w.keys:
            by_key[str(key)].append(w)
    return by_key


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
    books: dict[Book, list[Wiki]] = {
        book: by_marcion_key(book).get(key, []) for book in Book
    }
    if not any(books.values()):
        return
    yield f'<div class="{cls.KASSER}" id="{ids.KASSER}">'
    for book, ws in books.items():
        if not ws:
            continue
        yield f'<div class="{book}" id="{ID[book]}">'
        # `wikis` guarantees the order by page, so we can use `groupby`
        # directly.
        for kasser, group in itertools.groupby(ws, key=lambda w: w.kasser):
            yield from Column(kasser, group).html_aux()
        yield "</div>"
    yield "</div>"


class Column:
    """Column represents a group of Wikis that occur on the same column."""

    def __init__(self, kasser: str, ws: abc.Iterable[Wiki]) -> None:
        self.kasser: str = kasser
        self.wikis: list[Wiki] = list(ws)
        assert all(w.kasser == self.kasser for w in self.wikis)

    def html_aux(self) -> abc.Generator[str]:
        yield f'<div class="{cls.FOLIO}">'
        yield f'<span class="{cls.KASSER_PAGE}">'
        yield self.kasser
        yield "</span>"
        for w in self.wikis:
            yield w.html
        yield "</div>"
