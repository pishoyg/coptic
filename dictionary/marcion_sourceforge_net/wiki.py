#!/usr/bin/env python3
"""Process coptic.wiki's Digital Version of Crum."""

# TODO: (#503) Many checks and filters in this file will no longer be necessary
# once part of the data (e.g. the entries, the Crum page numbers, or the Marcion
# keys) is fully populated. Revisit this module, replacing this filters with
# assertions where appropriate.

# TODO: (#0) Consider the following simplifications of the substitution rules:
# - Use an actual newline character instead of the "\n" token.
# - The headword notation is simply unnecessary.

import argparse
import functools
import itertools
import re
import typing
from collections import abc

from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import lexical as lex
from utils import ensure, gcp, lang, log, orth

_argparser: argparse.ArgumentParser = argparse.ArgumentParser()

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
        ban: list[str] | None = None,
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
            ban: A list of tokens that are used for substitution, and
                can't be present in the HTML post-processing. Use this optional
                field to verify that all substitutions are well-formed.
        """
        self.name: str = name
        self.pattern: re.Pattern[str] = re.compile(pattern)
        self.repl: str = repl
        self.text_repl: str = text_repl
        self.md_repl: str = md_repl or self.text_repl
        self.ban: list[str] = ban or []

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
    # Replace occurrences of ampersand with the HTML encoding.
    # NOTE: While most browsers and pipelines can deal with a literal ampersand,
    # BeautifulSoup often misinterprets the combination "&c;" so we convert it
    # explicitly.
    Substitution("ampersand", "&", "&amp;", text_repl="&"),
    # The asterisk is not a reserved character in modern HTML, so we don't need
    # to use `&ast;`. However, using a plain asterisk risks conflicting with the
    # bold rule below. We therefore leave it up to our linters to replace
    # the occurrences of `&ask;` produced here with a literal asterisk.
    Substitution("asterisk", r"\\\*", "&ast;", text_repl="*", ban=["*", "\\"]),
    Substitution(
        "tab",
        r"\\t",
        '</span><span class="subparagraph">',
        text_repl="    ",
        ban=["\\"],
    ),
    Substitution(
        "em",
        r"__(.+?)__",
        r"<em>\1</em>",
        md_repl=r"*\1*",
        ban=["_"],
    ),
    Substitution(
        "bold",
        # Bold text is simply bullets. We prefer using an explicit `bullet`
        # class to mark them, instead of relying on `<b>`.
        # We can use a stricter regex that only allows alphabetical characters
        # (optionally followed by a period).
        r"\*([a-zA-Z]+?\.?)\*" or r"\*(.+?)\*",
        r'<span class="bullet">\1</span>' or r"<b>\1</b>",
        md_repl=r"**\1**",
        ban=["*"],
    ),
    Substitution(
        "italic",
        r"_(.+?)_",
        r"<i>\1</i>",
        md_repl=r"*\1*",
        ban=["_"],
    ),
    Substitution(
        "dialect",
        r"\[\[(S|B|A|F|O)\]\]",
        # We use a `dialect` class to handle dialects. There is no need to store
        # styling in the HTML or insert dialects in <i> tags. This also achieves
        # consistency with the Marcion HTML.
        r'<span class="dialect \1">\1</span>' or r'<i class="dialect">\1</i>',
        md_repl=r"***\1***",
        ban=["[[", "]]"],
    ),
    Substitution(
        "subdialect",
        # While not explicitly mentioned in Crum's intro, there is apparently an
        # occurrence of B^f in ϫⲟⲗ[1], and an occurrence of S^af in ⲥⲟⲉⲓϣ[2].
        # (And maybe they occur elsewhere.)
        #
        # [1] https://remnqymi.com/crum/2391.html.
        # [2] https://remnqymi.com/crum/363.html
        r"\[\[(S|F|B)\^(a|f|b|af)\]\]",
        # Again, we have our own way of managing border dialects. We don't store
        # styling in the HTML.
        r'<span class="dialect \1\2">\1\2</span>'
        or r'<i class="dialect">\1<sup>\2</sup></i>',
        text_repl=r"\1\2",
        md_repl=r"***\1\2***",
        ban=["[[", "]]", "^"],
    ),
    Substitution(
        "subdialectLyco",
        r"\[\[(A\^2)\]\]",
        # No styling in the HTML! Also use L for Lycopolitan.
        r'<span class="dialect L">L</span>'
        or r'<i class="dialect">A<sup class="non-italic">2</sup></i>',
        text_repl="L",
        md_repl="***L***",
        ban=["[[", "]]", "^"],
    ),
    Substitution(
        "superscript",
        r"\^(\w+)",
        r"<sup>\1</sup>",
        # This is not entirely plain text, but we have no other way to represent
        # superscripted text.
        text_repl=r"^(\1)",
        ban=["^"],
    ),
    Substitution(
        "headword",
        r"\[\[\[(\(?\)?\[?\]?\.?\…?-?[\u2c80-\u2cff\u03e2-\u03ef].*?\]?)\]\]\]",
        r'<span class="headword coptic">\1</span>',
        md_repl=r"**\1**",
        ban=["[[[", "]]]"],
    ),
    Substitution(
        "coptic",
        r"\[\[(\(?\)?\[?\.?\.?\]?\.?,?\…?-?·?\s?[\u2c80-\u2cff\u03e2-\u03ef].*?\]?)\]\]",
        r'<span class="coptic">\1</span>',
        ban=["[[", "]]"],
    ),
    Substitution(
        "greek",
        r"\[\[(\(?\)?\[?\]?\.?\…?·?\s?-?[\u0370-\u03e1\u03f0-\u03ff\u1f00-\u1fff].*?)\]\]",
        r'<span class="greek">\1</span>',
        ban=["[[", "]]"],
    ),
    Substitution(
        "arabic",
        r"\[\[(\(?\)?\[?\]?\.?\…?[\u05f3\u0600-\u06ff\ufe70-\ufeff].*?)\]\]",
        r'<span class="arabic">\1</span>',
        ban=["[[", "]]"],
    ),
    Substitution(
        "aramaic",
        r"\[\[(\(?\)?\[?\]?\.?\…?[\u0700-\u074f].*?)\]\]",
        r'<span class="aramaic">\1</span>',
        ban=["[[", "]]"],
    ),
    Substitution(
        "hebrew",
        r"\[\[(\(?\)?\[?\]?\.?\…?[\u0590-\u05ff].*?)\]\]",
        r'<span class="hebrew">\1</span>',
        ban=["[[", "]]"],
    ),
    Substitution(
        "amharic",
        r"\[\[(\(?\)?\[?\]?\.?\…?[\u1200-\u137f\u1380-\u139f\u2d80-\u2ddf\uab00-\uab2f\u1e7e0-\u1e7ff].*?)\]\]",
        r'<span class="amharic">\1</span>',
        ban=["[[", "]]"],
    ),
    Substitution(
        "qualitative",
        "†",
        # The qualitative rule is unnecessary, especially given #476.
        "†" or r"<sup>†</sup>",
        text_repl="†",
    ),
    Substitution(
        "lineBreaks",
        r"\\n",
        '</span></p><p><span class="subparagraph">',
        text_repl="\n",
        ban=["\\"],
    ),
]
# pylint: enable=line-too-long
_BANNED: set[str] = {token for sub in _SUBSTITUTIONS for token in sub.ban}


def _text(raw: str) -> str:
    for s in _SUBSTITUTIONS:
        raw = s.plain_text(raw)
    return raw


def _markdown(raw: str) -> str:
    for s in _SUBSTITUTIONS:
        raw = s.markdown(raw)
    return raw


@typing.final
class Wiki:
    """Wiki represents an entry in the Wiki sheet."""

    def __init__(
        self,
        key: str,
        record: dict[typing.Hashable, typing.Any],
    ) -> None:
        self.key: int = int(key) if key else 0
        del key
        self.entry: str = record["Entry"]
        self.headword: str = record["Headword"]
        assert self.headword

        ensure.ensure(
            self.key == 0
            or constants.MIN_KEY <= self.key <= constants.MAX_KEY,
            "invalid key:",
            self.key,
            "for headword:",
            self.headword,
        )

        # TODO: (#427) Some entries should have pages pointing to the Additions
        # and Corrections section, rather than the body of the book.
        self.crum: lex.CrumPage = lex.CrumPage(record["Crum"])
        assert self.crum

        vide: str = record["_v_"]
        ensure.ensure(
            vide in ["", "v"],
            self.headword,
            "has an invalid vide entry:",
            vide,
        )
        self.vide = bool(vide)
        del vide

        wip: str = record["WIP"]
        ensure.ensure(
            wip in ["", "*"],
            self.headword,
            "has an invalid WIP entry:",
            wip,
        )
        self.wip: bool = bool(wip)
        del wip

    @functools.cached_property
    def lexicographic_key(self) -> str:
        """Get the key used to sort the word lexicographically.

        Returns:
            A stripped representation of the headword, used to determine the
            word's alphabetical position in the dictionary.
        """
        # Remove all parentheses.
        headword: str = self.headword.replace("(", "").replace(")", "")
        # Remove the superscript if present.
        if headword.endswith("^1"):
            headword = headword[:-2]
        # Remove the prefix.
        if headword.startswith("-"):
            headword = headword[1:]
        # Remove the suffix.
        if headword[-1] in "-⸗†":
            headword = headword[:-1]
        # If the headword consists of multiple words, select the first one.
        headword = re.split(r"[ ,]", headword, 1)[0]
        # Remove all diacritics.
        headword = orth.clean_diacritics(headword)

        ensure.ensure(
            all(map(lang.is_coptic_char, headword)),
            "can not determine the lexicographic key of",
            self.headword,
        )

        return headword

    def __lt__(self, other: typing.Self) -> bool:
        assert self.key == other.key
        # We want non-vide entries to appear before vide entries. Other than
        # that, entries should show in the same order as they do in the book
        # (which is lexicographically sorted).
        # The input data has the same order as the book, and the Python built-in
        # `sorted` function performs a stable sort. So we can guarantee that,
        # other than bringing non-vide entries first, the order in the output
        # will match that of the book.
        return not self.vide and other.vide

    def html(self, page: bool = False) -> str:
        html: str = "".join(self._html_aux(page))
        for char in html:
            ensure.ensure(
                char not in _BANNED,
                "Banned token",
                char,
                "found in entry",
                self.key,
                "output:",
                html,
            )
        return html

    def _html_aux(self, page: bool) -> abc.Generator[str]:
        if page:
            yield '<span class="crum-page">'
            yield str(self.crum)
            yield "</span>"
        raw: str = self.entry
        yield "<p>"
        yield '<span class="subparagraph">'
        for s in _SUBSTITUTIONS:
            raw = s.html(raw)
        yield raw
        yield "</span>"
        yield "</p>"

    @functools.cached_property
    def text(self) -> str:
        return _text(self.entry)

    @functools.cached_property
    def markdown(self) -> str:
        return _markdown(self.entry)

    @typing.override
    def __str__(self) -> str:
        return self.headword


def records() -> abc.Generator[Wiki]:
    for record in gcp.tsv_spreadsheet(SHEET_TSV_URL).to_dict(orient="records"):
        # Some vide entries have multiple keys.
        keys: list[str] = record["Marcion"].split(",")
        if len(keys) > 1 and not record["_v_"]:
            log.warn(
                "Non-vide entries has several Marcion keys:",
                record,
            )
        if keys == ["TBD"]:
            # This entry is not in Marcion yet!
            # TODO: (#508) All Crum entry should have a Marcion entry.
            continue
        for key in keys:
            yield Wiki(key, record)


@functools.cache
def wikis() -> dict[str, list[Wiki]]:
    entries: list[Wiki] = list(records())
    # Remove entries that don't have a key.
    entries = [w for w in entries if w.key]
    # First bring all entries with the same key together, so we can group they
    # by key.
    entries = sorted(entries, key=lambda w: w.key)
    # Group by key, sorting each group.
    # TODO: (#508) Ban groups that consist entirely of vide entries. If a group
    # is all vide, its corresponding Marcion entry should be merged into another
    # Marcion entry, and the group keys should be updated to use the new key.
    return {
        str(key): sorted(group)
        for key, group in itertools.groupby(entries, lambda w: w.key)
    }


def main():
    args: argparse.Namespace = _argparser.parse_args()
    if args.text:
        print(_text(args.text))
        return
    if args.markdown:
        print(_markdown(args.text))
        return


if __name__ == "__main__":
    main()
