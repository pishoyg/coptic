"""Crum dictionary and parsing constants."""

import dataclasses
import pathlib
import re

import regex

from dictionary.marcion_sourceforge_net import lexical
from morphology import inflect
from utils import page, paths

# Dialects.
DIALECTS: list[str] = [
    "S",  # Sahidic
    "Sa",  # Sahidic with Akhmimic tendency
    "Sf",  # Sahidic with Fayyumic tendency
    "A",  # Akhmimic
    "L",  # Lycopolitan (Subakhmimic)
    "B",  # Bohairic
    "F",  # Fayyumic
    "Fb",  # Fayyumic with Bohairic tendency
    "O",  # Old Coptic
    "NH",  # Nag Hammadi
]

MIN_KEY: int = 1
MAX_KEY: int = 3416

# Total number of entries in Crum.
# NOTE: As of Dec. 6th, 2025, we have 3414 entries. Add an expansion margin. We
# add a margin to avoid errors.
MAX_NUM_ROOTS: int = 3414 + 100

# NOTE: Our derivations table layout can accommodate a maximum depth of 4. If
# this were to change, the table layout needs to be redesigned. See `tree.py`.
MAX_DERIVATION_DEPTH: int = 4

# While the book has an appendix, we only consider the pages containing word
# definitions. Those range from 1 to 844.
CRUM_LAST_PAGE: int = 844

# Regular expressions used for parsing.
DIALECTS_RE: re.Pattern[str] = re.compile(
    r"\(({d}(,{d})*)\)".format(d=f"({"|".join(DIALECTS)})"),
)

CRUM_RE: re.Pattern[str] = re.compile(r"^(\d{1,3}|[xiv]+)(a|b)$")
_OUTSIDE_BRACKETS: str = r"(?![^()]*\)|[^{}]*\}|[^\[\]]*\])"
COMMA_OUTSIDE_BRACKETS_RE: re.Pattern[str] = re.compile(
    "," + _OUTSIDE_BRACKETS,
)
SPACE_OUTSIDE_BRACKETS_RE: re.Pattern[str] = re.compile(
    r"\s+" + _OUTSIDE_BRACKETS,
)
SEMICOLON_OUTSIDE_BRACKETS_RE: re.Pattern[str] = re.compile(
    ";" + _OUTSIDE_BRACKETS,
)
REFERENCE_RE: re.Pattern[str] = re.compile(r"\[[^\]]*\]")
ENGLISH_WITHIN_COPTIC_RE: re.Pattern[str] = re.compile(r"\{[^\}]+\}")

# \u0305: Combining overline (ⲁ̅)
# \u0300: Combining grave accent (ⲁ̀)
PURE_COPTIC_RE: re.Pattern[str] = re.compile("[Ⲁ-ⲱϢ-ϯⳈⳉ\u0305\u0300]+")

