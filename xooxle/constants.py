"""Xooxle builder constants."""

import re

# UNIT_DELIMITER is the delimiter used to separate the units of the output text,
# if such separation is desired for a given field.
UNIT_DELIMITER: str = '<hr class="match-separator">'

TAG_RE: re.Pattern[str] = re.compile(r"^</?(\w+)(?: [^>]+)?>")
