#!/usr/bin/env python3
"""Process coptic.wiki's Digital Version of Crum."""

import re
import typing
from collections import abc

from dictionary.marcion_sourceforge_net import main as crum
from dictionary.marcion_sourceforge_net import sheet
from utils import ensure, gcp, log

# pylint: disable=line-too-long
# TODO: (#0) Move to `utils/paths.py`.
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
        text_repl: str = r"\1",
    ):
        """Initializes a Substitution object.

        Args:
            name: A description of the substitution rule.
            pattern: The regular expression pattern to search for.
            repl: The replacement string in Coptic Wiki. We store this data
                regardless of whether or not it's used. (More below!)
            enabled: Whether the rule is active in our code.
            override: An optional replacement string that overrides the Coptic Wiki
                replacement. In case you want to use the Wiki replacement, don't set
                this field.
            text_repl: A replacement used to generate a plain-text (no-HTML)
                version of the data.
        """
        self.name: str = name
        self.pattern: re.Pattern[str] = re.compile(pattern)
        self.repl: str = repl
        self.enabled: bool = enabled
        self.override: str | None = override
        self.text_repl: str | None = text_repl

    def _sub(self, repl: str, text: str) -> str:
        if not self.enabled:
            return text
        return self.pattern.sub(repl, text)

    def sub(self, text: str) -> str:
        return self._sub(self.override or self.repl, text)

    def plain_text(self, text: str) -> str:
        return self._sub(self.text_repl or self.override or self.repl, text)


# Coptic Wiki substitutions:
# NOTE: This is based on a snapshot of the following file, taken on September 17,
# 2025:
# - https://github.com/randykomforty/coptic/blob/main/scripts/dictionary_regexes.js
# If the file were to be updated, this mapping should be updated accordingly.
SUBSTITUTIONS: list[Substitution] = [
    Substitution(
        "ampersand",
        r"&amp;",
        "&",
        enabled=False,
        text_repl="&",
    ),  # Unnecessary!
    Substitution(
        "asterisk",
        r"\*",
        "&ast;",
        enabled=False,
        text_repl="*",
    ),  # Unnecessary!
    Substitution(
        "tab",
        r"\n",
        "</p><p>",
        enabled=False,
        text_repl="\n",
    ),  # Unused! TODO: (#546): Fix Tab characters.
    Substitution("em", r"__(.+?)__", r"<em>\1</em>"),
    Substitution(
        "bold",
        r"\*(.+?)\*",
        r"<b>\1</b>",
        override=r'<span class="bullet">\1</span>',
    ),
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
        text_repl=r"\1\2",
    ),
    Substitution(
        "subdialectLyco",
        r"\[\[(A\^2)\]\]",
        r'<i class="dialect">A<sup class="non-italic">2</sup></i>',
        override=r'<span class="dialect L">L</span>',
        text_repl="L",
    ),
    Substitution(
        "superscript",
        r"\^(\w+)",
        r"<sup>\1</sup>",
        # This is not entirely plain text, but we have no other way to represent
        # superscripted text.
        text_repl=r"^(\1)",
    ),
    Substitution(
        "headword",
        r"\[\[\[(\(?\)?\[?\]?\.?\…?-?[\u2c80-\u2cff\u03e2-\u03ef].*?\]?)\]\]\]",
        r'<span class="headword coptic">\1</span>',
    ),
    Substitution(
        "coptic",
        r"\[\[(\(?\)?\[?\.?\.?\]?\.?,?\…?-?·?\s?[\u2c80-\u2cff\u03e2-\u03ef].*?\]?)\]\]",
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
    Substitution(
        "qualitative",
        "†",
        r"<sup>†</sup>",
        enabled=False,
        text_repl="†",
    ),
    Substitution("lineBreaks", r"\\n", "</p><p>", text_repl="\n"),
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
    """Wiki represents an entry in the Wiki sheet."""

    def __init__(self, record: dict[typing.Hashable, typing.Any]) -> None:
        self.key: str = record["Marcion"]
        self.entry: str = record["Entry"]
        self.wip: str = record["WIP"]
        self.vide: str = record["_v_"]
        self.headword: str = record["Headword"]


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
            # This entry doesn't have a Marcion key. It's likely a vide entry.
            if not w.vide:
                log.error("Non-vide entry lacks a Marcion key:", w.entry)
            continue
        if w.vide:
            log.warn("Key", w.key, "points to a vide entry:", w.entry)
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
        root.update_cell(sheet.COL.WIKI, w.entry)
        root.update_cell(sheet.COL.WIKI_WIP, w.wip)


if __name__ == "__main__":
    main()