# TYPES is used to parse the "type" column.
_TYPES: list[lexical.Type] = [
    lexical.Type("-", "(-)", "-", None, append=False),
    lexical.Type("noun", "(noun)", "noun", inflect.Type.NOUN_UNKNOWN_GENDER),
    lexical.Type(
        "noun masculine",
        "(ⲡ)",
        "noun masculine",
        inflect.Type.NOUN_MASCULINE,
    ),
    lexical.Type(
        "noun feminine",
        "(ⲧ)",
        "noun feminine",
        inflect.Type.NOUN_FEMININE,
    ),
    lexical.Type(
        "noun masculine/feminine",
        "(ⲡ/ⲧ)",
        "noun masculine/feminine",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    lexical.Type("plural", "(ⲛ)", "plural", inflect.Type.NOUN_PLURAL),
    lexical.Type("pronoun", "(pron.)", "pronoun", None),
    lexical.Type(
        "interrogative particle",
        "(interr. part.)",
        "interrogative particle",
        None,
    ),
    lexical.Type(
        "interrogative pronoun",
        "(interr. pron.)",
        "interrogative pronoun",
        None,
    ),
    lexical.Type(
        "interrogative adverb",
        "(interr. adv.)",
        "interrogative adverb",
        None,
    ),
    lexical.Type(
        "verb",
        "(v.)",
        "verb",
        inflect.Type.VERB_INFINITIVE,
        append=False,
    ),
    lexical.Type("verbal prefix", "(v. prefix)", "verbal prefix", None),
    lexical.Type(
        "adjective",
        "(adj.)",
        "adjective",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    lexical.Type("conjunction", "(conj.)", "conjunction", None),
    lexical.Type("adverb", "(adv.)", "adverb", None),
    lexical.Type("preposition", "(prep.)", "preposition", None),
    lexical.Type(
        "numeral",
        "(num.)",
        "numeral",
        inflect.Type.NOUN_UNKNOWN_GENDER,
    ),
    lexical.Type(
        "numeral masculine",
        "(num. ⲡ)",
        "numeral masculine",
        inflect.Type.NOUN_MASCULINE,
    ),
    lexical.Type(
        "numeral feminine",
        "(num. ⲧ)",
        "numeral feminine",
        inflect.Type.NOUN_FEMININE,
    ),
    lexical.Type(
        "numeral masculine/feminine",
        "(num. ⲡ/ⲧ)",
        "numeral masculine/feminine",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    lexical.Type("particle", "(part.)", "particle", None),
    lexical.Type("interjection", "(interjection)", "interjection", None),
    lexical.Type(
        "personal pronoun",
        "(pers. pron.)",
        "personal pronoun",
        None,
    ),
    lexical.Type("HEADER", "(HEADER)", "HEADER", None, append=False),
    lexical.Type("letter", "(letter)", "letter", None, append=False),
]
TYPE_ENCODING: dict[str, lexical.Type] = {t.marcion(): t for t in _TYPES}

# PREPROCESSING and DETACHED_TYPES are used for parsing the word column.
PREPROCESSING: list[tuple[str, str]] = [
    # NOTE: The two consecutive dots are used in the derivations table, to
    # separate between a prefix and the letter representing the start of the
    # word.
    # For example, for ⲟⲩⲱⲓⲛⲓ (ⲟⲩⲟⲉⲓⲛ), Crum has "ⲁⲑⲟⲩ." as a derivation, "ⲁⲑ"
    # is the prefix, and "ⲟⲩ." stands for the omitted word.
    # This is represented in our database as "ⲁⲑ..ⲟⲩ." instead of simply
    # "ⲁⲑⲟⲩ.", which could be handy (though it doesn't have an apparent usage
    # today).
    ("..", ""),
    # Crum often wrote derivations with a space.
    # 1. In cases where the combination is considered, according to our own
    #    spacing standard, a single word, we would replace the space with an
    #    underscore.
    #    - For example, ‘ϯⲟⲩⲱⲓⲛⲓ’ is written as ‘ϯ ⲟⲩ.’. We would write this in
    #      our data source as ‘ϯ_ⲟⲩⲱⲓⲛⲓ’, expanding ‘ⲟⲩ.’ to its full form, and
    #      replacing the space with an underscore.
    # 2. In cases where the two parts are considered separate words in our
    #    spacing standard (i.e. our spacing criteria match Crum's), we do
    #    nothing – retaining the space as is.
    # 3. In cases where we would like to insert a space where Crum didn't have
    #    one, we use a double underscore.
    #
    # It is important to use this underscore notation, instead of simply
    # changing the spacing, in order to be able to construct the original
    # spacing used by Crum if needed.
    ("__", " "),
    ("_", ""),
]

# NOTE: As of the time of writing, some of these annotations occur only once in
# the corpus.
DETACHED_TYPES: dict[str, lexical.Type] = {
    # TODO: (#64) The question mark is not a detached type, and it might be
    # form-specific. Investigate.
    "?": lexical.Type("<i>(?)</i>", "(?)", "probably", None),  # Probably.
    "m/f:": lexical.Type(
        "<i>masculine/feminine:</i>",
        "(ⲡ, ⲧ)",
        "masculine/feminine",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    "neg": lexical.Type("<i>neg</i>", "(neg.)", "neg", None),
    "nn": lexical.Type(
        "<i>(nn)</i>",
        "(nn)",
        "(nn)",
        inflect.Type.NOUN_UNKNOWN_GENDER,
    ),
    # TODO: (#64) The following types likely apply to the subset of forms
    # occurring after the type, not the whole line.
    "f:": lexical.Type(
        "<i>feminine:</i>",
        "(ⲧ)",
        "feminine",
        lexical.Gender.FEMININE,
    ),
    "m:": lexical.Type(
        "<i>masculine:</i>",
        "(ⲡ)",
        "masculine",
        lexical.Gender.MASCULINE,
    ),
    "imp:": lexical.Type(
        "<i>imperative:</i>",
        "(imp.)",
        "imperative",
        inflect.Type.VERB_IMPERATIVE,
    ),
    "pl:": lexical.Type(
        "<i>plural:</i>",
        "(ⲛ)",
        "plural",
        lexical.Gender.PLURAL,
    ),
    # TODO: (#64) etcetera is not a detached type. Fix at the origin.
    "&c": lexical.Type("<i>&amp;c</i>", "&amp;c", "etcetera", None),
    "c": lexical.Type(
        "<i><b>c</b></i>",
        "(c)",
        "Not sure what this means!",
        None,
    ),
    # TODO: (#64) {nic} is definitely form-specific! Its presence here
    # means it's currently interpreted as applying to all forms in a word!
    # Fix!
    "{nic}": lexical.Type("{nic}", "{nic}", "{nic}", None, append=False),
    "p.c.": lexical.Type(
        "<i>p c</i>",
        "(p.c.)",
        "conjunctive participle",
        None,
    ),
    # TODO: (#64) Once detached types are correctly placed in the HTML, show the
    # variant label. We hide it now because it would be too confusing!
    "var": lexical.Type("var", "(var)", "variant", None, append=False),
    # incidental words are words that are extracted solely from Crum's
    # illustrative citations, and which do not appear as standalone headwords
    # or sub-entries in the original text.
    "inc": lexical.Type("inc", "(inc)", "incidental", None, append=False),
}

# What characters are allowed to be present in a Coptic morpheme?
WORD_RE: re.Pattern[str] = re.compile(
    "|".join(
        [
            # In Crum's dictionary, a horizontal bar (U+2015) means ‘same as
            # above’.
            "―",
            # A Coptic morpheme could also be an abbreviation:
            "ⳤ",
            "⳥",
            "⳦",
            "⳧",
            "⳨",
            "⳩",
            "⳪\u0305?",
            # Some morphemes represent suffixes, in which case the morpheme
            # starts with a hyphen.
            "-[Ⲁ-ⲱϢ-ϯⳈⳉ]+",
            # A "normal" Coptic word contains Coptic letters, and sometimes
            # parentheses, and diacritics.
            # _ Coptic letters occur in three ranges in the Unicode:
            #   1. ⲁ-ⲱ
            #   2. ϣ-ϯ
            #   3. ⳉ
            # - We have the following diacritics:
            #   1. \u0305 (combining overline)
            #   2. \u0300 (combining grave accent)
            #   N.B. A diacritic must be preceded by a letter.
            # - Parentheses mark optional letters. Example: ⲟⲩⲁ(ⲉ)ⲓⲛⲉ (Akhmimic
            #   for light) indicates that the ⲉ is sometimes omitted.
            # - At the very end, we may have a period indicating an
            #   abbreviation.
            # - Special verbal forms end with markers:
            #   1. A hyphen marks a prenominal form. Example: ⲁⲓ-.
            #   2. A double oblique hyphen marks pronominal forms. Example: ⲁⲓ⸗.
            #   3. The upper dagger marks a qualitative (stative) form.
            #      Example: ⲟⲓ†.
            # NOTE: Parentheses also mark assumed (unattested) forms, in which
            # case they wrap the whole morpheme. This case isn't represented in
            # the regex below, as this class of parentheses gets normalized
            # before the morpheme is passed.
            r"([Ⲁ-ⲱϢ-ϯⳈⳉ][\u0305\u0300]?|[()])+\.?[\-⸗†]?",
        ],
    ),
)

# The following is used to parse the English meaning column.
# TODO: (#0) This list is likely not comprehensive, and it's expected to grow.
_HEADINGS: list[str] = [
    "intr",
    "intr & tr",
    "tr",
    "tr & intr",
    "tr & refl",
    "qual",
    "refl",
    "noun",
    "noun masculine",
]

GREEK_WORD_RE: regex.Pattern[str] = regex.compile(
    r"(-?\p{Greek}[\p{Greek}\p{Coptic}\p{M}]*-?)",
)
BRACKETED_RE: re.Pattern[str] = re.compile(r"\[(.*?)\]")
GREEK_WORD: str = GREEK_WORD_RE.pattern
GREEK_WORDS: str = rf"(?:{GREEK_WORD}(?: {GREEK_WORD}| \({GREEK_WORD}\))*)"
GREEK_RE: regex.Pattern[str] = regex.compile(
    rf"{GREEK_WORDS}(?:, {GREEK_WORDS})*(?: &c)?",
)
UNBRACKETED_GREEK_RE: regex.Pattern[str] = regex.compile(
    r"\p{Greek}" + _OUTSIDE_BRACKETS,
)


ENGLISH_PROCESSING: list[
    tuple[re.Pattern[str] | regex.Pattern[str] | str, str]
] = [
    # Curly brackets are used to indicate roman (non-italic) text.
    ("{", '<span class="roman">'),
    ("}", "</span>"),
    # Mark paragraph headings.
    (
        re.compile(rf"(\b({"|".join(_HEADINGS)})( \([a-zA-Z? ]+\))?:)"),
        r'<span class="heading">\1</span>',
    ),
    ("\n", page.LINE_BREAK),
    (GREEK_WORD_RE, r'<span class="greek">\1</span>'),
]

QUALITY: list[str] = [
    "complete",
    "complete+",
    "complete++",
    "complete+cz",
]

# Image constants:
_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
IMG_SRC_DIR: pathlib.Path = _SCRIPT_DIR / "data" / "img"
IMG_DST_DIR: pathlib.Path = paths.CRUM_EXPLANATORY_DIR
SOURCES_DIR: pathlib.Path = _SCRIPT_DIR / "data" / "img-sources"
BASENAME_RE: re.Pattern[str] = re.compile(r"(\d+)-(\d+)-(\d+)(\.[^\d]+)")
NAME_RE: re.Pattern[str] = re.compile("[A-Z][a-zA-Z ]*")

# NOTE: SVG conversion is nondeterministic, which is badly disruptive to our
# pipelines, so we ban it.
# PNG conversion is deterministic as long as it's converted to JPG, so we
# accept it but convert it.
EXT_MAP: dict[str, str] = {
    ".png": ".jpg",
}

IMAGE_EXTENSIONS: set[str] = {
    ".avif",
    ".gif",
    ".jpeg",
    ".jpg",
    ".JPG",
    ".png",
    ".webp",
    ".svg",
}
VALID_SRC_EXTENSIONS: set[str] = IMAGE_EXTENSIONS.difference({".svg"})
VALID_DST_EXTENSIONS: set[str] = VALID_SRC_EXTENSIONS.difference({".png"})


@dataclasses.dataclass
class Column:
    """Represents a column in the Additions and Corrections."""

    def __init__(self, name: str, end: str) -> None:
        self.name: str = name
        self.end: lexical.Column = lexical.Column(end)


COLUMN_RANGES: list[Column] = [
    Column("xva", "9a"),
    Column("xvb", "19b"),
    Column("xvia", "40a"),
    Column("xvib", "55b"),
    Column("xviia", "77b"),
    Column("xviib", "101b"),
    Column("xviiia", "130b"),
    Column("xviiib", "150a"),
    Column("xixa", "190a"),
    Column("xixb", "233a"),
    Column("xxa", "261a"),
    Column("xxb", "301b"),
    Column("xxia", "336b"),
    Column("xxib", "374b"),
    Column("xxiia", "414a"),
    Column("xxiib", "470b"),
    Column("xxiiia", "531b"),
    Column("xxiiib", "595b"),
    Column("xxiva", "670b"),
    Column("xxivb", "787b"),
]

for idx, col in enumerate(COLUMN_RANGES[1:], 1):
    assert col.end > COLUMN_RANGES[idx - 1].end
