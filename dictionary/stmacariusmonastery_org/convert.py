#!/usr/bin/env python3
"""Convert Andreas's Dictionary Data to Unicode."""

import collections
import enum
import pathlib
import re
import typing
from collections import abc

import bs4

from utils import file, lang, log

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
_INPUT_DIR: pathlib.Path = _SCRIPT_DIR / "data" / "input"
_INPUT: list[pathlib.Path] = [
    _INPUT_DIR / "data_1.html",
    _INPUT_DIR / "data_2.html",
]
_OUTPUT: pathlib.Path = (
    _SCRIPT_DIR / "data" / "output" / "stmacariusmonastery_org.json"
)

_FONT_FAMILY_RE: re.Pattern[str] = re.compile(
    r"font-family:\s*([^;]+)",
    re.IGNORECASE,
)

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
    "`": "`",  # TODO: (#452) Change to a combining grave accent.
    "~": "⳿",  # TODO: (#452) Change to a combining grave accent.
    "%": ",",
    "🠒": "→",
    "״": "=",  # Mark of pronominal forms of verbs.
    ")": ")",
    "(": "(",
    "&": "?",
    ".": ".",
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
    " ": "",
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
    "—": "ΐ",
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

_HEBREW_ENCODING: dict[str, str] = {
    # TODO: (#452) Fill this table
}

_UNKNOWN_ENCODING: dict[str, str] = {
    "״": '"',
    "]": "]",
    "+": "+",
    "→": "→",
    "[": "[",
} | _GREEK_ENCODING


class Language(enum.Enum):
    COPTIC = "Coptic"
    GREEK = "Greek"
    ARABIC = "Arabic"
    HEBREW = "Hebrew"
    RIGHT_ARROW = "Right Arrow"
    UNKNOWN = "Unknown"


_LANG_ENCODING: dict[Language, dict[int, str]] = {
    Language.COPTIC: str.maketrans(_COPTIC_ENCODING),
    Language.GREEK: str.maketrans(_GREEK_ENCODING),
    Language.HEBREW: str.maketrans(_HEBREW_ENCODING),
    Language.UNKNOWN: str.maketrans(_UNKNOWN_ENCODING),
}


@typing.final
class Span:
    """Span represents a piece of text in the dictionary."""

    def __init__(self, content: str, language: Language):
        """Initialize a Span.

        Args:
            content: ASCII-encoded data.
            language: Text language, which will determine the encoding and
                conversion.
        """
        self.content: str = content
        self.language: Language = language


@typing.final
class DictionaryEntry:
    coptic: str = ""
    arabic: str = ""
    greek: str = ""
    hebrew: str = ""


def determine_language(text: str, style: str | None) -> Language:
    if any(map(lang.is_arabic_char, text)):
        return Language.ARABIC
    if not style:
        return Language.UNKNOWN

    # Extract font properties from inline styles
    font_match: re.Match[str] | None = _FONT_FAMILY_RE.search(style)

    if not font_match:
        return Language.GREEK

    font: str = font_match.group(1).strip().lower()
    if "athanasius" in font:
        return Language.COPTIC
    if "rhebrew" in font:
        return Language.HEBREW
    if "kenshrin1" in font:
        return Language.ARABIC
    if "wingdings" in font:
        return Language.RIGHT_ARROW
    if "greek" in font or "athena" in font:
        return Language.GREEK

    return Language.UNKNOWN


def parse_html_spans(file_path: pathlib.Path) -> list[Span]:
    """Read HTML file and extract span tags with their content and font
    information.

    Args:
        file_path: Path to the HTML file.

    Returns:
        list: List of dictionaries containing span content and font info.
    """

    soup: bs4.BeautifulSoup = bs4.BeautifulSoup(
        file.read(file_path),
        "html.parser",
    )

    results: list[Span] = []
    tag: bs4.Tag
    for tag in soup.find_all("span"):
        content: str = tag.get_text(strip=True).replace("\n", " ")

        if not content:
            continue

        style: str | list[str] | None = tag.get("style")
        assert style is None or isinstance(style, str)
        language: Language = determine_language(content, style)

        # Outer and inner spans cause some text to be repeated twice.
        if results and results[-1].content == content:
            # If the first occurrence of the text has no language, use the
            # second occurrence
            if results[-1].language == Language.UNKNOWN:
                results[-1].language = language
            continue

        results.append(Span(content, language))

    return results


