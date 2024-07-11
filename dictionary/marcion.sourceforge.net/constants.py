import re

import word as lexical

from dictionary.inflect import inflect

# Dialects.
DIALECTS = ["S", "Sa", "Sf", "A", "sA", "B", "F", "Fb", "O", "NH"]
DIALECT_TO_NAME = {
    "S": "Sahidic",
    "Sa": "Akhmimic Sahidic",
    "Sf": "Fayyumic Sahidic",
    "A": "Akhmimic",
    "sA": "subAkhmimic",
    "B": "Bohairic",
    "F": "Fayyumic",
    "Fb": "Bohairic Fayyumic",
    "O": "Old Coptic",
    "NH": "Nag Hammadi",
}

MAX_DERIVATION_DEPTH = 4
CRUM_LAST_PAGE_NUM = 953

# Regular expressions used for parsing.
DIALECTS_RE = re.compile(r"\({d}(,{d})*\)".format(d="({})".format("|".join(DIALECTS))))
SPELLINGS_TYPES_REFERENCES_RE = re.compile(r"[^()]+")

ENGLISH_WITHIN_COPTIC_RE = re.compile(r"\{[^\{\}]+\}")
COPTIC_WITHIN_ENGLISH_RE = re.compile(r"\[[^\[\]]+\]")
GREEK_WITHIN_ENGLISH_RE = re.compile(r"\[\[[^\]]+\]\]")
PARSED_GREEK_WITHIN_ENGLISH_RE = re.compile(r"(\[[ ,()&c?;Α-Ωα-ω]+\])")
GREEK_WORD = re.compile("([Α-Ωα-ω]+)")

CRUM_RE = re.compile(r"^(\d{1,3})(a|b)$")
REFERENCE_RE = re.compile(r'\*\^<a href="([^"<>]+)">([^<>]+)</a>([^<>]*)\^\*')
COMMA_NOT_BETWEEN_PARENTHESES_RE = re.compile(r",(?![^()]*\)|[^{}]*\}|[^\[\]]*\])")
COPTIC_LETTER_RE = re.compile("[Ⲁ-ⲱϢ-ϯⳈⳉ]")
PAGE_NUMER_RE = re.compile("[0-9]{1,3}[ab]$")
CLASS_RE = re.compile("[a-z ]+|-")
TWO_TABS_RE = re.compile("\t\t")
ENGLISH_LETTER_RE = re.compile("[a-zA-Z]")

CRUM_PAGE_FMT = "https://coptot.manuscriptroom.com/crum-coptic-dictionary?pageID={key}"
KOINE_GREEK_DICTIONARY_FMT = (
    "https://logeion.uchicago.edu/{key}"
    # "https://www.billmounce.com/search/node/{key}%20type%3Alexicon"
)

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
    0: lexical.type("-", "(-)", "-", None, append=False),
    # (ⲟⲩ)
    3: lexical.type("noun", "(noun)", "noun", inflect.Type.NOUN_NO_ARTICLE),
    1: lexical.type("noun male", "(ⲡ)", "noun male", inflect.Type.NOUN_MASCULINE),
    4: lexical.type("noun female", "(ⲧ)", "noun female", inflect.Type.NOUN_FEMININE),
    22: lexical.type(
        "noun male/female",
        "(ⲡ/ⲧ)",
        "noun male/female",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    25: lexical.type(
        "noun female/male",
        "(ⲧ/ⲡ)",
        "noun female/male",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    8: lexical.type("plural", "(ⲛ)", "plural", inflect.Type.NOUN_PLURAL),
    5: lexical.type("pronoun", "(pron.)", "pronoun", None),
    23: lexical.type(
        "interrogative particle", "(interr. part.)", "interrogative particle", None
    ),
    14: lexical.type(
        "interrogative pronoun", "(interr. pron.)", "interrogative pronoun", None
    ),
    15: lexical.type(
        "interrogative adverb", "(interr. adv.)", "interrogative adverb", None
    ),
    2: lexical.type("verb", "(v.)", "verb", inflect.Type.VERB_INFINITIVE, append=False),
    21: lexical.type("verbal prefix", "(v. prefix)", "verbal prefix", None),
    6: lexical.type(
        "adjective", "(adj.)", "adjective", inflect.Type.NOUN_MASCULINE_OR_FEMININE
    ),
    16: lexical.type("conjunction", "(conj.)", "conjunction", None),
    7: lexical.type("adverb", "(adv.)", "adverb", None),
    9: lexical.type("preposition", "(prep.)", "preposition", None),
    13: lexical.type("numeral", "(num.)", "numeral", inflect.Type.NOUN_UNKNOWN_GENDER),
    10: lexical.type(
        "numeral male", "(num. ⲡ)", "numeral male", inflect.Type.NOUN_MASCULINE
    ),
    11: lexical.type(
        "numeral female", "(num. ⲧ)", "numeral female", inflect.Type.NOUN_FEMININE
    ),
    24: lexical.type(
        "numeral male/female",
        "(num. ⲡ/ⲧ)",
        "numeral male/female",
        inflect.Type.NOUN_MASCULINE_OR_FEMININE,
    ),
    17: lexical.type("particle", "(part.)", "particle", None),
    18: lexical.type("interjection", "(interjection)", "interjection", None),
    20: lexical.type("personal pronoun", "(pers. pron.)", "personal pronoun", None),
    99: lexical.type("HEADER", "(HEADER)", "HEADER", None, append=False),
}

# PREPROCESSING, SPELLING_ANNOTATIONS, and DETACHED_TYPES, and POSTPROCESSING
# are essential for parsing the word column.
PREPROCESSING = [
    ("*+", "+"),
    ("..", ""),  # TODO: Investigate the meaning of the two dots.
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
        lexical.type(
            "-", "-", "prenominal form (likely)", inflect.Type.VERB_PRENOMINAL
        ),
    ),
    # TODO: The dash is a typo. Fix at the origin.
    # Prenominal form. (This is a dash, not a hyphen.)
    (
        "–",
        lexical.type(
            "-", "-", "prenominal form (likely)", inflect.Type.VERB_PRENOMINAL
        ),
    ),
    (
        "=",
        lexical.type("=", "=", "pronominal form", inflect.Type.VERB_PRONOMINAL),
    ),  # Pronominal form. # ⸗
    (
        "+",
        lexical.type("+", "+", "qualitative form", inflect.Type.VERB_QUALITATIVE),
    ),  # (ⲉϥ)
    ("$$", lexical.type("<i>(?)</i>", "(?)", "probably", None)),  # Probably.
]

