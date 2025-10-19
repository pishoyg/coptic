#!/usr/bin/env python3
"""Process coptic.wiki's Digital Version of Crum."""

import argparse
import re
import typing
from collections import abc

from dictionary.marcion_sourceforge_net import crum, sheet
from utils import ensure, gcp, log

_argparser: argparse.ArgumentParser = argparse.ArgumentParser(
    description="Reconcile or process Wiki data.",
)

_ = _argparser.add_argument(
    "-t",
    "--text",
    type=str,
    default="",
    help="If given, print plain text of the given data.",
)

_ = _argparser.add_argument(
    "-m",
    "--markdown",
    type=str,
    default="",
    help="If given, print the Markdown version of the given text, and exit.",
)

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
        text_repl: str = r"\1",
        md_repl: str = "",
    ):
        """Initializes a Substitution object.

        Args:
            name: A description of the substitution rule.
            pattern: The regular expression pattern to search for.
            repl: The replacement string.
            text_repl: A replacement used to generate a plain-text (no-HTML)
                version of the data.
            md_repl: A replacement used to generate a Markdown version of the
                text.
        """
        self.name: str = name
        self.pattern: re.Pattern[str] = re.compile(pattern)
        self.repl: str = repl
        self.text_repl: str = text_repl
        self.md_repl: str = md_repl or self.text_repl

    def html(self, raw: str) -> str:
        return self.pattern.sub(self.repl, raw)

    def plain_text(self, raw: str) -> str:
        return self.pattern.sub(self.text_repl, raw)

    def markdown(self, raw: str) -> str:
        return self.pattern.sub(self.md_repl, raw)


