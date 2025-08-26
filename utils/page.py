"""HTML helpers."""

import os
from collections import abc

from utils import paths

_CHARSET_TAG = """
  <meta charset="utf-8">
"""

_STYLE_TAG_FMT = '<link href="{}" rel="stylesheet" type="text/css">'
assert os.path.isfile(os.path.join(paths.SITE_DIR, "style.css"))

_GOOGLE_TAG = """
  <script async src=
  "https://www.googletagmanager.com/gtag/js?id=G-VCVZFDFZR3"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "G-VCVZFDFZR3");
  </script>
"""

_ICON_TAG = """
  <link rel="icon" type="image/x-icon" href="/img/icon/icon-circle.png">
"""
assert os.path.isfile(os.path.join(paths.SITE_DIR, "img/icon/icon-circle.png"))

_VIEWPORT_TAG = """
<meta name="viewport" content="width=device-width, initial-scale=1">
"""

LINE_BREAK: str = "<br>"
HORIZONTAL_RULE = "<hr>"
_SELF_CLOSING_LINE_BREAK: str = "<br/>"


def html_line_breaks(txt: str) -> str:
    """Substitute newline characters with HTML line breaks.

    Args:
        txt: Text to fix.

    Returns:
        Text with newlines replaced with HTML line breaks.
    """
    return txt.replace("\n", LINE_BREAK)


def one_line(htm: str) -> str:
    return htm.replace(LINE_BREAK, " ").replace(_SELF_CLOSING_LINE_BREAK, " ")


# html_head is used by our HTML generation logic to generated the <head>
# elements for our pages.
# Besides the generated HTML files, a number of singleton manually-written HTML
# pages don't use this function. If the desired head structure changes, updating
# this function should update all of the auto-generated pages. But the
# manually-written ones will have to be updated manually. As of now, this
# includes the following:
# - docs/index.html
# - docs/crum/index.html
# - docs/dawoud/index.html
# However, for the most up-to-date list, consult `pre-commit/docs_structure.py`.
def html_head(
    title: str,
    page_class: str = "",
    search: str = "",
    next_href: str = "",
    prev_href: str = "",
    scripts: list[str] | None = None,
    css: list[str] | None = None,
    epub: bool = False,
) -> str:
    assert title
    if epub:
        assert not page_class
        assert not search
        assert not next_href
        assert not prev_href
        assert not scripts
        assert not css
    return "".join(
        html_head_aux(
            title,
            page_class,
            search,
            next_href,
            prev_href,
            scripts or [],
            css or [],
            epub,
        ),
    )


def html_head_aux(
    title: str,
    page_class: str,
    search: str,
    next_href: str,
    prev_href: str,
    scripts: list[str],
    css: list[str],
    epub: bool = False,
) -> abc.Generator[str]:
    """
    Args:
        title: Page title.
        page_class: Classes to add to the <body> tag.
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
            irrelevant in an EPUB: page_class, search, next_href, prev_href,
            scripts, css.

    Yields:
        The HTML pieces, to be concatenated into the full HTML file.
    """
    yield "<head>"
    yield f"<title>{title}</title>"
    if epub:
        # None of what remains is relevant to EPUB.
        yield "</head>"
        return

    yield _CHARSET_TAG
    yield _VIEWPORT_TAG
    for path in css + [paths.SHARED_CSS]:
        yield _STYLE_TAG_FMT.format(path)
    yield _ICON_TAG
    yield _GOOGLE_TAG
    if search:
        yield f'<link href="{search}" rel="search">'
    if next_href:
        yield f'<link href="{next_href}" rel="next">'
    if prev_href:
        yield f'<link href="{prev_href}" rel="prev">'
    if page_class:
        yield f"<script>const {page_class} = true;</script>"
    for script in scripts:
        yield f'<script src="{script}" type="module"></script>'
    yield "</head>"


def html_aux(head: str, *body: str) -> abc.Generator[str]:
    yield "<!DOCTYPE html>"
    yield "<html>"
    yield head
    yield "<body>"
    yield from body
    yield "</body>"
    yield "</html>"


def html(head: str, *body: str) -> str:
    return "".join(html_aux(head, *body))