DETACHED_TYPES_1 = [
    (
        "***$",
        lexical.type(
            "<i>noun male/female: </i>",
            "(ⲡ, ⲧ)",
            "noun male/female",
            inflect.Type.NOUN_MASCULINE_OR_FEMININE,
        ),
    ),
    ("$**", lexical.type("<i>neg </i>", "(neg.)", "neg", None)),
    ("$*", lexical.type("<i>(nn)</i>", "(nn)", "(nn)", inflect.Type.NOUN_NO_ARTICLE)),
    (
        "**$",
        lexical.type(
            "<i>noun female: </i>", "(ⲧ)", "noun female", inflect.Type.NOUN_FEMININE
        ),
    ),
    (
        "*$",
        lexical.type(
            "<i>noun male: </i>", "(ⲡ)", "noun male", inflect.Type.NOUN_MASCULINE
        ),
    ),
    (
        "*****",
        lexical.type("<i>noun: </i>", "(noun)", "noun", inflect.Type.NOUN_NO_ARTICLE),
    ),  # (ⲟⲩ)
    ("****", lexical.type("<i>female: </i>", "(ⲧ)", "female", lexical.Gender.FEMININE)),
    ("***", lexical.type("<i>male: </i>", "(ⲡ)", "male", lexical.Gender.MASCULINE)),
    ("**", lexical.type("<i>imperative: </i>", "(imp.)", "imperative", None)),
    ("*", lexical.type("<i>plural: </i>", "(ⲛ)", "plural", lexical.Gender.PLURAL)),
    ("$", lexical.type("<i> &c</i>", "(&c)", "constructed with", None)),
    ("^^^", lexical.type("<i><b>c</b></i>", "(c)", "Not sure what this means!", None)),
]

SPELLING_ANNOTATIONS_2 = [
    ("^^", lexical.type("―", "―", "same spelling as above.", None)),
]
DETACHED_TYPES_2 = [
    ("^", lexical.type("<i>p c </i>", "(p.c.)", "conjunctive participle", None)),
]

# ACCEPTED_UNKNOWN_CHARS are characters that shouldn't cause confusion when
# encountered in the Coptic text.
# A comma separates different spellings.
# A period indicates a substitution. (For example, under the entry for ⲉⲃⲣⲏϫ,
# ⲥⲉⲧⲉ. is understood to mean ⲥⲉⲧⲉⲃⲣⲏϫ.)
# A space is a space.
# Parentheses and square brackets are also used sometimes.
ACCEPTED_UNKNOWN_CHARS = ",. []()-=+$*^"

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

# HTML_TAGS should be a comprehensive list of all tags used in the output. It
# can be used to eliminate the tags from the output in order to produce a plain
# text version.
HTML_TAGS = [
    "<b>",
    "</b>",
    "<i>",
    "</i>",
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

# The following stats are used to verify the correctness of the script.
ROOTS_REFERENCE_COUNT = 118
DERIVATIONS_REFERENCE_COUNT = 52
