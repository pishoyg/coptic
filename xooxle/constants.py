"""Xooxle builder constants."""

import re

from utils import page

# UNIT_DELIMITER is the delimiter used to separate the units of the output text,
# if such separation is desired for a given field.
UNIT_DELIMITER: str = '<hr class="match-separator">'

TAG_RE: re.Pattern[str] = re.compile(r'</?([a-z0-9]+)(?: [a-z-]+="[^"]+")*>')

assert TAG_RE.fullmatch(UNIT_DELIMITER)
assert TAG_RE.fullmatch(page.LINE_BREAK)
