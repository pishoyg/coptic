"""Andreas constants."""

import enum
import pathlib
import re

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
_INPUT_DIR: pathlib.Path = _SCRIPT_DIR / "data" / "input"
INPUT: list[pathlib.Path] = [
    _INPUT_DIR / "data_1.html",
    _INPUT_DIR / "data_2.html",
]

FONT_FAMILY_RE: re.Pattern[str] = re.compile(
    r"font-family:\s*([^;]+)",
    re.IGNORECASE,
)

DISPLAY_NONE_RE: re.Pattern[str] = re.compile(
    r"display:\s*none",
    re.IGNORECASE,
)

# CLASS_FONT maps a character style to the font that the document's own
# stylesheet gives it. Word only writes `font-family` inline when a run
# overrides its style, so the runs that don't must inherit it from here.
CLASS_FONT: dict[str, str] = {"greekdictionary": "greek"}

# DEFAULT_FONT is the font that `p.MsoNormal` gives the body text.
DEFAULT_FONT: str = "times new roman"

_COPTIC_ENCODING: dict[str, str] = {
    # Capital letters.
    "A": "Ⲁ",
    "B": "Ⲃ",
    "G": "Ⲅ",
    "D": "Ⲇ",
    "E": "Ⲉ",
    "<": "Ⲋ",
    "Z": "Ⲍ",
    "H": "Ⲏ",
    "Q": "Ⲑ",
    "I": "Ⲓ",
    "K": "Ⲕ",
    "L": "Ⲗ",
    "M": "Ⲙ",
    "N": "Ⲛ",
    "{": "Ⲝ",
    "O": "Ⲟ",
    "P": "Ⲡ",
    "R": "Ⲣ",
    "C": "Ⲥ",
    "T": "Ⲧ",
    "U": "Ⲩ",
    "V": "Ⲫ",
    "X": "Ⲭ",
    "Y": "Ⲯ",
    "W": "Ⲱ",
    "}": "Ϣ",
    "F": "Ϥ",
    '"': "Ϧ",
    "|": "Ϩ",
    "J": "Ϫ",
    "S": "Ϭ",
    ":": "Ϯ",
    # Small letters.
    "a": "ⲁ",
    "b": "ⲃ",
    "g": "ⲅ",
    "d": "ⲇ",
    "e": "ⲉ",
    ",": "ⲋ",
    "z": "ⲍ",
    "h": "ⲏ",
    "q": "ⲑ",
    "i": "ⲓ",
    "k": "ⲕ",
    "l": "ⲗ",
    "m": "ⲙ",
    "n": "ⲛ",
    "[": "ⲝ",
    "o": "ⲟ",
    "p": "ⲡ",
    "r": "ⲣ",
    "c": "ⲥ",
    "t": "ⲧ",
    "u": "ⲩ",
    "v": "ⲫ",
    "x": "ⲭ",
    "y": "ⲯ",
    "w": "ⲱ",
    "]": "ϣ",
    "f": "ϥ",
    "'": "ϧ",
    "\\": "ϩ",
    "j": "ϫ",
    "s": "ϭ",
    ";": "ϯ",
    # Symbols.
    "/": "\u0305",  # COMBINING OVERLINE
    "?": "\u0305",  # COMBINING OVERLINE
    "`": "`",
    "~": "⳿",
    "%": ",",
    "🠒": "→",
    "״": "⸗",  # Mark of pronominal forms of verbs.
    ")": ")",
    "(": "(",
    "&": "?",
    ".": ".",
    "=": "=",
    "-": "-",
    "–": "-",
    " ": " ",
    "\u00a0": " ",  # Non-breaking space
    "’": "",  # Some characters don't translate to anything
    "‘": "",
    "“": "",
    "”": "",
    "ô": "",
}

