"""Process coptic.wiki's Digital Version of Crum."""

# TODO: (#0) Consider the following simplifications of the substitution rules:
# - Use an actual newline character instead of the "\n" token.
# - The headword notation is simply unnecessary.
import enum
import functools
import typing
from collections import abc, defaultdict
from html import escape

import regex

from dictionary import cls as dict_cls
from dictionary.marcion_sourceforge_net import cls, constants
from dictionary.marcion_sourceforge_net import lexical as lex
from utils import ensure, file, lang, log, orth, paths

# HTML data attribute names emitted in the Wiki HTML, and consumed by both the
# TypeScript front-end and the Xooxle indexer.
DATA_FOOTNOTE: str = "data-footnote"
DATA_KEY: str = "data-key"
DATA_PAGE: str = "data-page"

COMMA_OR_SPACE: regex.Pattern[str] = regex.compile(r"[ ,]")

# RAW_RE should match a Wiki raw string.
# All non-Latin text is expected to be surrounded by double square brackets.
# Outside of double square brackets, there should remain only (1) Latin text, or
# (2) non-letter characters. RAW_RE can be used to verify this structure.
# "ʿ" and "β" are added for singleton violations of this rule:
# - https://remnqymi.com/crum/3387.html#:~:text=%CA%BFAmru%CC%82
# - https://remnqymi.com/crum/3075.html#:~:text=%CE%B2
RAW_RE: regex.Pattern[str] = regex.compile(
    r"\[\[.*?\]\]|[\p{Latin}\P{Letter}ʿβ]",
)

# Coptic combining marks.
#
# Coptic uses two contrastive supralinear strokes, and Unicode gives each its
# own encoding (The Unicode Standard, ch. 7, "Supralineation"): U+0305 after
# every letter for a stroke that runs edge to edge, and U+FE24 / U+FE26 /
# U+FE25 for the shorter one that spans from the middle of the first letter to
# the middle of the last. Both occur in Crum, and they are not interchangeable.
_COPTIC_MARKS: str = (
    "\u0301"  # Acute accent, over ϩ́ and in ⲉⲃⲥⲉ́ⲛⲓ.
    "\u0304"  # Macron, the syllabic stroke over a lone consonant: ⲛ̄.
    "\u0305"  # Overline, for numerals (ⲕ̅ = 20) and abbreviations (⳪̅).
    "\u0307"  # Dot above, in ⲁ̇ⲡⲟⲕⲣⲁϫⲱⲛ.
    "\u0308"  # Diaeresis, over ⲓ̈.
    "\u0314"  # Reversed comma above, the rough breathing: ⲣ̔ⲏⲓ, ⲉⲟ̔ⲩⲛ.
    "\u0323"  # Dot below, marking a letter read as uncertain: ⲁ̣, ⲛ̣.
    "\u0345"  # Greek ypogegrammeni, only in ⲇͅⲇͅ, for δεῖνα δεῖνος.
    "\ufe24"  # Macron left half, opening a nomen sacrum's stroke.
    "\ufe25"  # Macron right half, closing it.
    "\ufe26"  # Conjoining macron, continuing it: ⲡ︤ⲛ︦ⲁ︥.
)

# A headword may optionally be wrapped in parentheses to mark it as an
# unattested form. It may also contain internal parentheses that mark
# optional letters (e.g. ϩⲟ(ⲉ)ⲓⲧⲉ). The two alternatives below ensure that
# the outer wrapper, when present, is matched as a balanced pair: either
# both parens fall inside the character class (first alternative), or both
# appear as explicit literals around the auxiliary pattern (second
# alternative). An earlier version had the wrapping parens as independent
# optionals (`\(?...\)?`), where the leading `\(?` could match the opening
# paren while the closing paren got swallowed by the character class
# instead of by the trailing `\)?` — yielding an imbalanced capture.
# NOTE: The pattern remains somewhat permissive, as it allows combinations that
# don't occur in reality.
# A headword is Coptic, but a far narrower slice of it than an entry's text.
_HEADWORD_RE_AUX: str = (
    rf"-?([{_COPTIC_MARKS}ⲁ-ⲱϣ-ϯⳉ ()\[\]]+?)(?:-|⸗|†|\[|\[\.\])?"
)
_HEADWORD_RE: regex.Pattern[str] = regex.compile(
    rf"{_HEADWORD_RE_AUX}|\({_HEADWORD_RE_AUX}\)",
)

# Matches an opening tag immediately followed by a space, which signals stray
# leading whitespace inside an element.
_SPACE_AFTER_TAG_RE: regex.Pattern[str] = regex.compile(
    r"<(?!/)[^>]+> .*?</[^>]+>",
)


