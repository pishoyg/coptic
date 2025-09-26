"""Crum dictionary and parsing constants."""

import pathlib
import re

from dictionary.marcion_sourceforge_net import lexical
from morphology import inflect
from utils import paths

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
MAX_KEY: int = 3385

# NOTE: Our derivations table layout can accommodate a maximum depth of 4. If
# this were to change, the table layout needs to be redesigned. See `tree.py`.
MAX_DERIVATION_DEPTH: int = 4
CRUM_LAST_PAGE_NUM: int = 953

# Regular expressions used for parsing.
DIALECTS_RE: re.Pattern[str] = re.compile(
    r"\(({d}(,{d})*)\)".format(d=f"({"|".join(DIALECTS)})"),
)

PARSED_GREEK_WITHIN_ENGLISH_RE: re.Pattern[str] = re.compile(
    r"(\[[ ,()&c?;Α-Ωα-ω]+\])",
)

CRUM_RE: re.Pattern[str] = re.compile(r"^(\d{1,3})(a|b)$")
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
    lexical.Type("noun male", "(ⲡ)", "noun male", inflect.Type.NOUN_MASCULINE),
    lexical.Type(
        "noun female",
        "(ⲧ)",
        "noun female",
        inflect.Type.NOUN_FEMININE,
    ),
    lexical.Type(
        "noun male/female",
        "(ⲡ/ⲧ)",
        "noun male/female",
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
        "numeral male",
        "(num. ⲡ)",
        "numeral male",
        inflect.Type.NOUN_MASCULINE,
    ),
    lexical.Type(
        "numeral female",
        "(num. ⲧ)",
        "numeral female",
        inflect.Type.NOUN_FEMININE,
    ),
    lexical.Type(
        "numeral male/female",
        "(num. ⲡ/ⲧ)",
        "numeral male/female",
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
]

# NOTE: As of the time of writing, some of these annotations occur only once in
# the corpus.
DETACHED_TYPES: dict[str, lexical.Type] = {
    # TODO: (#115) The question mark is not a detached type, and it might be
    # form-specific. Investigate.
    "?": lexical.Type("<i>(?)</i>", "(?)", "probably", None),  # Probably.
    "m/f:": lexical.Type(
        "<i>male/female:</i>",
        "(ⲡ, ⲧ)",
        "male/female",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    "neg": lexical.Type("<i>neg</i>", "(neg.)", "neg", None),
    "nn": lexical.Type(
        "<i>(nn)</i>",
        "(nn)",
        "(nn)",
        inflect.Type.NOUN_UNKNOWN_GENDER,
    ),
    # TODO: (#115) The following types likely apply to the subset of forms
    # occurring after the type, not the whole line.
    "f:": lexical.Type(
        "<i>female:</i>",
        "(ⲧ)",
        "female",
        lexical.Gender.FEMININE,
    ),
    "m:": lexical.Type(
        "<i>male:</i>",
        "(ⲡ)",
        "male",
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
    "&c": lexical.Type("<i>&c</i>", "(&c)", "constructed with", None),
    "c": lexical.Type(
        "<i><b>c</b></i>",
        "(c)",
        "Not sure what this means!",
        None,
    ),
    # TODO: (#115) {nic} is definitely form-specific! Its presence here
    # means it's currently interpreted as applying to all forms in a word!
    # Fix!
    "{nic}": lexical.Type("{nic}", "{nic}", "{nic}", None, append=False),
    "p.c.": lexical.Type(
        "<i>p c</i>",
        "(p.c.)",
        "conjunctive participle",
        None,
    ),
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
_BOLDEN: list[str] = [
    "intr",
    "intr & tr",
    "tr",
    "tr & intr",
    "tr & refl",
    "qual",
    "refl",
    "noun",
    "noun male",
]
ENGLISH_PROCESSING: list[tuple[re.Pattern[str] | str, str]] = [
    # Curly brackets are used to indicate italics.
    ("{", "<i>"),
    ("}", "</i>"),
    # Bolden markers in the English column.
    # TODO: (#0) This list is likely not comprehensive, and it's expected to
    # grow.
    (
        re.compile(rf"(\b({"|".join(_BOLDEN)})( \([a-zA-Z? ]+\))?:)"),
        r"<b>\1</b>",
    ),
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