_GREEK_ENCODING: dict[str, str] = {
    "¥": "ἄ",
    "b": "β",
    "a": "α",
    "q": "θ",
    "r": "ρ",
    "t": "τ",
    "o": "ο",
    "j": "ς",
    "¢": "ἀ",
    "£": "ά",
    "'": "᾿",
    "A": "Α",
    "m": "μ",
    "k": "κ",
    "Ú": "ύ",
    "O": "Ο",
    "d": "δ",
    "…": "ί",
    "u": "υ",
    "s": "σ",
    "w": "ω",
    "n": "ν",
    "l": "λ",
    "i": "ι",
    "c": "χ",
    "g": "γ",
    "»": "ή",
    "Ò": "ό",
    "š": "έ",
    "e": "ε",
    "‹": "ῖ",
    "h": "η",
    "p": "π",
    "©": "ᾶ",
    ",": ",",
    " ": " ",
    "¡": "ἁ",
    "z": "ζ",
    "¤": "ἅ",
    "è": "ώ",
    "î": "ῶ",
    "\n": "",
    "f": "φ",
    "¯": "ᾅ",
    "Á": "ῆ",
    "ù": "ῷ",
    "„": "ἰ",
    "‡": "ἴ",
    "y": "ψ",
    "†": "ἵ",
    "ƒ": "ἱ",
    "x": "ξ",
    "-": "-",
    "«": "ἆ",
    "à": "ῦ",
    "Õ": "ὸ",
    "™": "ἐ",
    "`": "῾",
    "¶": "ᾆ",
    "Ü": "ὔ",
    "Ù": "ὐ",
    "G": "Γ",
    "\xa0": "",
    "(": "(",
    "D": "Δ",
    "v": "ᾳ",
    "˜": "ἑ",
    "œ": "ἔ",
    "ἶ": "ἶ",
    "E": "Ε",
    "¹": "ἡ",
    "º": "ἠ",
    "›": "ἕ",
    "Œ": "ἷ",
    "ˆ": "ὶ",
    "Ø": "ὑ",
    "Ð": "ὁ",
    "∙": "ῥ",
    "Û": "ὕ",
    "â": "ὖ",
    "”": "῎",
    "Ó": "ὅ",
    "Z": "Ζ",
    "À": "ἢ",
    ".": ".",
    "¼": "ἥ",
    "Ã": "ἦ",
    "H": "Η",
    "Q": "Θ",
    "I": "Ι",
    "\x8d": "",
    ")": ")",
    "ε": "ε",
    "τ": "τ",
    "α": "α",
    "=": "=",
    "¦": "ὰ",
    "ΐ": "ΐ",
    "K": "Κ",
    "ϊ": "ϊ",
    "L": "Λ",
    "V": "ῃ",
    "M": "Μ",
    "ã": "ϋ",
    "N": "Ν",
    "Ñ": "ὀ",
    "ç": "ὠ",
    "Ô": "ὄ",
    "é": "ὥ",
    "æ": "ὡ",
    "B": "Β",
    "P": "Π",
    "R": "Ρ",
    "S": "Σ",
    "T": "Τ",
    "J": "ῳ",
    "á": "ὗ",
    "F": "Φ",
    "´": "ᾷ",
    "C": "Χ",
    "ò": "ᾠ",
    "ð": "ὦ",
    "W": "Ω",
    "½": "ἤ",
    "Â": "ἧ",
    "Í": "ῇ",
}

# _STRAY_SPACE_GLYPHS are the Greek glyphs that the data sets a stray space
# beside. The font keeps its accented vowels in the C1 range (the Windows-1252
# code points 0x80-0x9F), and whatever produced the data dropped a space next
# to nearly every one of them: `¢gwn… zesqai` is one word, ἀγωνίζεσθαι.
_STRAY_SPACE_GLYPHS: str = re.escape("ƒ„…†‡ˆ‹Œ”—˜™š›œ\x8d")

