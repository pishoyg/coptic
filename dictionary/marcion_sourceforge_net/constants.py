"""Crum dictionary and parsing constants."""

import re

from dictionary.marcion_sourceforge_net import word as lexical
from morphology import inflect

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

MAX_DERIVATION_DEPTH: int = 4
CRUM_LAST_PAGE_NUM: int = 953

# Regular expressions used for parsing.
DIALECTS_RE: re.Pattern[str] = re.compile(
    r"\({d}(,{d})*\)".format(
        d="({})".format(  # pylint: disable=consider-using-f-string
            "|".join(DIALECTS),
        ),
    ),
)

ENGLISH_WITHIN_COPTIC_RE: re.Pattern[str] = re.compile(r"\{[^\{\}]+\}")
PARSED_GREEK_WITHIN_ENGLISH_RE: re.Pattern[str] = re.compile(
    r"(\[[ ,()&c?;Α-Ωα-ω]+\])",
)

CRUM_RE: re.Pattern[str] = re.compile(r"^(\d{1,3})(a|b)$")
REFERENCE_RE: re.Pattern[str] = re.compile(
    r'{<a href="([^"<>]+)">([^<>]+)</a>([^<>]*)}',
)
COMMA_NOT_BETWEEN_PARENTHESES_RE: re.Pattern[str] = re.compile(
    r",(?![^()]*\)|[^{}]*\}|[^\[\]]*\])",
)
PURE_COPTIC_RE: re.Pattern[str] = re.compile("[Ⲁ-ⲱϢ-ϯⳈⳉ]+")

# TYPES is used to parse the "type" column.
TYPES: list[lexical.Type] = [
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
TYPE_ENCODING: dict[str, lexical.Type] = {t.marcion(): t for t in TYPES}

# PREPROCESSING, SPELLING_ANNOTATIONS, and DETACHED_TYPES, and POSTPROCESSING
# are essential for parsing the word column.
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

DETACHED_TYPES_1: list[tuple[str, lexical.Type]] = [
    # TODO: (#115) The question mark is not a detached type, and it might be
    # spelling-specific. Investigate.
    ("$$", lexical.Type("<i>(?)</i>", "(?)", "probably", None)),  # Probably.
    (
        "***$",
        lexical.Type(
            "<i>noun male/female: </i>",
            "(ⲡ, ⲧ)",
            "noun male/female",
            inflect.Type.NOUN_MASCULINE_OR_FEMININE,
        ),
    ),
    ("$**", lexical.Type("<i>neg </i>", "(neg.)", "neg", None)),
    (
        "$*",
        lexical.Type(
            "<i>(nn)</i>",
            "(nn)",
            "(nn)",
            inflect.Type.NOUN_UNKNOWN_GENDER,
        ),
    ),
    (
        "**$",
        lexical.Type(
            "<i>noun female: </i>",
            "(ⲧ)",
            "noun female",
            inflect.Type.NOUN_FEMININE,
        ),
    ),
    (
        "*$",
        lexical.Type(
            "<i>noun male: </i>",
            "(ⲡ)",
            "noun male",
            inflect.Type.NOUN_MASCULINE,
        ),
    ),
    (
        "*****",
        lexical.Type(
            "<i>noun: </i>",
            "(noun)",
            "noun",
            inflect.Type.NOUN_UNKNOWN_GENDER,
        ),
    ),  # (ⲟⲩ)
    # TODO: (#115) The following types likely apply to the subset of spellings
    # occurring after the type, not the whole line.
    (
        "****",
        lexical.Type(
            "<i>female: </i>",
            "(ⲧ)",
            "female",
            lexical.Gender.FEMININE,
        ),
    ),
    (
        "***",
        lexical.Type("<i>male: </i>", "(ⲡ)", "male", lexical.Gender.MASCULINE),
    ),
    (
        "**",
        lexical.Type(
            "<i>imperative: </i>",
            "(imp.)",
            "imperative",
            inflect.Type.VERB_IMPERATIVE,
        ),
    ),
    (
        "*",
        lexical.Type(
            "<i>plural: </i>",
            "(ⲛ)",
            "plural",
            lexical.Gender.PLURAL,
        ),
    ),
    ("$", lexical.Type("<i> &c</i>", "(&c)", "constructed with", None)),
    (
        "^^^",
        lexical.Type(
            "<i><b>c</b></i>",
            "(c)",
            "Not sure what this means!",
            None,
        ),
    ),
    # TODO: (#115) {nic} is definitely spelling-specific! Its presence here
    # means it's currently interpreted as applying to all spellings in a word!
    # Fix!
    (
        "{nic}",
        lexical.Type("{nic}", "{nic}", "{nic}", None, append=False),
    ),  # No idea!
]

SPELLING_ANNOTATIONS: list[tuple[str, lexical.Type]] = [
    ("^^", lexical.Type("―", "―", "same spelling as above.", None)),
]

DETACHED_TYPES_2: list[tuple[str, lexical.Type]] = [
    (
        "^",
        lexical.Type("<i>p c </i>", "(p.c.)", "conjunctive participle", None),
    ),
]

# What characters are allowed to be present in a Coptic morpheme?
# - In Crum's dictionary, an em dash (—) means ‘same as the above’. This occurs
#   on its own.
# - Some morphemes represent suffixes, in which case the morpheme starts with a
#   hyphen. Example: -ⲡⲉ.
# - A word consists of Coptic letters. These occur in three ranges in the
#   Unicode:
#   1. ⲁ-ⲱ
#   2. ϣ-ϯ
#   3. ⳉ
# - Parentheses mark optional letters. Example: ⲟⲩⲁ(ⲉ)ⲓⲛⲉ (Akhmimic for light)
#   indicates that the ⲉ is sometimes omitted.
# - Parentheses also mark assumed (unattested) spellings, in which case they
#   wrap the whole morpheme. (As of today, this case isn't represented in the
#   regex below.)
# - A period indicates an abbreviation. This usually occur at the end.
# - Special verbal forms end with markers:
#   - A hyphen marks a prenominal form. Example: ⲁⲓ-.
#   - A double oblique hyphen marks pronominal forms. Example: ⲁⲓ⸗.
#   - The upper dagger marks a qualitative (stative) form. Example: ⲟⲓ†.
MORPHEME_RE: re.Pattern[str] = re.compile(
    r"―|-[Ⲁ-ⲱϢ-ϯⳈⳉ]+|[Ⲁ-ⲱϢ-ϯⳈⳉ()]+\.?[-⸗†]?",
)

# The following is used to parse the English meaning column.
ENGLISH_PROCESSING: list[tuple[re.Pattern[str] | str, str]] = [
    # Curly brackets are used to indicate italics.
    ("{", "<i>"),
    ("}", "</i>"),
    # Bolden markers in the English column.
    # TODO: (#0) This list is likely not comprehensive, and it's expected to
    # grow.
    (
        re.compile(
            r"(\b(intr|intr & tr|tr|tr & intr|tr & refl|qual|refl|noun|noun male)( \([a-zA-Z? ]+\))?:)",  # pylint: disable=line-too-long
        ),
        r"<b>\1</b>",
    ),
    # Slightly prettify the notation for the conjunctive participle.
    (re.compile(r"\bp c\b"), "p.c."),
]