# Coptic Wiki substitutions:
#
# NOTE: This is based on a snapshot of the following file, taken on September 17,
# 2025:
# - https://github.com/randykomforty/coptic/blob/main/scripts/dictionary_regexes.js
# If the file were to be updated, this mapping should be updated accordingly.
#
# NOTE: For substitution rules that we override, we have opted for inserting the
# overriding replacement right before the Wiki replacement, separating them by
# an `or` operator. We also add a comment explaining the rationale for the
# override.
_SUBSTITUTIONS: list[Substitution] = [
    # The ampersand rule doesn't make sense. It replaces occurrences of `&amp`
    # with `&`, although we should be using the former in HTML!
    Substitution("ampersand", r"&amp;", r"&amp;" or "&", text_repl="&"),
    # The asterisk is not a reserved character in modern HTML, so we don't need
    # to use `&ast;`. However, using a plain asterisk risks conflicting with the
    # bold rule below. We therefore leave it up to our linters to replace
    # the occurrences of `&ask;` produced here with a literal asterisk.
    Substitution("asterisk", r"\\\*", "&ast;", text_repl="*"),
    # TODO: (#546): The tab rule is currently unused. Fix Tab characters.
    Substitution("tab", r"\n", "</p><p>", text_repl="\n"),
    Substitution("em", r"__(.+?)__", r"<em>\1</em>", md_repl=r"*\1*"),
    Substitution(
        "bold",
        # We use a stricter regex to prevent potential conflict with occurrences
        # of the literal asterisk during plain text generation. Notice that the
        # conflict is prevented during HTML generation through the use of
        # `&ast;` to represent the literal asterisk, so either regex would do.
        r"\*([a-zA-Z]+?\.?)\*" or r"\*(.+?)\*",
        # Bold text is simply bullets. We prefer using an explicit `bullet`
        # class to mark them, instead of relying on `<b>`.
        r'<span class="bullet">\1</span>' or r"<b>\1</b>",
        md_repl=r"**\1**",
    ),
    Substitution("italic", r"_(.+?)_", r"<i>\1</i>", md_repl=r"*\1*"),
    Substitution(
        "dialect",
        r"\[\[(S|B|A|F|O)\]\]",
        # We use a `dialect` class to handle dialects. There is no need to store
        # styling in the HTML or insert dialects in <i> tags. This also achieves
        # consistency with the Marcion HTML.
        r'<span class="dialect \1">\1</span>' or r'<i class="dialect">\1</i>',
        md_repl=r"***\1***",
    ),
    Substitution(
        "subdialect",
        # While not explicitly mentioned in Crum's intro, there are apparently
        # some occurrences of B^f (Bohairic with Fayyumic tendency), e.g. in
        # ϫⲟⲗ[1].
        #
        # [1] https://remnqymi.com/crum/2391.html#wiki.
        r"\[\[(S|F|B)\^(a|f|b)\]\]",
        # Again, we have our own way of managing border dialects. We don't store
        # styling in the HTML.
        r'<span class="dialect \1\2">\1\2</span>'
        or r'<i class="dialect">\1<sup>\2</sup></i>',
        text_repl=r"\1\2",
        md_repl=r"***\1\2***",
    ),
    Substitution(
        "subdialectLyco",
        r"\[\[(A\^2)\]\]",
        # No styling in the HTML! Also use L for Lycopolitan.
        r'<span class="dialect L">L</span>'
        or r'<i class="dialect">A<sup class="non-italic">2</sup></i>',
        text_repl="L",
        md_repl="***L***",
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
        md_repl=r"**\1**",
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
    Substitution(
        "qualitative",
        "†",
        # The qualitative rule is unnecessary, especially given #476.
        "†" or r"<sup>†</sup>",
        text_repl="†",
    ),
    Substitution("lineBreaks", r"\\n", "</p><p>", text_repl="\n"),
]
# pylint: enable=line-too-long


def html(raw: str) -> abc.Generator[str]:
    yield "<p>"
    for s in _SUBSTITUTIONS:
        raw = s.html(raw)
    yield raw
    yield "</p>"


def text(raw: str) -> str:
    for s in _SUBSTITUTIONS:
        raw = s.plain_text(raw)
    return raw


def markdown(raw: str) -> str:
    for s in _SUBSTITUTIONS:
        raw = s.markdown(raw)
    return raw


@typing.final
class _Wiki:
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


def _wikis() -> dict[str, _Wiki]:
    wikis: dict[str, _Wiki] = {}
    for w in map(
        _Wiki,
        gcp.tsv_spreadsheet(SHEET_TSV_URL).to_dict(orient="records"),
    ):
        # TODO: (#508) Resolve the vide-related inconsistencies below, and
        # replace the messages with strict checks.
        if not w.key:
            # This Wiki entry has no corresponding Marcion entry.
            if w.vide:
                # This is a vide entry, we can ignore it.
                continue
            log.error(
                "Non-vide entry lacks a Marcion key! Headword:",
                w.headword,
                "; entry:",
                w.entry,
            )
            continue

        # This entry has a corresponding Marcion entry.
        if w.vide:
            log.warn(
                "Key",
                w.key,
                "points to a vide entry! Headword:",
                w.headword,
                "; entry:",
                w.entry,
            )
        assert w.key not in wikis
        wikis[w.key] = w
    return wikis


def reconcile() -> None:
    """Copy up-to-date Wiki data to our Crum sheet.

    NOTE: We intentionally update one row at a time, although this consumes the
    API quota.
    """
    wikis = _wikis()
    ensure.equal_sets(wikis.keys(), crum.Crum.roots.keys() - _FROM_MARCION)

    for w in wikis.values():
        root: crum.Root = crum.Crum.roots[w.key]
        # Copy the value to our sheet.
        root.update_cell(sheet.COL.WIKI, w.entry)
        root.update_cell(sheet.COL.WIKI_WIP, w.wip)


def main():
    args: argparse.Namespace = _argparser.parse_args()
    if args.text:
        print(text(args.text))
        return
    if args.markdown:
        print(markdown(args.text))
        return
    reconcile()


if __name__ == "__main__":
    main()