# _GREEK_PHRASES are the runs that hold more than one Greek word, written in
# the document's own encoding. A space beside one of the glyphs above is
# nearly always an artifact, but in these the author typed it, and nothing in
# the run tells the two apart: `ka… per` is one word, καίπερ, and `kaˆ g£r` is
# two. So they are listed. These are all of them: a space that stands between
# two characters the font writes plainly is a word boundary wherever it
# occurs, and needs no listing.
_GREEK_PHRASES: tuple[str, ...] = (
    "KÚrie ™lšhson",  # Κύριε ἐλέησον
    "e„ gš",  # εἰ γέ
    "e„ m»",  # εἰ μή
    "kaˆ g£r",  # καὶ γάρ
    "kaˆ ™£n",  # καὶ ἐάν
    "kaˆ ™¦n",  # καὶ ἐὰν
    "oÙk œxesti",  # οὐκ ἔξεστι
    "™pˆ ka…",  # ἐπὶ καί
)

# GREEK_STRAY_SPACE_RE matches a stray space, and captures a phrase that holds
# one. The phrases come first, so that a run that spells one out is matched
# whole and keeps its space.
GREEK_STRAY_SPACE_RE: re.Pattern[str] = re.compile(
    # pylint: disable-next=line-too-long
    f"({"|".join(map(re.escape, _GREEK_PHRASES))})|(?<=[{_STRAY_SPACE_GLYPHS}]) | (?=[{_STRAY_SPACE_GLYPHS}])",
)

# GREEK_PREFIX_DIACRITICS are the glyphs that the font draws over the letter
# that follows them rather than beside it, so that two keystrokes spell one
# letter. Everywhere else the encoding gives one character per keystroke, so
# these pairs are rewritten before the translation below sees them, and the
# glyph is absent from the encoding: on its own it spells nothing.
GREEK_PREFIX_DIACRITICS: dict[str, str] = {
    "—i": "ΐ",  # Iota with a diaeresis and an acute.
}

GREEK_PREFIX_DIACRITIC_RE: re.Pattern[str] = re.compile(
    "|".join(map(re.escape, GREEK_PREFIX_DIACRITICS)),
)

_HEBREW_ENCODING: dict[str, str] = {
    # The `rhebrew` font is an ASCII transliteration font (akin to the
    # Michigan-Claremont encoding): each keystroke renders a Hebrew consonant
    # or vowel point (niqqud). The text is stored in visual (reversed) order,
    # so it is reversed before being translated; once reversed, each vowel
    # point follows its consonant, exactly as Unicode expects.
    # Consonants (lowercase, undotted).
    ")": "א",
    "b": "ב",
    "g": "ג",
    "d": "ד",
    "h": "ה",
    "w": "ו",
    "z": "ז",
    "x": "ח",
    "+": "ט",
    "y": "י",
    "k": "כ",
    "l": "ל",
    "m": "מ",
    "n": "נ",
    "s": "ס",
    "(": "ע",
    "p": "פ",
    "c": "צ",
    "q": "ק",
    "r": "ר",
    "t": "ת",
    # Shin (with the right dot) and sin (with the left dot).
    "#": "שׁ",
    "$": "שׁ",
    "<": "שּׁ",  # Shin with a dagesh.
    "&": "שׂ",
    # Final forms.
    "{": "ם",  # Final mem.
    "}": "ן",  # Final nun.
    "|": "ך",  # Final kaf.
    "v": "ף",  # Final pe.
    # Uppercase consonants carry a dagesh.
    "B": "בּ",
    "G": "גּ",
    "D": "דּ",
    "K": "כּ",
    "P": "פּ",
    "T": "תּ",
    "M": "מּ",
    "N": "נּ",
    "Q": "קּ",
    "Y": "יּ",
    "H": "הּ",  # He with a mapiq.
    # Vowel points (niqqud), which combine with the preceding consonant.
    "f": "ָ",  # Qamatz.
    "a": "ַ",  # Patach.
    "e": "ֶ",  # Segol.
    '"': "ֵ",  # Tsere.
    "i": "ִ",  # Hiriq.
    "o": "ֹ",  # Holam (defective).
    "O": "וֹ",  # Holam male (holam written with a vav).
    "u": "ֻ",  # Qibbuts.
    "U": "וּ",  # Shuruq (vav with a dagesh); also a consonantal vav + dagesh.
    ":": "ְ",  # Sheva.
    "A": "ֲ",  # Hataf patach.
    "E": "ֱ",  # Hataf segol.
    # Punctuation and spacing.
    " ": " ",
    ",": ",",
    # Stray marks in the source that don't correspond to any letter.
    "ñ": "",
    "à": "",
}

