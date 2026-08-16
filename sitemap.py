#!/usr/bin/env python3
"""Generate the sitemap."""

# TODO: (#245) Populate <lastmod> tags.

import pathlib
from xml.sax.saxutils import escape

from utils import ensure, log, paths

_SITEMAP: pathlib.Path = paths.SITE_DIR / "sitemap.xml"
_MIN_URLS: int = 4000
# Sitemaps are capped at 50,000 URLs by the protocol.
_MAX_URLS: int = 50000


def _url(path: pathlib.Path) -> str:
    """Construct the canonical URL for a page.

    Directory indexes are represented by the directory itself, so we
    don't compete with ourselves for the same content.

    Args:
        path: Path of an HTML file inside SITE_DIR.

    Returns:
        The absolute URL (str) of the page.

    """
    served: str = paths.server(path)
    served = served.removesuffix("index.html")
    return f"{paths.URL}{served}"


def _urls() -> list[str]:
    """Enumerate the URLs of all the pages on the site.

    Returns:
        The sorted, deduplicated URLs (list[str]) of every HTML page.

    """
    urls: list[str] = [_url(p) for p in paths.SITE_DIR.rglob("*.html")]
    ensure.unique(urls, "Duplicate URLs in the sitemap!")
    ensure.ensure(
        _MIN_URLS <= len(urls) <= _MAX_URLS,
        "Unexpected number of URLs:",
        len(urls),
    )
    # Sort for a deterministic, diff-friendly artefact.
    return sorted(urls)


def main() -> None:
    urls: list[str] = _urls()
    body: str = "\n".join(f"  <url><loc>{escape(u)}</loc></url>" for u in urls)
    _ = _SITEMAP.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n"
        "</urlset>\n",
    )
    log.info("Wrote", len(urls), "URLs to", _SITEMAP)


if __name__ == "__main__":
    main()
