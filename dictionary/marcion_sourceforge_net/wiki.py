"""Process coptic.wiki's Digital Version of Crum."""

import enum
import functools
import itertools
import typing
from collections import abc
from html import escape

import regex

from dictionary import cls as dict_cls
from dictionary.marcion_sourceforge_net import cls, constants, randy
from utils import ensure, file, lang, log, orth, page, paths

# HTML data attribute names emitted in the Wiki HTML, and consumed by both the
# TypeScript front-end and the Xooxle indexer.
DATA_FOOTNOTE: str = "data-footnote"
DATA_KEY: str = "data-key"

COMMA_OR_SPACE: regex.Pattern[str] = regex.compile(r"[ ,]")

# RAW_RE should match a Wiki raw string.
# All non-Latin text is expected to be surrounded by double square brackets.
# Outside of double square brackets, there should remain only Latin text, drawn
# from the alphabet below. RAW_RE can be used to verify this structure.
# "ʿ" is a modifier letter, rather than a Latin one, so it needs listing.
# "β" is added for a singleton violation of this rule:
# - https://remnqymi.com/crum/3075.html#:~:text=%CE%B2
# 'Lab ⲡⲓϩⲟⲩⲓⲧ ⲛⲧⲱⲧⲉⲣ' is the only non-Latin reference key in our bibliography,
# and it must be given special treatment.
RAW_RE: regex.Pattern[str] = regex.compile(
    "|".join(
        (
            r"\[\[.*?\]\]",
            "Lab ⲡⲓϩⲟⲩⲓⲧ ⲛⲧⲱⲧⲉⲣ",
            (
                r"[\p{Latin}ʿβ0-9"
                "٠-٩"  # Arabic-Indic digits, citing the pages of Arabic books,
                "۴"  # and the extended four, which they use for theirs.
                r" !\"&'()*+,\-./:;=?\[\]\^_{}§°·½–‘’†"
                r"\\]"  # The backslash of `\n`, `\t`, and `\*`.
            ),
        ),
    ),
)