def headword_variants(form: str) -> abc.Generator[str]:
    assert constants.COPTIC_LETTERS_OR_PARENTHESES_RE.fullmatch(form)
    # 1. Handle parentheses that mark unattested forms.
    if form.startswith("(") and form.endswith(")"):
        # Get rid of the surrounding parentheses that mark unattested forms.
        # In such cases, the form is guaranteed not to contain any other markers
        # within it, so we can yield it and return immediately.
        yield form[1:-1]
        return

    # 2. Handle parentheses that mark optional substrings.
    if not constants.OPTIONAL_SUBSTRING_RE.search(form):
        # No optional substrings.
        yield form
        return

    for repl in ["", r"\1"]:
        # Try once with the optional substring removed, and once with it
        # retained.
        # Each time, only substitute the first optional substring, recursing to
        # handle following optional substrings if any are present.
        yield from headword_variants(
            constants.OPTIONAL_SUBSTRING_RE.sub(repl, form, 1),
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
Language: typing.TypeAlias = typing.Literal[
    "GREEK",
    "COPTIC",
    # NOTE: The ARABIC class is used for both Arabic and Persian words, which we
    # can not always distinguish. Thus the label is inaccurate.
    "ARABIC",
    "HEBREW",
    "SYRIAC",
    "ETHIOPIC",
    "HIEROGLYPH",
    "DEMOTIC",
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
# The exception to this rule is a number of scripts that are less common in our
# corpus and are deemed less critical, so they're simply expressed using Unicode
# property classes.
#
# NOTE: Entry order is load-bearing for language determination. Greek may
# contain Coptic, (and, in a singleton instance, Coptic Arabic), so GREEK must
# precede COPTIC (and COPTIC ARABIC).
# NOTE: An atom is inserted into a character class verbatim, so a literal `-`,
# `]` or `^` has to be written escaped. Order within a character class is
# meaningless.
_ALPHABETS: dict[Language, tuple[str, ...]] = {
    "GREEK": (
        "α-ω",  # The Greek letters, final sigma included,
        "Α-Ρ",  # and their capitals, split in two because U+03A2
        "Σ-Ω",  # is unassigned.
        "ϕ",  # Phi symbol, used interchangeably with φ.
        "ϛ",  # Stigma, the numeral 6.
        "Ⲁ-ⲱ",  # The Coptic letters, either case,
        "Ϣ-ϯ",  # and those of them borrowed from Demotic.
        "𐅵",  # Greek one half sign.
        "\U0001018e",  # 𐆎, the nomisma sign. See `replace_stack`.
        "\u0374",  # Greek numeral sign, the keraia, which is what the
        "\u02b9",  # source holds; NFD folds it to modifier letter prime,
        # so it is the prime that this class actually matches.
        "\u0300",  # Grave accent.
        "\u0301",  # Acute accent.
        "\u0305",  # Overline, for numerals: γ̅ πεδιάδες.
        "\u0308",  # Diaeresis.
        "\u0313",  # Comma above, the smooth breathing.
        "\u0314",  # Reversed comma above, the rough breathing.
        "\u0323",  # Dot below, marking an uncertain letter.
        "\u0342",  # Perispomeni.
        "\u0345",  # Ypogegrammeni.
        "\ufe24",  # The stroke over a nomen sacrum, which Crum writes
        "\ufe26",  # in his Greek as well as in his Coptic: θ︤ν︥, π︤ν︦α︥.
        "\ufe25",
        "⸝",  # Right low paraphrase bracket.
        "—",  # Em dash. Coptic uses the horizontal bar instead.
        "…",
        "·",
        "'",
        " ",
        # TODO: (#503) Ideally, the comma should be removed.
        ",",
        ".",
        "?",
        "/",
        "(",
        ")",
        "\\-",
        "\\[",
        "\\]",
    ),
    # NOTE: Besides the familiar letters, Coptic employs ⳪ and ⳨ passim,
    # and ⳗ, ⳓ and ⳙ under ϫ: https://remnqymi.com/crum/3415.html
    "COPTIC": (
        _COPTIC_MARKS,
        "ⲁ-ⲱ",  # The Coptic letters,
        "ϣ-ϯ",  # those of them borrowed from Demotic,
        "ⳉ",  # and Akhmimic khei.
        "⳪",  # Shima sima, Crum's abbreviation for ϫⲟⲉⲓⲥ.
        "⳨",  # Tau ro, the staurogram.
        "ⳗ",  # Old Coptic gangia,
        "ⳓ",  # hei,
        "ⳙ",  # and dja.
        "ع",  # Arabic ain, which turns up inside a Coptic word:
        # https://remnqymi.com/crum/371.html
        "Ꞩ",  # Latin S with oblique stroke, transcribing a sort
        # that seems to be absent from the Coptic Unicode.
        "⸗",  # Double oblique hyphen, marking a pronominal form,
        "†",  # and dagger, marking a qualitative one.
        "―",  # Horizontal bar, standing in for a repeated headword.
        # See `_LANGUAGE_OVERRIDES`.
        "⸪",  # Two dots over one dot punctuation.
        "…",
        "·",
        " ",
        # TODO: (#503) Ideally, the comma should be removed. A Coptic block
        # of comma-separated words should instead be represented as a
        # comma-separated list of one-word Coptic blocks.
        ",",
        ".",
        ":",
        "?",
        "/",
        "(",
        ")",
        "\\-",
        "\\[",
        "\\]",
    ),
    "ARABIC": (
        "ء-ي",  # The standard Arabic letters.
        "ﹰ-ﻼ",  # Presentation forms-B, isolated diacritics included.
        "گ",  # Gaf and
        "ݣ",  # keheh with three dots above: the two Persian letters
        # that occur in our transcription. We intentionally refrain
        # from supporting the entire Persian range.
        "\u064b",  # Fathatan.
        "\u064e",  # Fatha.
        "\u064f",  # Damma.
        "\u0650",  # Kasra.
        "\u0651",  # Shadda.
        "\u0652",  # Sukun.
        "،",  # Arabic comma.
        "…",
        " ",
        ".",
        "?",
        "(",
        ")",
        "\\-",
        "\\]",
    ),
    "HEBREW": (
        r"\p{Hebrew}",  # The letters, and their points, which share a script.
        "\u034f",  # Grapheme joiner, which does not, so it needs listing.
        " ",
    ),
    "SYRIAC": (
        r"\p{Syriac}",  # The letters, and their points, which share a script.
        " ",
        "…",
    ),
    "ETHIOPIC": (r"\p{Ethiopic}",),
    "HIEROGLYPH": (r"\p{Egyptian_Hieroglyphs}",),
    # NOTE: Demotic is not detectable using a character's Unicode name.
    # NOTE: Demotic is transcribed with precomposed Latin throughout, so
    # it bears no combining marks.
    "DEMOTIC": (
        r"\p{Latin}",
        "ꜣ",  # Egyptological alef and
        "ꜥ",  # ain, which are Latin-scripted.
        "ʾ",  # Modifier letter right half ring and
        "ʿ",  # left half ring, which are not.
        "·",
        "'",
        " ",
        ".",
        "(",
        ")",
        "\\-",
    ),
}

# The HTML class used for each language.
_CLASSES: dict[Language, str] = {
    "GREEK": cls.GREEK,
    "COPTIC": cls.COPTIC,
    "ARABIC": cls.ARABIC,
    "HEBREW": cls.HEBREW,
    "SYRIAC": cls.ARAMAIC,
    "ETHIOPIC": cls.AMHARIC,
    "HIEROGLYPH": cls.HIEROGLYPHIC,
    "DEMOTIC": cls.DEMOTIC,
}

ensure.equal_sets(typing.get_args(Language), _ALPHABETS.keys(), "alphabets")
ensure.equal_sets(typing.get_args(Language), _CLASSES.keys(), "classes")

# The validation pattern for text marked as belonging to each language.
_VALIDATORS: dict[Language, regex.Pattern[str]] = {
    language: regex.compile("".join(("[", *alphabet, "]+")))
    for language, alphabet in _ALPHABETS.items()
}


def _normalize_for_validation(language: Language, text: str) -> str:
    # Greek and Coptic are allowed to have superscripts and stacks within.
    if language in ["COPTIC", "GREEK"]:
        text = _IN_LANG_TAGS.sub("", text)
    # Greek is often transcribed with precomposed characters, which are not
    # represented in our regex, so we NFD-normalize it.
    # NOTE: The Greek alphabet constrains the decomposed form only: a
    # precomposed Greek letter whose parts are all listed passes unvetted.
    if language == "GREEK":
        text = orth.normalize(text)
    return text


# `lang.has_lang` determines a language from the Unicode names of a text's
# characters, which fails for characters whose name omits their script. The
# characters below are the exceptions encountered so far, each mapped to the
# language it belongs to.
_LANGUAGE_OVERRIDES: dict[str, Language] = {
    # The horizontal bar bears no script in its name, and is always Coptic.
    "―": "COPTIC",
    # The S with oblique stroke is a Latin letter, used to transcribe a
    # character that seems absent from the Coptic Unicode.
    "Ꞩ": "COPTIC",
    # The nomisma sign is named "NOMISMA SIGN", lacking the "GREEK" that its
    # neighbours bear (such as "GREEK INDICTION SIGN").
    "𐆎": "GREEK",
}


def _language(text: str) -> Language:
    # We exclude diacritics from language determination because Coptic uses
    # Greek diacritics in the expression ⲇͅⲇͅ - which is the abbreviation for
    # the Greek phrase δεῖνα δεῖνος, translating to "so-and-so" or "NN".
    # The diacritic used is Combining Greek Ypogegrammeni (U+0345), and we don't
    # want use of this diacritic to cause the expression to be evaluated as
    # Greek.
    if text in _LANGUAGE_OVERRIDES:
        return _LANGUAGE_OVERRIDES[text]
    text = orth.clean_diacritics(text)
    for language in _ALPHABETS:
        if lang.has_lang(language, text):
            return language
    return "DEMOTIC"


def replace_bracketed(match: regex.Match[str]) -> str:
    text: str = match.group(1)
    del match

    if text == "·":
        # This special case happens to exist in the Wiki data. It likely
        # shouldn't be classified as belonging to one of the languages, so we
        # simply return the text itself.
        return text

    language: Language = _language(text)

    ensure.ensure(
        _VALIDATORS[language].fullmatch(
            _normalize_for_validation(language, text),
        ),
        "invalid",
        language,
        "text:",
        repr(text),
    )

    return f'<span class="{_CLASSES[language]}">{text}</span>'


_SIGLA: list[str] = [
    "S",  # Sahidic
    "Sa",  # Sahidic with Akhmimic tendency
    "Sf",  # Sahidic with Fayyumic tendency
    "A",  # Akhmimic
    "A2",  # Lycopolitan (Subakhmimic)
    "B",  # Bohairic
    "F",  # Fayyumic
    "Fb",  # Fayyumic with Bohairic tendency
    "O",  # Old Coptic
    # While not explicitly mentioned in Crum's intro, there are occurrences
    # of non-standard dialect sigla in the dictionary.
    # For each of these, we add a non-standard dialect entry in TypeScript,
    # so they can render properly.
    "Of",
    "Saf",
    "Sb",
    "Bf",
]
_CANONICAL: dict[str, str] = {"A2": "L"}


def replace_dialect(match: regex.Match[str]) -> str:
    siglum: str = "".join(g or "" for g in match.group(1, 2))
    ensure.ensure(siglum in _SIGLA, "unknown siglum:", siglum)
    klass: str = _CANONICAL.get(siglum, siglum)
    return rf'<span class="{dict_cls.DIALECT} {klass}">{siglum}</span>'


def replace_manual(match: regex.Match[str]) -> str:
    """Render a manual label — an enrichment decision made by a scholar.

    A manual label overrides the enrichment heuristics for one span of text,
    and it is the fix for most findings, since the algorithm is mature enough
    that what remains is usually an inconsistency in Crum's text that no
    heuristic can resolve.

    NOTE: Footnotes share the brace notation with manual labels, so the same
    token can not take both. A footnoted error therefore can not also have its
    bad tooltip suppressed, which is why the unnumbered-book feature sits at
    the precision it does (see the `UNNUMBERED_BIBLE_BOOK` note in `wiki.ts`).
    Nor may a manual label be nested inside footnote text: the substitution
    below runs after the footnote has been packed into the `data-footnote`
    attribute, so it would rewrite the attribute's contents and inject
    unescaped quotes, silently corrupting the HTML.

    Args:
        match: The manual label match, whose groups are the text and the
            (optional) key.

    Returns:
        The manual label's HTML.
    """
    text, key = match.group(1, 2)
    if key is None:
        return rf'<span class="{cls.MANUAL}">{text}</span>'
    return rf'<span class="{cls.MANUAL}" {DATA_KEY}="{key}">{text}</span>'


def replace_stack(match: regex.Match[str]) -> str:
    bottom, up = match.groups()
    if bottom == "ν" and up == "ο":
        log.fatal("Nomisma sign encoded as a stack! Use", "U+1018E")
    return (
        f'<span class="{cls.STACK}">'
        f'<span class="{cls.STACK_BOTTOM}">{match.group(1)}</span>'
        f'<span class="{cls.STACK_TOP}">{match.group(2)}</span>'
        r"</span>"
    )


OPEN_SUBPARAGRAPH: str = f'<span class="{cls.SUBPARAGRAPH}">'
CLOSE_SUBPARAGRAPH: str = "</span>"
OPEN_PARAGRAPH: str = "<p>"
CLOSE_PARAGRAPH: str = "</p>"


def _mark(char: str) -> str:
    return f'<span class="{cls.MARK}">{char}</span>'


# The addenda marker is intentionally fixed, because some addenda result in
# several edits throughout the text. Using numbered markers ([1], [2], ...)
# gives the impression that the edits come from multiple addenda and corrigenda,
# which is often incorrect.
# This has the added advantage that a simple search query for the character
# employed yields all occurrences of addenda or footnotes in the text.
# Two characters are used which are not employed in Crum's text.
_ADDENDUM_MARK: str = _mark("‡")
_FOOTNOTE_MARK: str = _mark("※")

# Coptic Wiki substitutions:
#
# NOTE: This is based on a snapshot of the following file, taken on
# September 17, 2025:
# pylint: disable-next=line-too-long
# - https://github.com/randykomforty/coptic/blob/main/scripts/dictionary_regexes.js
# If the file were to be updated, this mapping should be updated accordingly.
#
# NOTE: For substitution rules that we override, we have opted for inserting the
# overriding replacement right before the Wiki replacement, separating them by
# an `or` operator. We also add a comment explaining the rationale for the
# override.
_SUBSTITUTIONS: list[Substitution] = [
    # Replace occurrences of ampersand with the HTML encoding.
    # NOTE: While most browsers and pipelines can deal with a literal ampersand,
    # BeautifulSoup often misinterprets the combination "&c;" so we convert it
    # explicitly.
    # In some cases, we made the mistake of typing "&amp;" directly, instead of
    # just "&". We ban the token "&amp;amp" to catch this error.
    Substitution("&", "&amp;", ban=["&amp;amp"]),
    # The asterisk is not a reserved character in modern HTML, so we don't need
    # to use `&ast;`. However, using a plain asterisk risks conflicting with the
    # bold rule below. We therefore leave it up to our linters to replace
    # the occurrences of `&ask;` produced here with a literal asterisk.
    Substitution(r"\\\*", "&ast;", ban=["*", "\\"]),
    Substitution(r"\\t", CLOSE_SUBPARAGRAPH + OPEN_SUBPARAGRAPH, ban=["\\"]),
    Substitution(
        r"__(.+?)__",
        rf'<span class="{cls.GLOSS}">\1</span>',
        ban=["_"],
    ),
    Substitution(
        # Bold text is simply bullets. We prefer using an explicit `bullet`
        # class to mark them, instead of relying on `<b>`.
        # We can use a stricter regex that only allows alphabetical characters
        # (optionally followed by a period).
        r"\*([a-zA-Z]+?\.?)\*",
        rf'<span class="{cls.BULLET}">\1</span>',
        ban=["*"],
    ),
    Substitution(r"_(.+?)_", r"<i>\1</i>", ban=["_"]),
    Substitution(
        bracketed(r"([SABFO])(?:\^(a|f|b|af|2))?"),
        replace_dialect,
        ban=["[[", "]]", "^"],
    ),
    Substitution(r"(\p{Letter})\^\^(\p{Letter})", replace_stack, ban=["^^"]),
    Substitution(r"\^([-–—\w\p{Letter}]+)", r"<sup>\1</sup>", ban=["^"]),
    Substitution(
        r"\\n",
        CLOSE_SUBPARAGRAPH
        + CLOSE_PARAGRAPH
        + OPEN_PARAGRAPH
        + OPEN_SUBPARAGRAPH,
        ban=["\\"],
    ),
    Substitution(bracketed(r"(.*?)"), replace_bracketed, ban=["[[", "]]"]),
]


_IN_LANG_TAGS: regex.Pattern[str] = regex.compile(
    "|".join(
        [
            "<sup>",
            "</sup>",
            f'<span class="{cls.STACK}">',
            f'<span class="{cls.STACK_TOP}">',
            f'<span class="{cls.STACK_BOTTOM}">',
            "</span>",
        ],
    ),
)


class Col(enum.StrEnum):
    """Name of a column in the Wiki sheet that the pipeline reads.

    This doubles as the whitelist for the tracked snapshot, and the member
    order fixes the snapshot's column order, so reordering the members rewrites
    the tracked file wholesale.
    """

    MARCION = "Marcion"
    CRUM = "Crum"
    VIDE = "_v_"
    ENTRY = "Entry"


@typing.final
class Wiki:
    """Wiki represents an entry in the Wiki sheet."""

    def __init__(
        self,
        record: dict[typing.Hashable, typing.Any],
    ) -> None:
        self.keys: list[int] = list(map(int, record[Col.MARCION].split(" ")))
        assert self.keys
        self.entry: str = record[Col.ENTRY]
        # TODO: (#503) Ban superfluous space in the entry.
        ensure.ensure(self.entry, "Empty entry for Marcion keys:", self.keys)

        # headwords tracks the headwords encountered in the text. In extremely
        # rare cases, there could be multiple, e.g. ϩⲁ, ϩⲟ:
        #  https://remnqymi.com/crum/2096.html
        self._headwords: list[str] = []

        self.crum: lex.Column = lex.Column(record[Col.CRUM])
        assert self.crum

        vide: str = record[Col.VIDE]
        ensure.ensure(
            vide in ["", "v"],
            self,
            "has an invalid vide entry:",
            vide,
        )
        self.vide = bool(vide)
        del vide

        if len(self.keys) != 1:
            ensure.ensure(
                self.vide,
                self,
                "is non-vide but has several keys:",
                self.keys,
            )

        # Validate entry.
        invalid: str = RAW_RE.sub(" ", self.entry)
        invalid = ", ".join(invalid.split())
        ensure.ensure(
            not invalid,
            "contains invalid text:",
            invalid,
            "in:",
            self.entry,
        )

    def headwords(self) -> list[str]:
        ensure.ensure(self._headwords, "Headwords for", self, "not populated!")
        return self._headwords

    def headword_variants(self) -> abc.Generator[str]:
        # TODO: (#0) Deduplicate this code. The logic below has a large overlap
        # with `lexicographic_key`, as well as
        # `lexical.Line._normalize_optional_letters`.
        for headword in self.headwords():
            match: regex.Match[str] | None = _HEADWORD_RE.fullmatch(headword)
            assert match
            # Strip all leading and trailing markers.
            headword = match.group(1) or match.group(2)
            # Remove spaces, square brackets, and diacritics.
            headword = headword.replace(" ", "")
            headword = headword.replace("[", "").replace("]", "")
            headword = regex.sub(r"\p{Mark}", "", headword)
            assert headword
            # The headword should now consist of Coptic letters, marks, spaces,
            # and parentheses. Generate variants.
            for variant in headword_variants(headword):
                ensure.ensure(
                    constants.COPTIC_LETTERS_RE.fullmatch(variant),
                    "Invalid headword variant:",
                    variant,
                )
                yield variant

    def subs(self) -> abc.Generator[Substitution]:
        yield Substitution(
            # Four square brackets mark special-font (old) Coptic.
            bracketed("(.*?)", 4),
            rf'<span class="{cls.OLD} {cls.COPTIC}">\1</span>',
            ["[[[[", "]]]]"],
        )
        # The headword substitution (which uses triple brackets) must precede
        # the double-bracket substitution.
        yield Substitution(
            # Ensure the headword is preceded by the start of the string
            # (optionally with a single opening parenthesis for unattested
            # forms, or a double slash for entries removed in the addenda); by
            # the separator ']]], ' from a previous headword; or by the double
            # slash marking addenda.
            # This prevents false positives in cases where multiple pieces of
            # Coptic text in the entry contain brackets at the beginning or the
            # end, resulting in triple brackets.
            # Headwords always occur:
            # - Either at the very beginning of the text, occasionally preceded
            # by a single parenthesis (e.g. ϩⲟⲟⲩⲣⲉ on page 737 b [1]).
            # - Following another headword (e.g. ϩⲁ, ϩⲟ on page 635 a [2]).
            # - Inside addenda, when the headword is incorrect (e.g. [3], or
            # when the entire entry needs to be replaced (e.g. [4]).
            #
            # [1] https://remnqymi.com/crum/2321.html
            # [2] https://remnqymi.com/crum/2095.html
            # [2] https://remnqymi.com/crum/2096.html
            # [3] https://remnqymi.com/crum/1240.html
            # [4] https://remnqymi.com/crum/1727.html
            r"(?<=^(?:\()?|]]], |//)" + bracketed("(.*?)", 3),
            self.replace_headword,
            ban=["[[[", "]]]"],
        )

        yield from _SUBSTITUTIONS

        yield Substitution(
            r"{([^{}]*)}{{(.*?)}}",
            self.replace_footnote,
            ban=["{", "}"],
        )
        # The substitution for manual labels must follow the substitution for
        # footnotes.
        yield Substitution(
            r"{(.*?)}(?:{(.*?)})?",
            replace_manual,
            ban=["{", "}"],
        )
        # An addendum takes the form `//deleted//inserted//`, either half of
        # which may be empty, optionally followed by the page that the
        # correction comes from. See `replace_addendum` for how one is
        # written.
        yield Substitution(
            f"//(.*?)//(.*?)//({constants.CRUM_RE.pattern})?",
            self.replace_addendum,
            ban=["//"],
        )

    def replace_addendum(self, match: regex.Match[str]) -> str:
        """Render an addendum — a correction of Crum's own.

        An addendum records an emendation from Crum's Additions and
        Corrections, as opposed to a footnote, which records an editorial note
        of ours. Its two halves are the removed and the added text, either of
        which may be empty.

        The rules below govern how one is written into the sheet. The first
        two are enforced by `_validate_addendum_group`, and the last by the
        substitution's own pattern; 3 through 5 are matters of judgement, and
        are checked by review rather than by code.

        1. Neither half may begin or end with a space, which would strand the
           space immediately inside the `<del>` or `<ins>` tag.
        2. Neither half may contain a `\\n` or a `\\t` token. Paragraphing is
           substituted before addenda are, so those tokens would already have
           become tags, which would then spill out of the addendum element and
           corrupt the nesting.
        3. Punctuation belongs outside the block: prefer `//[[ⲁ]]//[[ⲃ]]//,` to
           `//[[ⲁ]],//[[ⲃ]],//`. The comma is as much a part of the corrected
           text as the word is, but the output reads better with it outside,
           and the duplication earns nothing. In the same spirit we take a
           small liberty with the format of the output — occasionally
           introducing a comma or a `\\t` of our own — and with the placement
           of an addendum: one that pertains to a paragraph or a subparagraph
           as a whole is appended at the very end of that subparagraph, rather
           than wedged into the middle of it.
        4. A citation is never split across the addendum boundary. To correct
           `Ge 1 1` to `Ge 1 2`, write `//Ge 1 1//Ge 1 2//`, and not
           `Ge 1 //1//2//`. The first yields two complete Bible citations, each
           enriched and hyperlinked in its own right. The second yields a
           citation of Genesis 1 trailed by two numbers that nothing ever
           interprets: followups are read off the flat chain, and an addendum
           is a wrapper on that chain that no followup handler descends into
           (see `parseBibleFollowups` in `docs/crum/wiki.ts`). The same holds
           for non-biblical references — leave the citation whole in both
           halves even when that means repeating most of it. The redundancy is
           the price of two working tooltips.
        5. The exception to 4, when the duplication would otherwise be
           unwieldy AND the correction falls in the followups rather than in
           the main citation: label the followups by hand, so that they resolve
           without a handler having to reach into the wrapper. Prefer
           `Ge 1 1, //{1}//{2}//` to the merely verbose
           `//Ge 1 1, 1//Ge 1 1, 2//`. Note that this does not license the
           broken form in 4: numbers left unlabeled inside an addendum are an
           error whatever their length.
        6. An addendum may name the page it comes from, written immediately
           after the closing `//`, e.g. `//[[ⲁ]]//[[ⲃ]]//717a`. It is optional,
           and is left out in the ordinary case, where the column in the
           Additions and Corrections is inferred from the page of the entry
           being corrected (see `addenda_page`). Write it out when that
           inference goes wrong; or when the correction comes from the body of
           the book rather than from the frontmatter, which no inference over
           the addenda columns could ever reach.

        Args:
            match: The addendum match. Its first two groups are the removed
                and the added text; its third, when present, is the page that
                the correction comes from.

        Returns:
            The addendum's HTML.
        """
        return "".join(self.replace_addendum_aux(match))

    def _validate_addendum_group(self, group: str) -> None:
        ensure.ensure(
            not (group.startswith(" ") or group.endswith(" ")),
            self,
            "has an addendum group with a space on the boundary:",
            group,
        )
        # NOTE: An addendum may not contain a `\n` or a `\t` token. Those are
        # substituted by paragraph and subparagraph boundaries, which
        # would spill out of the addendum element and corrupt the HTML.
        # NOTE: This assumes that paragraphing substitutions precede addenda
        # substitutions.
        ensure.ensure(
            all(
                token not in group
                for token in (OPEN_PARAGRAPH, OPEN_SUBPARAGRAPH)
            ),
            self,
            "has an addendum group containing paragraphing elements:",
            group,
        )

    def replace_addendum_aux(
        self,
        match: regex.Match[str],
    ) -> abc.Generator[str]:
        delete, insert, page = match.group(1), match.group(2), match.group(3)
        self._validate_addendum_group(delete)
        self._validate_addendum_group(insert)
        yield f'<span class="{cls.ADDENDUM}" {DATA_PAGE}="{
            page or self.addenda_page
        }">'
        if delete:
            yield f"<del>{delete}</del>"
        if delete and insert:
            yield " "
        if insert:
            yield f"<ins>{insert}</ins>"
        yield _ADDENDUM_MARK
        yield "</span>"

    def replace_headword(self, match: regex.Match[str]) -> str:
        headword: str = match.group(1)
        ensure.ensure(
            _HEADWORD_RE.fullmatch(headword),
            "Invalid headword:",
            headword,
        )
        self._headwords.append(headword)
        return f'<span class="{cls.HEADWORD} {cls.COPTIC}">{headword}</span>'

    def addendum(self) -> bool:
        """Determine whether this entry is an addendum.

        Our entries come from two sources: The body of the book (page numbers
        ranging from 1 to 844), and the Additions and Corrections (pages xv to
        xxiv). If the page number is a Roman numeral, then this entry is an
        addendum.

        Returns:
            True if this entry is an addendum, false otherwise.
        """
        return self.crum.roman()

    @functools.cached_property
    def lexicographic_key(self) -> str:
        """Get the key used to sort the word lexicographically.

        Returns:
            A stripped representation of the headword, used to determine the
            word's alphabetical position in the dictionary.
        """
        # Remove all parentheses.
        headword: str = self.headwords()[0]
        # If the headword consists of multiple words, select the first one.
        headword = COMMA_OR_SPACE.split(headword, 1)[0]
        # Clean up the headword.
        headword = headword.replace("(", "").replace(")", "")
        headword = headword.removesuffix("^1")
        headword = headword.removeprefix("-")
        headword = headword.rstrip("-⸗†")
        headword = orth.clean_diacritics(headword)

        ensure.ensure(
            lang.is_lang("COPTIC", headword),
            "can not determine the lexicographic key of",
            self,
        )

        return headword

    def _banned(self) -> set[str]:
        return {token for sub in self.subs() for token in sub.ban}

    @functools.cached_property
    def html(self) -> str:
        # NOTE: Each call to this method populates some fields, such as
        # headwords. Calling it multiple times would be an error. Caching
        # should prevent multiple executions on the same object.
        assert not self._headwords
        html: str = "".join(self._html_aux())
        for token in self._banned():
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
        invalid_tags: list[str] = _SPACE_AFTER_TAG_RE.findall(html)
        ensure.ensure(
            not invalid_tags,
            self,
            "contains an opening tag immediately followed by a space:",
            invalid_tags,
        )
        return html

    def replace_footnote(self, match: regex.Match[str]) -> str:
        # A footnote — `{text}{{note}}` — is an editorial note of OURS on an
        # error of Crum's; an addendum (`replace_addendum`) is a correction of
        # his own. Use a footnote to record what he got wrong and what he
        # meant. See `replace_manual` for the notation it shares with manual
        # labels, and for the consequences of sharing it.
        #
        # The footnote content is embedded in a `data-footnote` attribute on
        # the `.footnoted` wrapper. The rest is taken care of by JavaScript.
        # The inner `.mark` element keeps the footnote symbol visible to
        # flag the presence of a footnote.
        # We opt for inserting it in the HTML, instead of in TypeScript, to
        # fulfill the condition that post-enrichment text must be identical to
        # initial text. In other words, while TypeScript can enrich the text
        # through tooltips, styling, etc., it's not allowed to add any text that
        # wasn't there in the first place.
        attr: str = escape(match.group(2), quote=True)
        return (
            f'<span class="{cls.FOOTNOTED}" {DATA_FOOTNOTE}="{attr}">'
            + match.group(1)
            + _FOOTNOTE_MARK
            + "</span>"
        )

    def _html_aux(self) -> abc.Generator[str]:
        classes: list[str] = [cls.ENTRY]
        if self.vide:
            classes.append(cls.VIDE)
        yield f'<div class="{" ".join(classes)}">'
        yield OPEN_PARAGRAPH
        yield OPEN_SUBPARAGRAPH

        raw: str = self.entry
        for s in self.subs():
            raw = s.html(raw)
        yield raw

        yield CLOSE_SUBPARAGRAPH
        yield CLOSE_PARAGRAPH
        yield "</div>"

    @typing.override
    def __str__(self) -> str:
        return self._headwords[0] if self._headwords else self.entry

    @functools.cached_property
    def addenda_page(self) -> str:
        """
        Returns:
            A string representing the page number and column in the Additions
            and Corrections section that contains addenda for this entry.

            NOTE: The return value is often inaccurate. In particular:
            - If addenda for a given column start on a column and spill over to
              the following one, the first column will be returned. For example,
              the addenda for '100b' start on 'xviib' and spill over to
              'xviiia'. For all entries on '100b', the addenda page will be
              reported as 'xviib'.
            - If a Crum entry spans several columns, addenda will be inferred
              based on the first column. For example, ϯ spans '392a' to '396a',
              but the addenda column will be inferred based on '392a'.

            The blast radius is extremely small because the list of addenda is
            quite compact anyway.
            TODO: (#0) Contemplate a more precise implementation.
        """
        # We could binary-search, but the list only contains 20 elements, so
        # binary search is not worth it.
        for col in constants.COLUMN_RANGES:
            if self.crum <= col.end:
                return col.name
        log.fatal(self, "has no addenda page!")


@functools.cache
def wikis() -> list[Wiki]:
    records: list[dict[typing.Hashable, typing.Any]] = file.read_tsv(
        paths.WIKI_TSV,
    ).to_dict(orient="records")
    return list(map(Wiki, records))


@functools.cache
def by_marcion_key() -> dict[str, list[Wiki]]:
    by_key: dict[str, list[Wiki]] = defaultdict(list)
    for w in wikis():
        for key in w.keys:
            by_key[str(key)].append(w)
    return by_key


class Column:
    """Column represents a group of Wikis that occur on the same column."""

    def __init__(self, crum: lex.Column, ws: abc.Iterable[Wiki]) -> None:
        self.crum: lex.Column = crum
        self.wikis: list[Wiki] = list(ws)

    def html_aux(self) -> abc.Generator[str]:
        yield f'<div class="{cls.FOLIO}">'
        yield f'<span class="{cls.CRUM_PAGE}">'
        yield str(self.crum)
        yield "</span>"
        for w in self.wikis:
            yield w.html
        yield "</div>"