# TODO: (#452) Once the Hebrew encoding is populated, this won't be needed
# anymore.
hebrew_freq: collections.Counter[str] = collections.Counter()


def convert_to_unicode(text: str, language: Language) -> str:
    if language == Language.RIGHT_ARROW:
        assert len(text) == 1
        return "→"

    if language == Language.ARABIC:
        # Arabic is not encoded.
        return text

    # TODO: (#452) Stop giving Hebrew special treatment.
    if language == Language.HEBREW:
        # We don't have the Hebrew encoding yet.
        # Add text to the Hebrew letter frequency tracker.
        hebrew_freq.update(text)
        # In the original text, Hebrew is written in reverse.
        return text[::-1]

    # This is an encoded language.
    return text.translate(_LANG_ENCODING[language])


def squash(dictionary: list[Span]) -> list[Span]:
    """Merge consecutive strings with the same language (or if either of them
    is unknown).

    Args:
        dictionary: A list of Span objects containing text content and language
                    information.

    Returns:
        A list of Span objects with consecutive spans merged based on language
        compatibility.
    """

    result: list[Span] = []
    for span in dictionary:
        if result and span.language in [Language.UNKNOWN, result[-1].language]:
            result[-1].content += span.content
            continue
        result.append(span)

    return result


def remove_extra_whitespace(text: str) -> str:
    return " ".join(text.split())


def get_next_letter(letter: str) -> str:
    return chr(ord(letter) + 2)


def get_capital_letter(letter: str) -> str:
    code: int = ord(letter)
    assert code % 2
    return chr(code - 1)


def make_section_name(letter: str) -> str:
    return f"{get_capital_letter(letter)},{letter}"


def make_dictionary(spans: list[Span]) -> abc.Generator[DictionaryEntry]:
    """This method merges entries in the original dictionary to form the new
    dictionary.

    Subsequent entries are merged based on language such that it must
    start in Coptic, and end in Arabic.

    Args:
        spans: A list of Span objects containing text content and language
            information.

    Yields:
        DictionaryEntry objects with merged content grouped by entries.
    """
    # used to remove a prefix later on
    letter: str = "ⲁ"
    section_name: str = make_section_name(letter)

    entry: DictionaryEntry = DictionaryEntry()
    for i in range(len(spans)):
        spans[i].content += " "
        match spans[i].language:
            case Language.COPTIC:
                entry.coptic += spans[i].content
            case Language.ARABIC:
                entry.arabic += spans[i].content
            case Language.RIGHT_ARROW:
                entry.coptic += spans[i].content
            case Language.GREEK:
                entry.greek += spans[i].content
            case Language.HEBREW:
                entry.hebrew += spans[i].content

        entry_language: Language = spans[i].language
        next_entry_language: Language | None = (
            spans[i + 1].language if i < len(spans) - 1 else None
        )

        if entry_language == Language.ARABIC and next_entry_language in [
            Language.COPTIC,
            None,
        ]:
            # First entry in every section has an extra pair of the letter
            if entry.coptic.startswith(section_name):
                entry.coptic = entry.coptic.removeprefix(section_name)
                letter = get_next_letter(letter)
                section_name = make_section_name(letter)
            yield entry
            entry = DictionaryEntry()


def main() -> None:
    data: list[Span] = []
    for input_file in _INPUT:
        for span in parse_html_spans(input_file):
            span.content = remove_extra_whitespace(
                convert_to_unicode(span.content, span.language),
            )
            data.append(span)

    data = squash(data)
    dictionary = make_dictionary(data)

    file.write(
        file.json_dumps([obj.__dict__ for obj in dictionary]),
        _OUTPUT,
    )

    log.info("Unknown Hebrew characters:", len(hebrew_freq))
    for char, count in hebrew_freq.most_common():
        log.info(f"{char}\t", count, level=False)


if __name__ == "__main__":
    main()
