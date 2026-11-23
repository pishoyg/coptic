"""javascripts provides JavaScript helpers."""

from collections import abc

# CARD_JS marks the page as an Anki card, for `docs/iam.ts`. It must run before
# our script, which reads the mark as soon as it loads. Anki's own `card` class
# can't serve as the mark, because AnkiWeb doesn't put it on <body>.
CARD_JS: str = "globalThis.ANKI_CARD = true;\n"

# _DIALECTS_JS is a JavaScript line that can be used to set the default
# dialects.
# See docs/crum/dialect.ts
_DIALECTS_JS: str = """
if (localStorage.getItem('d') === null) {{
  localStorage.setItem('d', {DIALECT_ARR}.join(','));
}}
"""


def dialects_js(dialects: abc.Iterable[str]) -> str:
    if not dialects:
        return ""
    return _DIALECTS_JS.format(DIALECT_ARR=list(dialects))
