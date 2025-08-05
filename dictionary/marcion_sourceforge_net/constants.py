"""Crum dictionary and parsing constants."""

import re

from dictionary.marcion_sourceforge_net import word as lexical
from morphology import inflect

# Dialects.
DIALECTS = [
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

MAX_DERIVATION_DEPTH = 4
CRUM_LAST_PAGE_NUM = 953

# Regular expressions used for parsing.
DIALECTS_RE = re.compile(
    r"\({d}(,{d})*\)".format(
        d="({})".format(  # pylint: disable=consider-using-f-string
            "|".join(DIALECTS),
        ),
    ),
)
SPELLINGS_TYPES_REFERENCES_RE = re.compile(r"[^()]+")

ENGLISH_WITHIN_COPTIC_RE = re.compile(r"\{[^\{\}]+\}")
COPTIC_WITHIN_ENGLISH_RE = re.compile(r"\[[^\[\]]+\]")
GREEK_WITHIN_ENGLISH_RE = re.compile(r"\[\[[^\]]+\]\]")
PARSED_GREEK_WITHIN_ENGLISH_RE = re.compile(r"(\[[ ,()&c?;Α-Ωα-ω]+\])")
FINAL_SIGMA_RE = re.compile(r"σ\b")

CRUM_RE = re.compile(r"^(\d{1,3})(a|b)$")
REFERENCE_RE = re.compile(r'\*\^<a href="([^"<>]+)">([^<>]+)</a>([^<>]*)\^\*')
COMMA_NOT_BETWEEN_PARENTHESES_RE = re.compile(
    r",(?![^()]*\)|[^{}]*\}|[^\[\]]*\])",
)
PURE_COPTIC_RE = re.compile("[Ⲁ-ⲱϢ-ϯⳈⳉ]+")

CRUM_PAGE_FMT = (
    "https://coptot.manuscriptroom.com/crum-coptic-dictionary?pageID={key}"
)
CARD_LINK_FMT = "https://remnqymi.com/crum/{key}.html"

# LETTER_ENCODING is used to convert ASCII-encoded Coptic text to unicode.
LETTER_ENCODING = {
    "a": "ⲁ",
    "b": "ⲃ",
    "g": "ⲅ",
    "d": "ⲇ",
    "e": "ⲉ",
    "V": "ⲋ",
    "z": "ⲍ",
    "h": "ⲏ",
    "q": "ⲑ",
    "i": "ⲓ",
    "k": "ⲕ",
    "l": "ⲗ",
    "m": "ⲙ",
    "n": "ⲛ",
    "j": "ⲝ",
    "o": "ⲟ",
    "p": "ⲡ",
    "r": "ⲣ",
    "s": "ⲥ",
    "t": "ⲧ",
    "u": "ⲩ",
    "f": "ⲫ",
    "x": "ⲭ",
    "c": "ⲯ",
    "w": "ⲱ",
    "S": "ϣ",
    "F": "ϥ",
    "K": "ϧ",
    "H": "ϩ",
    "J": "ϫ",
    "G": "ϭ",
    "T": "ϯ",
    "Q": "ⳉ",
}
LETTERS = set(LETTER_ENCODING.values())

GREEK_LETTER_ENCODING = {
    "A": "Α",
    "B": "Β",
    "C": "Ξ",
    "D": "Δ",
    "E": "Ε",
    "F": "Φ",
    "G": "Γ",
    "H": "Η",
    "I": "Ι",
    "J": "Ξ",
    "K": "Κ",
    "L": "Λ",
    "M": "Μ",
    "N": "Ν",
    "O": "Ο",
    "P": "Π",
    "Q": "Θ",
    "R": "Ρ",
    "S": "Σ",
    "T": "Τ",
    "U": "Υ",
    "W": "Ω",
    "X": "Χ",
    "Y": "Ψ",
    "Z": "Ζ",
    "a": "α",
    "b": "β",
    "c": "ξ",
    "d": "δ",
    "e": "ε",
    "f": "φ",
    "g": "γ",
    "h": "η",
    "i": "ι",
    "j": "ξ",
    "k": "κ",
    "l": "λ",
    "m": "μ",
    "n": "ν",
    "o": "ο",
    "p": "π",
    "q": "θ",
    "r": "ρ",
    "s": "σ",
    "t": "τ",
    "u": "υ",
    "w": "ω",
    "x": "χ",
    "y": "ψ",
    "z": "ζ",
}

# QUALITY_ENCODING is used to parse the "quality" column.
QUALITY_ENCODING = {
    0: "weak",
    1: "full",
    2: "word and derivations",
    3: "word",
    4: "word alone",
    5: "advanced",
    6: "complete",
    7: "complete+",
    8: "complete++",
    9: "complete+cz",
}

# TYPE_ENCODING is used to parse the "type" column.
TYPE_ENCODING = {
    0: lexical.Type("-", "(-)", "-", None, append=False),
    3: lexical.Type(
        "noun",
        "(noun)",
        "noun",
        inflect.Type.NOUN_UNKNOWN_GENDER,
    ),  # (ⲟⲩ)
    1: lexical.Type(
        "noun male",
        "(ⲡ)",
        "noun male",
        inflect.Type.NOUN_MASCULINE,
    ),
    4: lexical.Type(
        "noun female",
        "(ⲧ)",
        "noun female",
        inflect.Type.NOUN_FEMININE,
    ),
    22: lexical.Type(
        "noun male/female",
        "(ⲡ/ⲧ)",
        "noun male/female",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    8: lexical.Type("plural", "(ⲛ)", "plural", inflect.Type.NOUN_PLURAL),
    5: lexical.Type("pronoun", "(pron.)", "pronoun", None),
    23: lexical.Type(
        "interrogative particle",
        "(interr. part.)",
        "interrogative particle",
        None,
    ),
    14: lexical.Type(
        "interrogative pronoun",
        "(interr. pron.)",
        "interrogative pronoun",
        None,
    ),
    15: lexical.Type(
        "interrogative adverb",
        "(interr. adv.)",
        "interrogative adverb",
        None,
    ),
    2: lexical.Type(
        "verb",
        "(v.)",
        "verb",
        inflect.Type.VERB_INFINITIVE,
        append=False,
    ),
    21: lexical.Type("verbal prefix", "(v. prefix)", "verbal prefix", None),
    6: lexical.Type(
        "adjective",
        "(adj.)",
        "adjective",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    16: lexical.Type("conjunction", "(conj.)", "conjunction", None),
    7: lexical.Type("adverb", "(adv.)", "adverb", None),
    9: lexical.Type("preposition", "(prep.)", "preposition", None),
    13: lexical.Type(
        "numeral",
        "(num.)",
        "numeral",
        inflect.Type.NOUN_UNKNOWN_GENDER,
    ),
    10: lexical.Type(
        "numeral male",
        "(num. ⲡ)",
        "numeral male",
        inflect.Type.NOUN_MASCULINE,
    ),
    11: lexical.Type(
        "numeral female",
        "(num. ⲧ)",
        "numeral female",
        inflect.Type.NOUN_FEMININE,
    ),
    24: lexical.Type(
        "numeral male/female",
        "(num. ⲡ/ⲧ)",
        "numeral male/female",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    17: lexical.Type("particle", "(part.)", "particle", None),
    18: lexical.Type("interjection", "(interjection)", "interjection", None),
    20: lexical.Type(
        "personal pronoun",
        "(pers. pron.)",
        "personal pronoun",
        None,
    ),
    99: lexical.Type("HEADER", "(HEADER)", "HEADER", None, append=False),
}

# PREPROCESSING, SPELLING_ANNOTATIONS, and DETACHED_TYPES, and POSTPROCESSING
# are essential for parsing the word column.
PARENTHESES_AND_BRACKETS = [
    ("*+", "+"),
    # NOTE: The two consecutive dots are used in the derivations table, to
    # separate between a prefix and the letter representing the start of the
    # word.
    # For example, for ⲟⲩⲱⲓⲛⲓ (ⲟⲩⲟⲉⲓⲛ), Crum has "ⲁⲑⲟⲩ." as a derivation, "ⲁⲑ"
    # is the prefix, and "ⲟⲩ." stands for the omitted word.
    # This is represented in our database as "ⲁⲑ..ⲟⲩ." instead of simply
    # "ⲁⲑⲟⲩ.", which could be handy (though it doesn't have an apparent usage
    # today).
    ("..", ""),
    ("*^", "{"),  # English-within-Coptic left bracket.
    ("^*", "}"),  # English-within-Coptic right bracket.
    ("$^", "("),  # Left parenthesis.
    ("^$", ")"),  # Right parenthesis.
    ("[", "["),  # Coptic-within-English left bracket.
    ("]", "]"),  # Coptic-within-English right bracket.
    # The following are only relevant for Coptic-within-English in the English
    # meaning column.
    ("/*", "("),
    ("*/", ")"),
    ("/$", "["),
    ("$/", "]"),
]

SPELLING_ANNOTATIONS_1 = [
    # These are always spelling-specific, and are (for the time being) left as
    # part of the spellings!
    # Prenominal form.
    (
        "-",
        lexical.Type(
            "-",
            "-",
            "prenominal form (likely)",
            inflect.Type.VERB_PRENOMINAL,
        ),
    ),
    # TODO: (#0) The dash is a typo. Fix at the origin. It should be a hyphen.
    # Prenominal form. (This is a dash, not a hyphen.)
    (
        "–",
        lexical.Type(
            "-",
            "-",
            "prenominal form (likely)",
            inflect.Type.VERB_PRENOMINAL,
        ),
    ),
    (
        "=",
        lexical.Type(
            "⸗",
            "⸗",
            "pronominal form",
            inflect.Type.VERB_PRONOMINAL,
        ),
    ),  # Pronominal form.
    (
        "+",
        lexical.Type(
            "†",
            "†",
            "qualitative form",
            inflect.Type.VERB_QUALITATIVE,
        ),
    ),  # Qualitative (stative) form.
]

DETACHED_TYPES_1 = [
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

SPELLING_ANNOTATIONS_2 = [
    ("^^", lexical.Type("―", "―", "same spelling as above.", None)),
]

DETACHED_TYPES_2 = [
    (
        "^",
        lexical.Type("<i>p c </i>", "(p.c.)", "conjunctive participle", None),
    ),
]

# ACCEPTED_UNKNOWN_CHARS are characters that shouldn't cause confusion when
# encountered in the Coptic text.
# A comma separates different spellings.
# A period indicates a substitution. (For example, under the entry for ⲉⲃⲣⲏϫ,
# ⲥⲉⲧⲉ. is understood to mean ⲥⲉⲧⲉⲃⲣⲏϫ.)
# A space is a space.
# Parentheses and square brackets are also used sometimes.
ACCEPTED_UNKNOWN_CHARS = ",. []()-=+$*^"

# The no-English, no-type, spelling-split, no-"probably" version of the above.
# . signifies an abbreviation.
# ― means "same as above".
# () represent optional letters.
# - represents the prenominal form.
# ⸗ represents the pronominal form.
# † represents the qualitative form.
#   can be used inside a word.
# [] are sometimes used in place of (). Rare, and should be fixable at the
#    source.
# , occurred only once, should be fixable at the source.
ACCEPTED_UNKNOWN_CHARS_2 = ".()-⸗†― [],"

# The following is used to parse the English meaning column.
ENGLISH_POSTPROCESSING = [
    ("^+", "✠"),
    ("{", "<b>"),
    ("}", "</b>"),
    ("(", "<i>"),
    (")", "</i>"),
    (" | ", "\n"),
    (" |", "\n"),
    ("/*", "("),
    ("*/", ")"),
    ("/$gk:", "["),
    ("$/", "]"),
    ("$", "―"),
]

ENGLISH_PRETTIFYING = [
    (re.compile(r"\bp c\b"), "p.c."),
]

# CLEAN is used to prettify the output.
CLEAN = [
    ("  ", " "),
    ("[ ", "["),
    (" ]", "]"),
    ("( ", "("),
    (" )", ")"),
    ("{ ", "{"),
    (" }", "}"),
]
