"""HTML helpers."""

import os
from collections import abc

from utils import ensure, paths

_CHARSET_TAG: str = """
  <meta charset="utf-8">
"""

_VIEWPORT_TAG: str = """
<meta name="viewport" content="width=device-width, initial-scale=1">
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

LINE_BREAK: str = "<br>"
HORIZONTAL_RULE: str = "<hr>"
_SELF_CLOSING_LINE_BREAK: str = "<br/>"


def html_line_breaks(txt: str) -> str:
    """Substitute newline characters with HTML line breaks.

    Args:
        txt: Text to fix.

    Returns:
        Text with newlines replaced with HTML line breaks.
    """
    return txt.replace("\n", LINE_BREAK)


def no_line_breaks(htm: str) -> str:
    return htm.replace(LINE_BREAK, " ").replace(_SELF_CLOSING_LINE_BREAK, " ")


# NOTE: html_head is used by our HTML generation logic to generated the <head>
# elements for our pages.
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
def html_head(
    title: str,
    search: str = "",
    next_href: str = "",
    prev_href: str = "",
    scripts: list[str] | None = None,
    css: list[str] | None = None,
    epub: bool = False,
) -> str:
    assert title
    if epub:
        assert not search
        assert not next_href
        assert not prev_href
        assert not scripts
        assert not css

    return "".join(
        html_head_aux(
            title,
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
    search: str,
    next_href: str,
    prev_href: str,
    scripts: list[str],
    css: list[str],
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

    scripts = list(map(os.path.normpath, scripts))
    ensure.unique(scripts)

    css = list(map(os.path.normpath, css))
    ensure.unique(css)

    # The shared CSS is always included.
    # We can't include it in the check for duplicates because we don't have a
    # normalized, uniform (all-relative or all-absolute) list of paths for all
    # the CSS files.
    css.append(paths.server(paths.SHARED_CSS))

    yield "<head>"
    yield f"<title>{title}</title>"
    if epub:
        # None of what remains is relevant to EPUB.
        yield "</head>"
        return

    yield _CHARSET_TAG
    yield _VIEWPORT_TAG
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


def html_aux(head: str, iam: str, *body: str) -> abc.Generator[str]:
    yield "<!DOCTYPE html>"
    yield "<html>"
    yield head
    yield f'<body class="{iam}">'
    yield from body
    yield "</body>"
    yield "</html>"


def html(head: str, iam: str, *body: str) -> str:
    return "".join(html_aux(head, iam, *body))
