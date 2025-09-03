#!/usr/bin/env python3
"""Process coptic.wiki's Digital Version of Crum."""

import re
import typing
from collections import abc

from dictionary.marcion_sourceforge_net import main as crum
from utils import ensure, gcp

# pylint: disable=line-too-long
SHEET_TSV_URL: str = (
    "https://docs.google.com/spreadsheets/d/1lhjcnkHS-pA3p5Vys-6ohKu7Y4ZCJ5NO/export?format=tsv"
)


class Substitution:
    """A class to represent a single regex substitution."""

    def __init__(
        self,
        name: str,
        pattern: str,
        repl: str,
        enabled: bool = True,
        override: str | None = None,
    ):
        """Initializes a Substitution object.

        Args:
            name: A description of the substitution rule.
            pattern: The regular expression pattern to search for.
            repl: The replacement string in Coptic Wiki.
            enabled: Whether the rule is active in our code.
            override: An replacement string that overrides the Coptic Wiki
                replacement.
        """
        self.name: str = name
        self.pattern: re.Pattern[str] = re.compile(pattern)
        self.repl: str = repl
        self.enabled: bool = enabled
        self.override: str | None = override

    def sub(self, text: str) -> str:
        if not self.enabled:
            return text
        return self.pattern.sub(self.override or self.repl, text)


# Coptic Wiki substitutions:
# NOTE: This is based on a snapshot of the following file, taken on September 2,
# 2025:
# - https://github.com/randykomforty/coptic/blob/main/scripts/dictionary_regexes.js
# If the file were to be updated, this mapping should be updated accordingly.
SUBSTITUTIONS: list[Substitution] = [
    Substitution("ampersand", r"&amp;", "&", enabled=False),  # Unnecessary!
    Substitution("asterisk", r"\*", "&ast;", enabled=False),  # Unnecessary!
    Substitution("tab", r"\n", "</p><p>", enabled=False),  # Unused!
    Substitution("em", r"__(.+?)__", r"<em>\1</em>"),
    Substitution("bold", r"\*(.+?)\*", r"<b>\1</b>"),
    Substitution("italic", r"_(.+?)_", r"<i>\1</i>"),
    Substitution(
        "dialect",
        r"\[\[(S|B|A|F|O)\]\]",
        r'<i class="dialect">\1</i>',
        override=r'<span class="dialect \1">\1</span>',
    ),
    Substitution(
        "subdialect",
        # While not explicitly mentioned in Crum's intro, there are apparently
        # some occurrences of B^f (Bohairic with Fayyumic tendency), e.g. in
        # ϫⲟⲗ[1].
        #
        # [1] https://remnqymi.com/crum/2391.html#wiki.
        r"\[\[(S|F|B)\^(a|f|b)\]\]",
        r'<i class="dialect">\1<sup>\2</sup></i>',
        override=r'<span class="dialect \1\2">\1\2</span>',
    ),
    Substitution(
        "subdialectLyco",
        r"\[\[(A\^2)\]\]",
        r'<i class="dialect">A<sup class="non-italic">2</sup></i>',
        override=r'<span class="dialect L">L</span>',
    ),
    Substitution("superscript", r"\^(\w+)", r"<sup>\1</sup>"),
    Substitution(
        "headword",
        r"\[\[\[(\(?\)?\[?\]?\.?\…?-?[\u2c80-\u2cff\u03e2-\u03ef].*?\]?)\]\]\]",
        r'<span class="headword coptic">\1</span>',
    ),
    Substitution(
        "coptic",
        r"\[\[(\(?\)?\[?\]?\.?,?\…?-?·?\s?[\u2c80-\u2cff\u03e2-\u03ef].*?\]?)\]\]",
        r'<span class="coptic">\1</span>',
    ),
    Substitution(
        "greek",
        r"\[\[(\(?\)?\[?\]?\.?\…?·?\s?-?[\u0370-\u03e1\u03f0-\u03ff\u1f00-\u1fff].*?)\]\]",
        r'<span class="greek">\1</span>',
    ),
    Substitution(
        "arabic",
        r"\[\[(\(?\)?\[?\]?\.?\…?[\u05f3\u0600-\u06ff\ufe70-\ufeff].*?)\]\]",
        r'<span class="arabic">\1</span>',
    ),
    Substitution(
        "aramaic",
        r"\[\[(\(?\)?\[?\]?\.?\…?[\u0700-\u074f].*?)\]\]",
        r'<span class="aramaic">\1</span>',
    ),
    Substitution(
        "hebrew",
        r"\[\[(\(?\)?\[?\]?\.?\…?[\u0590-\u05ff].*?)\]\]",
        r'<span class="hebrew">\1</span>',
    ),
    Substitution(
        "amharic",
        r"\[\[(\(?\)?\[?\]?\.?\…?[\u1200-\u137f\u1380-\u139f\u2d80-\u2ddf\uab00-\uab2f\u1e7e0-\u1e7ff].*?)\]\]",
        r'<span class="amharic">\1</span>',
    ),
    # The following is unnecessary, especially given #476.
    Substitution("qualitative", r"†", r"<sup>†</sup>", enabled=False),
    Substitution("lineBreaks", r"\\n", "</p><p>"),
]
# pylint: enable=line-too-long


def html(text: str) -> abc.Generator[str]:
    yield "<p>"
    for s in SUBSTITUTIONS:
        text = s.sub(text)
    yield text
    yield "</p>"


@typing.final
class Wiki:
    def __init__(self, record: dict[typing.Hashable, typing.Any]) -> None:
        self.key: str = record["Marcion"]
        self.entry: str = record["Entry"]
        self.wip: str = record["WIP"]


# _FROM_MARCION is a set of entries that have been added to Crum by Marcion.
# They don't exist in the original text, and therefore are not expected to be
# found in Wiki!
_FROM_MARCION: set[str] = {"3380", "3381", "3382", "3385"}
# _TO_MERGE is a set of entries that were mistakenly marked as standalone
# entries. They should be merged into other entries, and therefore are not
# expected to be found in Crum!
# TODO: (#508) Merge those entries, and remove this check.
_TO_MERGE: set[str] = {"386", "2837"}


# TODO: (#508) Verify the correctness of the mapping, for example by comparing
# headwords.
def main():
    """Copy updated Wiki data to our Crum sheet.

    NOTE: We intentionally update one row at a time, although this consumes the
    API quota.
    """
    wikis: dict[str, Wiki] = {}
    for w in map(
        Wiki,
        gcp.tsv_spreadsheet(SHEET_TSV_URL).to_dict(orient="records"),
    ):
        if not w.key:
            # This entry doesn't have a key. It's likely a vide entry.
            continue
        assert w.key not in wikis
        wikis[w.key] = w

    ensure.equal_sets(
        wikis.keys(),
        crum.Crum.roots.keys() - _FROM_MARCION - _TO_MERGE,
    )

    for w in wikis.values():
        if not w.entry:
            # This entry isn't populated yet!
            continue
        root: crum.Root = crum.Crum.roots[w.key]
        # Copy the value to our sheet.
        _ = root.update("wiki", w.entry)
        _ = root.update("wiki-wip", w.wip)


if __name__ == "__main__":
    main()
