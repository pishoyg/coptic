"""javascripts provides JavaScript helpers."""

from collections import abc

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
