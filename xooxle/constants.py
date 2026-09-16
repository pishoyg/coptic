"""Xooxle builder constants."""

from utils import page

# UNIT_DELIMITER is the delimiter used to separate the units of the output text,
# if such separation is desired for a given field.
UNIT_DELIMITER: str = '<hr class="match-separator">'
assert page.TAG_RE.fullmatch(UNIT_DELIMITER)


# is_delimiter tells whether a token separates two units, or two lines.
def is_delimiter(token: str) -> bool:
    return token in [UNIT_DELIMITER, page.LINE_BREAK]
