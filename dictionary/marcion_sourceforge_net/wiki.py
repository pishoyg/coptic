"""Process coptic.wiki's Digital Version of Crum."""

# TODO: (#503) Many checks and filters in this file will no longer be necessary
# once part of the data (e.g. the entries, the Crum page numbers, or the Marcion
# keys) is fully populated. Revisit this module, replacing this filters with
# assertions where appropriate.

# TODO: (#0) Consider the following simplifications of the substitution rules:
# - Use an actual newline character instead of the "\n" token.
# - The headword notation is simply unnecessary.
import functools
import itertools
import re
import typing
from collections import abc

from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import lexical as lex
from utils import ensure, gcp, lang, orth, page

# pylint: disable=line-too-long
# TODO: (#0) Move to `utils/paths.py`.
SHEET_TSV_URL: str = (
    "https://docs.google.com/spreadsheets/d/1lhjcnkHS-pA3p5Vys-6ohKu7Y4ZCJ5NO/export?format=tsv"
)

COMMA_OR_SPACE: re.Pattern[str] = re.compile(r"[ ,]")


class Substitution:
    """A class to represent a single regex substitution."""

    def __init__(
        self,
        name: str,
        pattern: str,
        repl: str,
        text_repl: str = r"\1",
        ban: list[str] | None = None,
    ):
        """Initializes a Substitution object.

        Args:
            name: A description of the substitution rule.
            pattern: The regular expression pattern to search for.
            repl: The replacement string.
            text_repl: A replacement used to generate a plain-text (no-HTML)
                version of the data.
            ban: A list of tokens that are used for substitution, and
                can't be present in the HTML post-processing. Use this optional
                field to verify that all substitutions are well-formed.
        """
        self.name: str = name
        self.pattern: re.Pattern[str] = re.compile(pattern)
        self.repl: str = repl
        self.text_repl: str = text_repl
        self.ban: list[str] = ban or []

    def html(self, raw: str) -> str:
        return self.pattern.sub(self.repl, raw)

    def text(self, raw: str) -> str:
        return self.pattern.sub(self.text_repl, raw)


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
        ban=["_"],
    ),
    Substitution(
        "bold",
        # Bold text is simply bullets. We prefer using an explicit `bullet`
        # class to mark them, instead of relying on `<b>`.
        # We can use a stricter regex that only allows alphabetical characters
        # (optionally followed by a period).
        r"\*([a-zA-Z]+?\.?)\*",
        r'<span class="bullet">\1</span>',
        ban=["*"],
    ),
    Substitution(
        "italic",
        r"_(.+?)_",
        r"<i>\1</i>",
        ban=["_"],
    ),
    Substitution(
        "dialect",
        r"\[\[(S|B|A|F|O)\]\]",
        r'<span class="dialect \1">\1</span>',
        ban=["[[", "]]"],
    ),
    Substitution(
        "subdialect",
        # While not explicitly mentioned in Crum's intro, there are occurrences
        # of non-standard dialect sigla in the dictionary (such as S^af, B^f,
        # and O^f).
        # We are made aware of those cases by looking at the regexes used in
        # CopticWiki. See history at:
        # https://github.com/randykomforty/coptic/commits/main/scripts/dictionary_regexes.js
        # For each of these, we add a non-standard dialect entry in TypeScript,
        # so they can render properly.
        r"\[\[(S|F|B|O)\^(a|f|b|af)\]\]",
        r'<span class="dialect \1\2">\1\2</span>',
        text_repl=r"\1\2",
        ban=["[[", "]]", "^"],
    ),
    Substitution(
        "subdialectLyco",
        r"\[\[(A\^2)\]\]",
        r'<span class="dialect L">A2</span>',
        text_repl="L",
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
        "†",
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

# The corrigenda substitution is different based on which Wiki entry has the
# corrigendum, so we give it special treatment.
CORRIGENDUM_RE: re.Pattern[str] = re.compile("//(.*?)//(.*?)//")
_BANNED: set[str] = {"//"} | {
    token for sub in _SUBSTITUTIONS for token in sub.ban
}


@typing.final
class Wiki:
    """Wiki represents an entry in the Wiki sheet."""

    def __init__(
        self,
        key: str,
        record: dict[typing.Hashable, typing.Any],
    ) -> None:
        self.key: int = int(key)
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
        self.wip: bool = bool(wip) or not self.entry
        del wip

    @property
    def canonical(self) -> bool:
        # A canonical entry is a non-vide entry.
        return not self.vide

    @property
    def complete(self) -> bool:
        return not self.wip

    @functools.cached_property
    def lexicographic_key(self) -> str:
        """Get the key used to sort the word lexicographically.

        Returns:
            A stripped representation of the headword, used to determine the
            word's alphabetical position in the dictionary.
        """
        # Remove all parentheses.
        headword: str = self.headword
        # If the headword consists of multiple words, select the first one.
        headword = COMMA_OR_SPACE.split(headword, 1)[0]
        # Clean up the headword.
        headword = headword.replace("(", "").replace(")", "")
        headword = headword.removesuffix("^1")
        headword = headword.removeprefix("-")
        headword = headword.rstrip("-⸗†")
        headword = orth.clean_diacritics(headword)

        ensure.ensure(
            all(map(lang.is_coptic_char, headword)),
            "can not determine the lexicographic key of",
            self.headword,
        )

        return headword

    def html(self) -> str:
        html: str = "".join(self._html_aux())
        for token in _BANNED:
            ensure.ensure(
                token not in html,
                "Banned token",
                token,
                "found in entry",
                self.key,
                "output:",
                html,
            )
        return html

    def _html_aux(self) -> abc.Generator[str]:
        yield "<p>"
        yield '<span class="subparagraph">'
        raw: str = self.entry
        for s in _SUBSTITUTIONS:
            raw = s.html(raw)
        if self.corrigenda_page:
            # If this entry has no corrigenda page, we can assume that it has no
            # corrigenda. The check for banned tokens will enforce this.
            raw = CORRIGENDUM_RE.sub(
                f'<span class="corrigendum" data-page="{self.corrigenda_page}">'
                + r"<del>\1</del>"
                + r"<ins>\2</ins>"
                + "</span>",
                raw,
            )
        yield raw
        yield "</span>"
        yield "</p>"

    @functools.cached_property
    def text(self) -> str:
        txt: str = self.entry
        for s in _SUBSTITUTIONS:
            txt = s.text(txt)
        txt = CORRIGENDUM_RE.sub(r"\2", txt)
        return txt

    @typing.override
    def __str__(self) -> str:
        return self.headword

    @functools.cached_property
    def corrigenda_page(self) -> str | None:
        """
        Returns:
            A string representing the page number and column in the Additions
            and Corrections section that contains corrigenda for this entry. If
            this page lies outside the range of pages for which corrigenda are
            available, return None.

            NOTE: The value returned may not be accurate for entries lying on
            the "borders". In particular:
            - If corrigenda for a given page start on a column and spill over to
              the following one, the first column will be returned.
            - For long Crum entries that span multiple pages, we only store the
              start page, and we will determine the corrigenda page based on
              that.
        """
        # We could binary-search, but the list only contains 20 elements, so
        # binary search is not worth it.
        for col in constants.COLUMN_RANGES:
            if self.crum <= col.end:
                return col.name
        return None


def wikis() -> abc.Generator[Wiki]:
    for record in gcp.tsv_spreadsheet(SHEET_TSV_URL).to_dict(orient="records"):
        for key in record["Marcion"].split():
            yield Wiki(key, record)


@functools.cache
def by_marcion_key() -> dict[str, list[Wiki]]:
    entries: list[Wiki] = list(wikis())
    # Remove entries that don't have a key.
    entries = [w for w in entries if w.key]
    # First bring all entries with the same key together, so we can group they
    # by key.
    entries = sorted(entries, key=lambda w: w.key)
    # Group by key, sorting each group.
    return {
        str(key): list(group)
        for key, group in itertools.groupby(entries, lambda w: w.key)
    }


class Page:
    """Page represents a group of Wikis that occur on the same page."""

    def __init__(self, crum: lex.CrumPage, ws: abc.Iterable[Wiki]) -> None:
        self.crum: lex.CrumPage = crum
        self.wikis: list[Wiki] = list(ws)

    def html(self) -> str:
        return "".join(self.html_aux())

    def html_aux(self) -> abc.Generator[str]:
        yield '<span class="crum-page">'
        yield str(self.crum)
        yield "</span>"
        html: str = page.HORIZONTAL_RULE.join(
            w.html() for w in self.wikis if w.complete
        )
        ensure.ensure(
            html,
            "Generating HTML for a page without any complete Wikis! Page:",
            self.crum,
            "Wikis:",
            list(map(str, self.wikis)),
        )
        yield html
