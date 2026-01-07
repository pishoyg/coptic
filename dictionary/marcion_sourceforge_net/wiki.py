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

import regex

from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import lexical as lex
from utils import ensure, gcp, lang, log, orth, page

# pylint: disable=line-too-long
# TODO: (#0) Move to `utils/paths.py`.
SHEET_TSV_URL: str = (
    "https://docs.google.com/spreadsheets/d/1lhjcnkHS-pA3p5Vys-6ohKu7Y4ZCJ5NO/export?format=tsv"
)

COMMA_OR_SPACE: re.Pattern[str] = re.compile(r"[ ,]")

# RAW_RE should match a Wiki raw string.
# All non-Latin text is expected to be surrounded by double square brackets.
# Outside of double square brackets, there should remain only (1) Latin text, or
# (2) non-letter characters. RAW_RE can be used to verify this structure.
# "ʿ" and "β" are added for singleton violations of this rule:
# - https://remnqymi.com/crum/3387.html#:~:text=%CA%BFAmru%CC%82
# - https://remnqymi.com/crum/3075.html#:~:text=%CE%B2
RAW_RE: regex.Pattern[str] = regex.compile(
    r"\[\[.*?\]\]|[\p{Latin}\P{Letter}ʿβ]",
)


class Substitution:
    """A class to represent a single regex substitution."""

    def __init__(
        self,
        pattern: str,
        repl: str | typing.Callable[[re.Match[str]], str],
        text_repl: str | typing.Callable[[re.Match[str]], str] = r"\1",
        ban: list[str] | None = None,
    ):
        """Initializes a Substitution object.

        Args:
            pattern: The regular expression pattern to search for.
            repl: The replacement string.
            text_repl: A replacement used to generate a plain-text (no-HTML)
                version of the data.
            ban: A list of tokens that are used for substitution, and
                can't be present in the HTML post-processing. Use this optional
                field to verify that all substitutions are well-formed.
        """
        self.pattern: re.Pattern[str] = re.compile(pattern)
        self.repl: str | typing.Callable[[re.Match[str]], str] = repl
        self.text_repl: str | typing.Callable[[re.Match[str]], str] = text_repl
        self.ban: list[str] = ban or []

    def html(self, raw: str) -> str:
        return self.pattern.sub(self.repl, raw)

    def text(self, raw: str) -> str:
        return self.pattern.sub(self.text_repl, raw)


def bracketed(exp: str, repeat: int = 2) -> str:
    """Construct a regex to match text surrounded by square brackets.

    The expression will use negative lookbehind and lookahead to ensure that
    whatever character follows or precedes is not a square bracket. This is
    useful if your expression itself can contain brackets.

    Args:
        exp: Core of the expression.
        repeat: How many square brackets need to be present on each side of the
            expression.

    Returns:
        A string representing the full expression.
    """
    return r"(?<!\[)" + r"\[" * repeat + exp + r"\]" * repeat + r"(?!\])"


# NOTE: It's important for Greek to precede Coptic, and Hebrew Arabic. Some
# Greek words contain Coptic letters, and Arabic words often use the Hebrew
# geresh.
LANGS = ["GREEK", "COPTIC", "ARABIC", "HEBREW", "SYRIAC", "ETHIOPIC"]
LANG_CLASS = {"SYRIAC": "ARAMAIC", "ETHIOPIC": "AMHARIC"}

DEMOTIC_RE: regex.Pattern[str] = regex.compile(
    r"^(?:[\p{Ll}ꜣꜥʾʿ]\p{M}*|[ '\-=\.])+$",
    regex.IGNORECASE,
)


def replace_bracketed(match: re.Match[str]) -> str:
    text: str = match.group(1)
    del match

    if text == "·":
        # This special case happens to exist in the Wiki data. It likely
        # shouldn't be classified as belonging to one of the languages, so we
        # simply return the text itself.
        return text

    language: str | None = next(
        (language for language in LANGS if lang.has_lang(language, text)),
        None,
    )

    if not language and DEMOTIC_RE.match(text):
        language = "demotic"

    if not language:
        log.fatal("Can't infer language of bracketed text:", text)

    clas: str = LANG_CLASS.get(language, language).lower()
    return f'<span class="{clas}">{text}</span>'


