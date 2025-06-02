#!/usr/bin/env python3
"""Convert Saint Macarius's Dictionary Data to Unicode."""

import pathlib
from collections import Counter

from utils import lang, log

_SCRIPT_DIR: pathlib.Path = pathlib.Path(__file__).parent
_INPUT: pathlib.Path = _SCRIPT_DIR / "data" / "raw" / "data.txt"

_ENCODING: dict[str, str] = {
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
}

_OTHER_KNOWN_CHARS: set[str] = {
    "(",
    ")",
    "-",
    "=",
}


def _known(ch: str) -> bool:
    """Check if a given character is known to our parser.

    Args:
        ch: Character to check.

    Returns:
        Whether the given character is known to our parser.
    """
    return (
        ch in _ENCODING
        or ch.isspace()
        or ch.isdigit()
        or lang.is_arabic_char(ch)
        or lang.is_greek_char(ch)
        or ch in _OTHER_KNOWN_CHARS
    )


def main() -> None:
    unknown: Counter[str] = Counter()
    out: list[str] = []
    with open(_INPUT, encoding="utf-8") as fin:
        for ch in fin.read():
            out.append(_ENCODING.get(ch, ch))
            if not _known(ch):
                unknown[ch] += 1
    print("".join(out))
    for char, count in unknown.most_common():
        log.info(f"{char}\t", count, level=False)
    log.info("Total number of unknown characters:", len(unknown))


if __name__ == "__main__":
    main()