_SYMBOL_ENCODING: dict[str, str] = {
    # The cross-reference arrow, from the `Wingdings 3` font. Word writes it
    # either in the private use area or as its raw single-byte code.
    "\uf08a": "→",
    "\uf022": "→",
    "\u008a": "→",
    '"': "→",
    # The mark of the pronominal forms of verbs, from the `Arial` font.
    "״": "⸗",
    # Two symbols in a row keep the space that stood between them, as in every
    # other encoding here.
    " ": " ",
}

# UNMISTAKABLE_SYMBOLS are the characters that give a run away as a symbol
# wherever they occur. A handful of runs carry no style at all, and these
# characters are the only clue to what they hold. The quotation mark that
# `Wingdings 3` also uses is absent, because it means something else in every
# other font.
UNMISTAKABLE_SYMBOLS: frozenset[str] = frozenset(
    "\uf08a\uf022\u008a\u05f4",
)

# NEUTRAL_PUNCTUATION are the marks that belong to the text around them
# whatever font they are set in. The data types its etymology joiner and its
# cross-reference sign in whichever font happened to be active at the time, so
# a run holding nothing else says nothing about the language it is written in.
# Neither mark is mirrored, so which way round it is rendered doesn't matter.
NEUTRAL_PUNCTUATION: frozenset[str] = frozenset("+=")

# MIRRORED_PUNCTUATION are the marks that come out reversed when rendered
# right-to-left. A bracket typed on the Arabic keyboard is only a bracket if it
# is rendered the way it was typed, so unlike the neutral marks these can't
# take a neighbour's language: they keep the direction the document gives them.
MIRRORED_PUNCTUATION: frozenset[str] = frozenset("()[]")


class Language(enum.Enum):
    COPTIC = "Coptic"
    GREEK = "Greek"
    ARABIC = "Arabic"
    HEBREW = "Hebrew"
    LATIN = "Latin"
    # SYMBOL is not a language. It covers the runs that the document sets in a
    # symbol font: the cross-reference arrow and the mark of the pronominal
    # forms of verbs. Symbols carry no language of their own, so they adopt the
    # language of the run next to them.
    SYMBOL = "Symbol"


# FONT_LANGUAGE maps a substring of a font name to the language that the font
# writes. The whole data uses only these fonts, so an unrecognized one is an
# error rather than something to fall back from.
FONT_LANGUAGE: list[tuple[str, Language]] = [
    ("athanasius", Language.COPTIC),
    ("greek", Language.GREEK),
    ("athena", Language.GREEK),
    ("rhebrew", Language.HEBREW),
    ("arabic", Language.ARABIC),
    ("kenshrin1", Language.ARABIC),
    ("wingdings", Language.SYMBOL),
    ("arial", Language.SYMBOL),
    ("times new roman", Language.LATIN),
]

LANG_TRANSLATION: dict[Language, dict[int, str]] = {
    language: str.maketrans(encoding)
    for language, encoding in [
        (Language.COPTIC, _COPTIC_ENCODING),
        (Language.GREEK, _GREEK_ENCODING),
        (Language.HEBREW, _HEBREW_ENCODING),
        (Language.SYMBOL, _SYMBOL_ENCODING),
    ]
}