def replace_manual(match: re.Match[str]) -> str:
    text, key = match.group(1, 2)
    if key is None:
        return rf'<span class="manual">{text}</span>'
    return rf'<span class="manual" data-key="{key}">{text}</span>'


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
    Substitution("&", "&amp;", text_repl="&"),
    # The asterisk is not a reserved character in modern HTML, so we don't need
    # to use `&ast;`. However, using a plain asterisk risks conflicting with the
    # bold rule below. We therefore leave it up to our linters to replace
    # the occurrences of `&ask;` produced here with a literal asterisk.
    Substitution(r"\\\*", "&ast;", text_repl="*", ban=["*", "\\"]),
    Substitution(
        r"\\t",
        '<span class="tab">&nbsp;</span>',
        text_repl="    ",
        ban=["\\"],
    ),
    Substitution(r"__(.+?)__", r'<span class="gloss">\1</span>', ban=["_"]),
    Substitution(
        # Bold text is simply bullets. We prefer using an explicit `bullet`
        # class to mark them, instead of relying on `<b>`.
        # We can use a stricter regex that only allows alphabetical characters
        # (optionally followed by a period).
        r"\*([a-zA-Z]+?\.?)\*",
        r'<span class="bullet">\1</span>',
        ban=["*"],
    ),
    Substitution(r"_(.+?)_", r"<i>\1</i>", ban=["_"]),
    Substitution(
        bracketed("(S|B|A|F|O)"),
        r'<span class="dialect \1">\1</span>',
        ban=["[[", "]]"],
    ),
    Substitution(
        # While not explicitly mentioned in Crum's intro, there are occurrences
        # of non-standard dialect sigla in the dictionary (such as S^af, B^f,
        # and O^f).
        # We are made aware of those cases by looking at the regexes used in
        # CopticWiki. See history at:
        # https://github.com/randykomforty/coptic/commits/main/scripts/dictionary_regexes.js
        # For each of these, we add a non-standard dialect entry in TypeScript,
        # so they can render properly.
        bracketed(r"(S|F|B|O)\^(a|f|b|af)"),
        r'<span class="dialect \1\2">\1\2</span>',
        text_repl=r"\1\2",
        ban=["[[", "]]", "^"],
    ),
    Substitution(
        bracketed(r"(A\^2)"),
        r'<span class="dialect L">A2</span>',
        text_repl="L",
        ban=["[[", "]]", "^"],
    ),
    Substitution(
        r"\^([-–—\w]+)",
        r"<sup>\1</sup>",
        # This is not entirely plain text, but we have no other way to represent
        # superscripted text.
        text_repl=r"^(\1)",
        ban=["^"],
    ),
    Substitution(
        bracketed("(.*?)", 3),
        r'<span class="headword coptic">\1</span>',
        ban=["[[[", "]]]"],
    ),
    Substitution(
        r"\\n",
        "</p><p>",
        text_repl="\n",
        ban=["\\"],
    ),
    Substitution(bracketed(r"(.*?)"), replace_bracketed, ban=["[[", "]]"]),
]
# pylint: enable=line-too-long


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
        # Validate entry.
        if self.wip:
            # Don't validate this entry yet.
            return
        invalid: str = RAW_RE.sub("", self.entry)
        if invalid:
            log.fatal(
                self.key,
                "contains invalid text:",
                invalid,
                "in:",
                self.entry,
            )
        self.footnotes: list[str] = []

    def subs(self) -> abc.Generator[Substitution]:
        yield from _SUBSTITUTIONS

        yield Substitution(
            r"{{(.*?)}}",
            self.replace_footnote,
            # NOTE: Footnotes are omitted from the text version.
            text_repl="",
            ban=["{", "}"],
        )
        yield Substitution(
            r"{(.*?)}(?:{(.*?)})?",
            replace_manual,
            ban=["{", "}"],
        )
        if self.addenda_page:
            yield Substitution(
                "//(.*?)//(.*?)//",
                f'<span class="corrigendum" data-page="{self.addenda_page}">'
                + r"<del>\1</del><ins>\2</ins>"
                + "</span>",
                r"\2",
                ban=["//"],
            )

    def addendum(self) -> bool:
        """Determine whether this entry is an addendum.

        Our entries come from two sources: The body of the book (page numbers
        ranging from 1 to 844), and the Additions and Corrections (pages xv to
        xxiv). If the page number is a Roman numeral, then this entry is an
        addendum.

        Returns:
            True if this entry is an addendum, false otherwise.
        """
        return self.crum.roman()

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
            lang.is_lang("COPTIC", headword),
            "can not determine the lexicographic key of",
            self.headword,
        )

        return headword

    def _banned(self) -> set[str]:
        return {token for sub in self.subs() for token in sub.ban}

    def html(self) -> str:
        # NOTE: Each call to this method populates self.footnotes. Calling it
        # multiple times would be an error.
        # TODO: (#0) This is not a clean implementation!
        assert not self.footnotes
        html: str = "".join(self._html_aux())
        for token in self._banned():
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

    def replace_footnote(self, match: re.Match[str]) -> str:
        self.footnotes.append(match.group(1))
        num: int = len(self.footnotes)
        return f'<span class="mark" data-num="{num}">[{num}]</span>'

    def _html_aux(self) -> abc.Generator[str]:
        yield '<div class="entry">'
        yield "<p>"

        raw: str = self.entry
        for s in self.subs():
            raw = s.html(raw)
        yield raw

        for num, footnote in enumerate(self.footnotes, 1):
            yield f'<span class="footnote" id="footnote{num}">'
            yield f"[{num}] "
            yield footnote
            yield "</span>"

        yield "</p>"
        yield "</div>"

    @functools.cached_property
    # NOTE: Footnotes are omitted from the text!
    def text(self) -> str:
        txt: str = self.entry
        for s in self.subs():
            txt = s.text(txt)
        return txt

    @typing.override
    def __str__(self) -> str:
        return self.headword

    @functools.cached_property
    def addenda_page(self) -> str | None:
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
        if self.addendum():
            # Addenda do not themselves possess addenda.
            return None
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
