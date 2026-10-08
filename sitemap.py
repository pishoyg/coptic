#!/usr/bin/env python3
"""Generate the sitemap.

A page's <lastmod> is:
  - Today's date, if the page is new, or differs from HEAD (whether staged
    or not).
  - Otherwise, the date its latest change landed on the first-parent
    history of HEAD. Deriving dates from Git history, rather than from the
    previous sitemap, means pages committed while the hook was skipped are
    dated correctly on the next run.

Pages are enumerated from the index rather than the working tree, so the
sitemap lists exactly the pages being committed, and never an untracked one.

The output is thus a function of HEAD, the index, the working tree, and
today's date, which makes the script idempotent, and suitable as a pre-commit
hook.
"""

import datetime
import pathlib
from urllib import parse

from utils import ensure, log, paths, system

_SITEMAP: pathlib.Path = paths.SITE_DIR / "sitemap.xml"
_NAMESPACE: str = "http://www.sitemaps.org/schemas/sitemap/0.9"
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
    # Percent-encode the path (e.g. spaces become %20), as the sitemap
    # protocol requires. This also encodes the characters that are special in
    # XML (&, <, >, ', "), so the URL needs no further escaping.
    return f"{paths.URL}{parse.quote(served)}"


def _pages() -> dict[str, pathlib.Path]:
    """Enumerate the pages on the site that are in the index.

    Returns:
        A map (dict[str, pathlib.Path]) from each page's URL to its file,
        sorted by URL for a deterministic, diff-friendly artefact.

    """
    # In Git pathspecs, `*` matches `/`, so this covers nested pages.
    out: str = system.run(
        "git ls-files -z --",
        f"'{paths.SITE_DIR}/*.html'",
    )
    files: list[pathlib.Path] = [
        pathlib.Path(f) for f in filter(None, out.split("\0"))
    ]
    urls: list[str] = [_url(f) for f in files]
    ensure.unique(urls, "Duplicate URLs in the sitemap!")
    ensure.ensure(len(urls) <= _MAX_URLS, "Too many URLs:", len(urls))
    return dict(sorted(zip(urls, files, strict=True)))


def _modified() -> set[pathlib.Path]:
    """List the files that differ from HEAD, whether staged or not.

    Returns:
        The set (set[pathlib.Path]) of modified files.

    """
    out: str = system.run(
        "git diff -z --name-only --no-renames HEAD --",
        str(paths.SITE_DIR),
    )
    return {pathlib.Path(p) for p in filter(None, out.split("\0"))}


def _last_commit_dates(
    files: set[pathlib.Path],
) -> dict[pathlib.Path, str]:
    """Find the date each of the given files last changed on HEAD's branch.

    We walk the history once, rather than once per file, which takes about a
    second, instead of minutes for the whole site.

    Args:
        files: Files to look up.

    Returns:
        A map (dict[pathlib.Path, str]) from file to committer date, for the
        files that have a history.

    """
    # In a shallow clone, the boundary commit appears to add every file, so
    # every page would be dated to it.
    ensure.ensure(
        system.run("git rev-parse --is-shallow-repository").strip() == "false",
        "Can't date pages from the history of a shallow clone!",
    )
    # Following only first parents, and diffing each merge against its first
    # parent, dates a merged change to the merge, i.e. to when it landed.
    # With `-z`, the output is a NUL-separated sequence of tokens. A token
    # starting with \x01 is a commit date, and the tokens following it are the
    # files touched by that commit (the first of which has a leading newline).
    out: str = system.run(
        "git log -z --first-parent --diff-merges=first-parent --no-renames",
        "--name-only --format=%x01%cs HEAD --",
        str(paths.SITE_DIR),
    )
    dates: dict[pathlib.Path, str] = {}
    date: str = ""
    for token in out.split("\0"):
        if token.startswith("\x01"):
            date = token.removeprefix("\x01")
            assert datetime.date.fromisoformat(date).isoformat() == date
            continue
        path = pathlib.Path(token.lstrip("\n"))
        if path not in files:
            continue
        # The first-parent history is a chain, walked newest first, so the
        # first occurrence is the latest change.
        _ = dates.setdefault(path, date)
    return dates


def _lastmods(pages: dict[str, pathlib.Path]) -> dict[str, str]:
    """Compute the <lastmod> date of each page.

    Args:
        pages: A map from URL to file.

    Returns:
        A map (dict[str, str]) from URL to date.

    """
    # Local time, to agree with the committer dates from Git.
    today: str = datetime.datetime.now().astimezone().date().isoformat()
    modified: set[pathlib.Path] = _modified()
    history: dict[pathlib.Path, str] = _last_commit_dates(set(pages.values()))
    return {
        url: (
            today if path in modified or path not in history else history[path]
        )
        for url, path in pages.items()
    }


def main() -> None:
    pages: dict[str, pathlib.Path] = _pages()
    lastmods: dict[str, str] = _lastmods(pages)
    # Match the formatting of the `tidy-xml` pre-commit hook, so the two hooks
    # don't fight over the file.
    body: str = "".join(
        "  <url>\n"
        f"    <loc>{url}</loc>\n"
        f"    <lastmod>{lastmods[url]}</lastmod>\n"
        "  </url>\n"
        for url in pages
    )
    _ = _SITEMAP.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        f'<urlset xmlns="{_NAMESPACE}">\n'
        f"{body}"
        "</urlset>\n",
    )
    log.info("Wrote", len(pages), "URLs to", _SITEMAP)


if __name__ == "__main__":
    main()
