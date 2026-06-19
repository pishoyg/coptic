"""Coptic Numerals.

NOTE: A TypeScript version of this file lives at `docs/numeral.ts`. The two
should ideally stay in sync.
"""

from collections import abc

from utils import ensure

# Greek Numeral Sign (Lower Keraia) for thousands
THOUSANDS_MARK: str = "\u0375"
COMBINING_OVERLINE: str = "\u0305"
MAX: int = 999999

UNITS_MAP: list[str] = [
    "",
    "ⲁ",
    "ⲃ",
    "ⲅ",
    "ⲇ",
    "ⲉ",
    "ⲋ",
    "ⲍ",
    "ⲏ",
    "ⲑ",
]

TENS_MAP: list[str] = [
    "",
    "ⲓ",
    "ⲕ",
    "ⲗ",
    "ⲙ",
    "ⲛ",
    "ⲝ",
    "ⲟ",
    "ⲡ",
    "ϥ",
]

HUNDREDS_MAP: list[str] = [
    "",
    "ⲣ",
    "ⲥ",
    "ⲧ",
    "ⲩ",
    "ⲫ",
    "ⲭ",
    "ⲯ",
    "ⲱ",
    "ⳁ",
]


def digit(letter: str, thousands: bool = False) -> abc.Generator[str]:
    if not letter:
        return
    if thousands:
        yield THOUSANDS_MARK
    yield letter
    yield COMBINING_OVERLINE


def coptic(n: int) -> str:
    """
    Converts an integer to Coptic numerals.

    Args:
        n (int): The integer to convert.

    Returns:
        str: The Coptic numeral string.
    """
    ensure.ensure(0 < n <= MAX, "Input must be between", 1, "and", MAX)

    num: list[str] = []

    num.extend(digit(HUNDREDS_MAP[n // 100000], True))
    n %= 100000
    num.extend(digit(TENS_MAP[n // 10000], True))
    n %= 10000
    num.extend(digit(UNITS_MAP[n // 1000], True))
    n %= 1000
    num.extend(digit(HUNDREDS_MAP[n // 100]))
    n %= 100
    num.extend(digit(TENS_MAP[n // 10]))
    n %= 10
    num.extend(digit(UNITS_MAP[n]))

    return "".join(num)