# Coptic combining marks.
#
# Coptic uses two contrastive supralinear strokes, and Unicode gives each its
# own encoding (The Unicode Standard, ch. 7, "Supralineation"): U+0305 after
# every letter for a stroke that runs edge to edge, and U+FE24 / U+FE26 /
# U+FE25 for the shorter one that spans from the middle of the first letter to
# the middle of the last. Both occur in Crum, and they are not interchangeable.
_COPTIC_MARKS: str = (
    # Supralineation:
    "\u0304"  # Macron, the syllabic stroke over a lone consonant: ⲛ̄.
    "\u0305"  # Overline, for numerals (ⲕ̅ = 20) and abbreviations (⳪̅).
    "\ufe24"  # Macron left half, opening a nomen sacrum's stroke.
    "\ufe25"  # Macron right half, closing it.
    "\ufe26"  # Conjoining macron, continuing it: ⲡ︤ⲛ︦ⲁ︥.
    # Diacritics above:
    "\u2cf0"  # Coptic combining spiritus asper.
    "\u0301"  # Acute accent in ϩ́ (only under ϧ[1] and ϩⲱϩ[2] ATTOW).
    "\u0307"  # Dot above, in ⲁ̇ (only in ⲁ̇ⲡⲟⲕⲣⲁϫⲱⲛ under ϫ[3] ATTOW).
    "\u0308"  # Diaeresis, over ⲓ̈.
    # Diacritics below:
    "\u0323"  # Dot below.
    "\u0345"  # Greek ypogegrammeni, only in ⲇͅⲇͅ, for δεῖνα δεῖνος.
    # [1] https://remnqymi.com/crum/3413.html
    # [2] https://remnqymi.com/crum/2341.html
    # [3] https://remnqymi.com/crum/3415.html
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


# The languages we recognize. Each name is spelled as it appears in the
# Unicode names of the characters belonging to the language, because
# `randy.Languages.identify` identifies a text by searching those names for it.
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
#
# NOTE: You may need to update the documentation of Encoding Decisions if the
# alphabets change:
# https://docs.google.com/document/d/1VTUtwPsDyVjeTQLbgj_Ph59O_CdSacvysK-OY9A9Vkc
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
        "—",  # Em dash. Coptic uses the two-em dash instead.
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
        "⸺",  # Two-Em Dash, standing in for a repeated headword.
        # See `_LANGUAGE_OVERRIDES`.
        "⸪",  # Two dots over one dot punctuation.
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
        "\u00a0",  # Non-breaking space is used for for lacunas.
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
        ".",
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


class Languages(randy.Languages[Language]):
    """The languages that the bracketed text of a transcription may be in."""

    @typing.override
    def identify(self, text: str) -> Language:
        if text in _LANGUAGE_OVERRIDES:
            return _LANGUAGE_OVERRIDES[text]
        # Demotic is not detectable using a character's Unicode name.
        return super().identify(text) or "DEMOTIC"

    @typing.override
    def normalize_for_validation(self, language: Language, text: str) -> str:
        text = super().normalize_for_validation(language, text)
        # Greek and Coptic are allowed to have superscripts and stacks within,
        # and to mark a word as unattested.
        if language in ["COPTIC", "GREEK"]:
            text = _IN_LANG_TAGS.sub("", text)
            # An asterisk marks a Coptic or Greek form as unattested
            # (hypothetical). It belongs inside the span, but only at the
            # beginning of a word. By the time the span is validated, the
            # escaped asterisk has already been substituted by the HTML symbol.
            text = text.removeprefix(page.ASTERISK)
        text = text.replace(page.NBSP, "\u00a0")
        return text


_LANGUAGES: Languages = Languages(
    typing.get_args(Language),
    _ALPHABETS,
    {
        "GREEK": cls.GREEK,
        "COPTIC": cls.COPTIC,
        "ARABIC": cls.ARABIC,
        "HEBREW": cls.HEBREW,
        "SYRIAC": cls.ARAMAIC,
        "ETHIOPIC": cls.AMHARIC,
        "HIEROGLYPH": cls.HIEROGLYPHIC,
        "DEMOTIC": cls.DEMOTIC,
    },
)


# `lang.has_lang` determines a language from the Unicode names of a text's
# characters, which fails for characters whose name omits their script. The
# characters below are the exceptions encountered so far, each mapped to the
# language it belongs to.
_LANGUAGE_OVERRIDES: dict[str, Language] = {
    # The two-em dash bears no script in its name, and is always Coptic.
    "⸺": "COPTIC",
    # The S with oblique stroke is a Latin letter, used to transcribe a
    # character that seems absent from the Coptic Unicode.
    "Ꞩ": "COPTIC",
    # The nomisma sign is named "NOMISMA SIGN", lacking the "GREEK" that its
    # neighbours bear (such as "GREEK INDICTION SIGN").
    "𐆎": "GREEK",
}


def replace_bracketed(match: regex.Match[str]) -> str:
    text: str = match.group(1)
    del match

    if text == "·":
        # This special case happens to exist in the Wiki data. It likely
        # shouldn't be classified as belonging to one of the languages, so we
        # simply return the text itself.
        return text

    # Lacunas are encoded using `\t` in the input, and are substituted for with
    # 6 non-breaking spaces.
    text = text.replace(r"\t", page.NBSP * 6)
    # A leading or trailing space is converted to a non-breaking space, so it
    # will be preserved inside the span.
    text = regex.sub("^ | $", page.NBSP, text)

    language: Language = _LANGUAGES.identify(text)
    return _LANGUAGES.span(language, text)


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

    NOTE: Footnotes share the brace notation with manual labels, and the two
    nest either way. A manual label may wrap a footnote, and a footnote's text
    and note may each contain manual labels.

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


_MANUAL: randy.Substitution = randy.Substitution(
    r"{(.*?)}(?:{(.*?)})?",
    replace_manual,
    ban=["{", "}"],
)


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


# A gloss may break off at a lacuna, as its Coptic does: __for [__.
_GLOSS_RE: regex.Pattern[str] = regex.compile(
    r"[\p{Latin}0-9 '‘’\-.,;?!&()\[]+",
)
_BULLET_RE: regex.Pattern[str] = regex.compile(r"[a-zA-Z]+\.?")
# An italic may contain a superscript, which is substituted later:
# _^e m_, _Actes 5^e Cong._
_ITALIC_RE: regex.Pattern[str] = regex.compile(r"[\p{Latin}ʿ0-9 '\-.:?&\^]+")


def replace_gloss(match: regex.Match[str]) -> str:
    gloss: str = match.group(1)
    ensure.fullmatch(_GLOSS_RE, gloss, "gloss")
    return f'<span class="{cls.GLOSS}">{gloss}</span>'


def replace_bullet(match: regex.Match[str]) -> str:
    bullet: str = match.group(1)
    ensure.fullmatch(_BULLET_RE, bullet, "bullet")
    return f'<span class="{cls.BULLET}">{bullet}</span>'


def replace_italic(match: regex.Match[str]) -> str:
    italic: str = match.group(1)
    ensure.fullmatch(_ITALIC_RE, italic, "italic")
    return f"<i>{italic}</i>"


# The footnote marker is fixed. We don't use an enumerated marker, for the
# following reasons:
# - The footnotes have no positional meaning.
# - A simple search query for the character employed yields all occurrences of
#   footnotes in the text. The character is not employed in Crum's text.
# - An added or removed footnote Won't shift other footnotes in the text.
_FOOTNOTE_MARK: str = randy.mark("※")

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
_SUBSTITUTIONS: list[randy.Substitution] = [
    randy.Substitution(r"__(.+?)__", replace_gloss, ban=["_"]),
    randy.Substitution(
        # Bold text is simply bullets. We prefer using an explicit `bullet`
        # class to mark them, instead of relying on `<b>`.
        # NOTE: An escaped asterisk doesn't delimit a bullet. It is substituted
        # later.
        r"(?<!\\)\*(.+?)(?<!\\)\*",
        replace_bullet,
        ban=["*"],
    ),
    randy.Substitution(r"_(.+?)_", replace_italic, ban=["_"]),
    # Replace occurrences of ampersand with the HTML encoding.
    # NOTE: While most browsers and pipelines can deal with a literal ampersand,
    # BeautifulSoup often misinterprets the combination "&c;" so we convert it
    # explicitly.
    # In some cases, we made the mistake of typing "&amp;" directly, instead of
    # just "&". We ban the token "&amp;amp" to catch this error.
    # NOTE: The ampersand substitution follows the ones that validate Latin
    # text, so that they see the text as typed.
    randy.Substitution("&", "&amp;", ban=["&amp;amp"]),
    # The asterisk is not a reserved character in modern HTML, so we don't need
    # to use `&ast;`. However, a plain asterisk would trip the ban of the bold
    # rule above. We therefore leave it up to our linters to replace
    # the occurrences of `&ast;` produced here with a literal asterisk.
    # NOTE: The asterisk substitution must follow the ampersand one, which
    # would otherwise escape the `&ast;` produced here.
    randy.Substitution(r"\\\*", page.ASTERISK, ban=["*", "\\"]),
    randy.Substitution(
        randy.bracketed(r"([SABFO])(?:\^(a|f|b|af|2))?"),
        replace_dialect,
        ban=["[[", "]]", "^"],
    ),
    randy.Substitution(
        r"(\p{Letter})\^\^(\p{Letter})",
        replace_stack,
        ban=["^^"],
    ),
    randy.Substitution(r"\^([-–—\w\p{Letter}]+)", r"<sup>\1</sup>", ban=["^"]),
    randy.PARAGRAPH,
    randy.Substitution(
        randy.bracketed(r"(.*?)"),
        replace_bracketed,
        ban=["[[", "]]"],
    ),
    # NOTE: The language substitution must precede the tab substitution.
    # All remaining tabs represent subparagraph separators, and are 6 spaces
    # long. The use of regular spaces besides non-breaking spaces ensures that
    # the spaces don't get collapsed, and that this long 6-character space is
    # actually breaking.
    # A trailing space inside a span is banned, and gets moved outside it by
    # Tidy anyway.
    randy.Substitution(
        r"\\t",
        f'<span class="{cls.TAB}">{page.NBSP} {page.NBSP} {page.NBSP}</span> ',
        ban=["\\"],
    ),
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


class Column(randy.Column):
    """A column in Crum's dictionary.

    The Roman pages are those of the Additions and Corrections.
    """

    FIRST = 1
    LAST = constants.CRUM_LAST_PAGE
    ROMAN = True


# Each column of the Additions and Corrections, mapped to the last column whose
# addenda it holds.
_ADDENDA: dict[str, Column] = {
    "xva": Column("9a"),
    "xvb": Column("19b"),
    "xvia": Column("40a"),
    "xvib": Column("55b"),
    "xviia": Column("77b"),
    "xviib": Column("101b"),
    "xviiia": Column("130b"),
    "xviiib": Column("150a"),
    "xixa": Column("190a"),
    "xixb": Column("233a"),
    "xxa": Column("261a"),
    "xxb": Column("301b"),
    "xxia": Column("336b"),
    "xxib": Column("374b"),
    "xxiia": Column("414a"),
    "xxiib": Column("470b"),
    "xxiiia": Column("531b"),
    "xxiiib": Column("595b"),
    "xxiva": Column("670b"),
    "xxivb": Column("787b"),
}
assert all(a < b for a, b in itertools.pairwise(_ADDENDA.values()))


# The entry that opens a letter, such as "[[[ⲃ]]], second letter of alphabet".
# Crum sets the letter across the page, below which the columns restart.
_LETTER_RE: regex.Pattern[str] = regex.compile(
    r"\[\[\[\p{Coptic}\]\]\].*?\bletter of (the )?alphabet\b",
)


@typing.final
class Entry(randy.Entry[Column]):
    """Entry represents an entry in the Wiki sheet."""

    def __init__(
        self,
        record: dict[typing.Hashable, typing.Any],
    ) -> None:
        # headwords tracks the headwords encountered in the text. In extremely
        # rare cases, there could be multiple, e.g. ϩⲁ, ϩⲟ:
        #  https://remnqymi.com/crum/2096.html
        self._headwords: list[str] = []

        super().__init__(
            Column(record[Col.CRUM]),
            record[Col.ENTRY],
            record[Col.MARCION],
            record[Col.VIDE],
            RAW_RE,
        )
        # TODO: (#503) Ban all superfluous space in the entry, then get rid of
        # the line below.
        self.entry = self.entry.replace("  ", " ").removesuffix(" ")

    @property
    @typing.override
    def splits_page(self) -> bool:
        return bool(_LETTER_RE.match(self.entry))

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

    @typing.override
    def subs(self) -> abc.Generator[randy.Substitution]:
        # NOTE: The substitutions populate some fields, such as headwords, so
        # rendering an entry twice would be an error. Caching `html` prevents
        # that.
        assert not self._headwords
        yield randy.Substitution(
            # Four square brackets mark special-font (old) Coptic.
            randy.bracketed("(.*?)", 4),
            rf'<span class="{cls.OLD} {cls.COPTIC}">\1</span>',
            ["[[[[", "]]]]"],
        )
        # The headword substitution (which uses triple brackets) must precede
        # the double-bracket substitution.
        yield randy.Substitution(
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
            r"(?<=^(?:\()?|]]], |//)" + randy.bracketed("(.*?)", 3),
            self.replace_headword,
            ban=["[[[", "]]]"],
        )

        yield from _SUBSTITUTIONS

        yield randy.Substitution(
            # The text and the note may contain manual labels, so both are
            # matched as balanced braces, by recursing into the text group.
            r"{(?P<text>(?:[^{}]|{(?&text)})*)}{{(?P<note>(?&text))}}",
            self.replace_footnote,
            ban=["{", "}"],
        )
        # The substitution for manual labels must follow the substitution for
        # footnotes.
        yield _MANUAL
        # An addendum may name the page that the correction comes from. Besides
        # fixing the inference where it lands on the wrong column (see
        # `addenda_page`), this lets a correction come from the body of the
        # book rather than from the frontmatter, which no inference over the
        # addenda columns could ever reach.
        yield self.addendum_substitution(constants.CRUM_RE.pattern)

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
        return self.page.roman()

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

    def replace_footnote(self, match: regex.Match[str]) -> str:
        # A footnote — `{text}{{note}}` — is an editorial note of OURS on an
        # error of Crum's; an addendum (`replace_addendum`) is a correction of
        # his own. Use a footnote to record what he got wrong and what he
        # meant. See `replace_manual` for the notation it shares with manual
        # labels.
        #
        # The footnote content is embedded in a `data-footnote` attribute on
        # the `.footnoted` wrapper. The rest is taken care of by JavaScript.
        # The note's manual labels are rendered before it gets escaped, since
        # the manual label substitution can't reach inside the attribute.
        # The text's are left to it, as the text stays outside the attribute.
        # The inner `.mark` element keeps the footnote symbol visible to
        # flag the presence of a footnote.
        # We opt for inserting it in the HTML, instead of in TypeScript, to
        # fulfill the condition that post-enrichment text must be identical to
        # initial text. In other words, while TypeScript can enrich the text
        # through tooltips, styling, etc., it's not allowed to add any text that
        # wasn't there in the first place.
        attr: str = escape(_MANUAL.html(match["note"]), quote=True)
        return (
            f'<span class="{cls.FOOTNOTED}" {DATA_FOOTNOTE}="{attr}">'
            + match["text"]
            + _FOOTNOTE_MARK
            + "</span>"
        )

    @typing.override
    def __str__(self) -> str:
        return self._headwords[0] if self._headwords else self.entry

    @functools.cached_property
    @typing.override
    def addenda_page(self) -> str:
        """
        Returns:
            A string representing the page number and column in the Additions
            and Corrections section that contains addenda for this entry.

            NOTE: The inference can land on the wrong column, in two ways:
            - If addenda for a given column start on a column and spill over to
              the following one, the first column will be returned. For example,
              the addenda for '100b' start on 'xviib' and spill over to
              'xviiia'. For all entries on '100b', the addenda page will be
              reported as 'xviib'.
            - If a Crum entry spans several columns, addenda will be inferred
              based on the first column. For example, ϯ spans '392a' to '396a',
              but the addenda column will be inferred based on '392a'.

            Both only bite at a column border. Every addendum near one has
            been reviewed, and the page written out by hand wherever the
            inference went wrong, so the value is now accurate.
        """
        # We could binary-search, but the list only contains 20 elements, so
        # binary search is not worth it.
        for name, end in _ADDENDA.items():
            if self.page <= end:
                return name
        log.fatal(self, "has no addenda page!")


@functools.cache
def entries() -> list[Entry]:
    records: list[dict[typing.Hashable, typing.Any]] = file.read_tsv(
        paths.WIKI_TSV,
    ).to_dict(orient="records")
    return list(map(Entry, records))


@functools.cache
def by_marcion_key() -> dict[str, list[Entry]]:
    return randy.by_marcion_key(entries())
