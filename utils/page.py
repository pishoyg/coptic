"""HTML helpers."""

import os
import re
from collections import abc

import regex

from utils import ensure, paths

_CHARSET_TAG: str = """
  <meta charset="utf-8">
"""

_VIEWPORT_TAG: str = """
<meta name="viewport" content="width=device-width, initial-scale=1">
"""

_NO_INDEX_TAG: str = """
<meta name="robots" content="noimageindex">
"""

_ICON_TAG: str = f"""
  <link rel="icon" type="image/x-icon" href="{paths.server(paths.ICON)}">
"""

_GOOGLE_TAG: str = """
  <script async src=
  "https://www.googletagmanager.com/gtag/js?id=G-VCVZFDFZR3"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "G-VCVZFDFZR3");
  </script>
"""

# TAG_RE matches a single HTML tag (opening, closing, or self-closing) and
# captures its tag name. We intentionally maintain a simplified, permissive
# expression, which suffices for our purposes.
TAG_RE: re.Pattern[str] = re.compile(
    r"</?([a-z][a-z0-9]*).*?>",
    re.DOTALL | re.IGNORECASE,
)
LINE_BREAK: str = "<br>"
HORIZONTAL_RULE: str = "<hr>"

_HTML_ID_RE: regex.Pattern[str] = regex.compile(
    r'(?<=<\w+[^>]*)\bid=".*?"(?=[^<]*>)',
)

assert TAG_RE.fullmatch(LINE_BREAK)
assert TAG_RE.fullmatch(HORIZONTAL_RULE)

# _VOID_TAGS are HTML elements that never have a closing tag, and so are
# excluded from the balance check.
# NOTE: This list is not exhaustive, but it covers all the tags used in our
# repository.
_VOID_TAGS: frozenset[str] = frozenset(
    {"br", "col", "hr", "img", "input", "link", "meta", "source"},
)


def name(tag: str) -> str:
    match: re.Match[str] | None = TAG_RE.fullmatch(tag)
    assert match, tag
    return match.group(1).lower()


def is_tag(token: str) -> bool:
    return bool(TAG_RE.fullmatch(token))


def opening(tag: str, strict: bool = True) -> bool:
    match: re.Match[str] | None = TAG_RE.fullmatch(tag)
    if strict:
        assert match, tag
    return bool(
        match and tag[1] != "/" and match.group(1).lower() not in _VOID_TAGS,
    )


def closing(tag: str, strict: bool = True) -> bool:
    match: re.Match[str] | None = TAG_RE.fullmatch(tag)
    if strict:
        assert match, tag
    return bool(match) and tag[1] == "/"


def ensure_same(a: str, b: str) -> None:
    ensure.ensure(name(a) == name(b), "Unbalanced tags!", a, "and ", b)


def no_line_breaks(html: str) -> str:
    return html.replace(LINE_BREAK, " ")


def no_ids(html: str) -> str:
    return _HTML_ID_RE.sub("", html)


# NOTE: html_head_aux is used by our HTML generation logic to generated the
# <head> elements for our pages.
# Besides the generated HTML files, a number of singleton manually-written HTML
# pages don't use this function. If the desired head structure changes, updating
# this function should update all of the auto-generated pages. But the
# manually-written ones will have to be updated manually.
# For the list of manually-written files, consult
# `pre-commit/docs_structure.py`.
# TODO: (#0) Currently, all your pipelines are forced to pass relative paths to
# the following helpers. This is inconvenient.
# It may be simpler to pass absolute path, and have the helpers construct
# relative or server paths as appropriate.
# This applies to paths to CSS and JavaScript files, and also to next, prev, and
# search links.
def html_head_aux(
    title: str,
    search: str | None = None,
    next_href: str | None = None,
    prev_href: str | None = None,
    scripts: list[str] | None = None,
    css: list[str] | None = None,
    epub: bool = False,
) -> abc.Generator[str]:
    """Construct content of an HTML <head> tag.

    Args:
        title: Page title.
        search: Link to the search page. See
            https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#search.
        next_href: Link to the next page. See
            https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#next.
        prev_href: Link to the previous page. See
            https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#prev.
        scripts: List of JavaScript files to import.
        css: List of CSS file paths to import in the HTML.
            NOTE: The shared CSS file is included by default.
        epub: Whether the output will be used in an EPUB.
            NOTE: If true, the following arguments must be empty, as they are
            irrelevant in an EPUB: search, next_href, prev_href, scripts, css.

    Yields:
        The HTML pieces, to be concatenated into the full HTML file.
    """

    assert title
    yield "<head>"
    yield f"<title>{title}</title>"
    if epub:
        # Nothing else is relevant to EPUB.
        assert not search
        assert not next_href
        assert not prev_href
        assert not scripts
        assert not css
        yield "</head>"
        return

    scripts = list(map(os.path.normpath, scripts or []))
    ensure.unique(scripts)

    css = list(map(os.path.normpath, css or []))
    ensure.unique(css)

    # The shared CSS is always included.
    # We can't include it in the check for duplicates because we don't have a
    # normalized, uniform (all-relative or all-absolute) list of paths for all
    # the CSS files.
    css.append(paths.server(paths.SHARED_CSS))

    yield _CHARSET_TAG
    yield _VIEWPORT_TAG
    yield _NO_INDEX_TAG
    for path in css:
        yield f'<link href="{path}" rel="stylesheet" type="text/css">'
    yield _ICON_TAG
    yield _GOOGLE_TAG
    if search:
        yield f'<link href="{search}" rel="search">'
    if next_href:
        yield f'<link href="{next_href}" rel="next">'
    if prev_href:
        yield f'<link href="{prev_href}" rel="prev">'
    for script in scripts:
        yield f'<script src="{script}" type="module"></script>'
    yield "</head>"


def _html_aux(
    head: abc.Generator[str],
    iam: str,
    *body: str,
) -> abc.Generator[str]:
    yield "<!DOCTYPE html>"
    yield "<html>"
    yield from head
    yield f'<body class="{iam}">'
    yield from body
    yield "</body>"
    yield "</html>"


def html_aux(
    head: abc.Generator[str],
    iam: str,
    *body: str,
) -> abc.Generator[str]:
    tags: list[str] = []
    for token in _html_aux(head, iam, *body):
        # NOTE: The following only works because our generators never generate a
        # tag that spans multiple tokens.
        tags.extend(match.group(0) for match in TAG_RE.finditer(token))
        yield token
    ensure.balanced(tags, opening, closing, name, "Unbalanced HTML:", tags)
