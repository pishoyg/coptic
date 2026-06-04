"""Process coptic.wiki's Digital Version of Crum."""

# TODO: (#503) Many checks and filters in this file will no longer be necessary
# once part of the data (e.g. the entries, the Crum page numbers, or the Marcion
# keys) is fully populated. Revisit this module, replacing this filters with
# assertions where appropriate.

# TODO: (#0) Consider the following simplifications of the substitution rules:
# - Use an actual newline character instead of the "\n" token.
# - The headword notation is simply unnecessary.
import functools
import re
import typing
from collections import abc, defaultdict
from html import escape

import regex

from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import lexical as lex
from utils import ensure, gcp, lang, log, orth

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

# A headword may optionally be wrapped in parentheses to mark it as an
# unattested form. It may also contain internal parentheses that mark
# optional letters (e.g. ϩⲟ(ⲉ)ⲓⲧⲉ). The two alternatives below ensure that
# the outer wrapper, when present, is matched as a balanced pair: either
# both parens fall inside the character class (first alternative), or both
# appear as explicit literals around the auxiliary pattern (second
# alternative). An earlier version had the wrapping parens as independent
# optionals (`\(?...\)?`), where the leading `\(?` could match the opening
# paren while the closing paren got swallowed by the character class
# instead of by the trailing `\)?` — yielding an imbalanced capture.
# NOTE: The pattern remains somewhat permissive, as it allows combinations that
# don't occur in reality.
_HEADWORD_RE_AUX: str = r"-?([ⲁ-ⲱϣ-ϯⳉ \p{Mark}()\[\]]+?)(?:-|⸗|†|\[|\[\.\])?"
_HEADWORD_RE: regex.Pattern[str] = regex.compile(
    rf"{_HEADWORD_RE_AUX}|\({_HEADWORD_RE_AUX}\)",
)


def headword_variants(form: str) -> abc.Generator[str]:
    assert constants.COPTIC_LETTERS_OR_PARENTHESES_RE.fullmatch(form)
    # 1. Handle parentheses that mark unattested forms.
    if form.startswith("(") and form.endswith(")"):
        # Get rid of the surrounding parentheses that mark unattested forms.
        # In such cases, the form is guaranteed not to contain any other markers
        # within it, so we can yield it and return immediately.
        yield form[1:-1]
        return

    # 2. Handle parentheses that mark optional substrings.
    if not constants.OPTIONAL_SUBSTRING_RE.search(form):
        # No optional substrings.
        yield form
        return

    for repl in ["", r"\1"]:
        # Try once with the optional substring removed, and once with it
        # retained.
        # Each time, only substitute the first optional substring, recursing to
        # handle following optional substrings if any are present.
        yield from headword_variants(
            constants.OPTIONAL_SUBSTRING_RE.sub(repl, form, 1),
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


# LANGS lists language names as they appear in the Unicode names of characters
# belonging to the language.
# NOTE: It's important for Greek to precede Coptic, and Hebrew Arabic. Some
# Greek words contain Coptic letters, and Arabic words often use the Hebrew
# geresh.
LANGS: list[str] = [
    "GREEK",
    "COPTIC",
    "ARABIC",
    "HEBREW",
    "SYRIAC",
    "ETHIOPIC",
    "HIEROGLYPH",
    # NOTE: Demotic is not really detectable using a character's Unicode name,
    # but it's included in the list for completion.
    "DEMOTIC",
]

# LANG_CLASS lists names of language classes, where the class name differs from
# the language name.
LANG_CLASS: dict[str, str] = {
    "SYRIAC": "ARAMAIC",
    "ETHIOPIC": "AMHARIC",
    "HIEROGLYPH": "HIEROGLYPHIC",
}

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


OPEN_SUBPARAGRAPH: str = '<span class="subparagraph">'
CLOSE_SUBPARAGRAPH: str = "</span>"
OPEN_PARAGRAPH: str = "<p>"
CLOSE_PARAGRAPH: str = "</p>"

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
    # In some cases, we made the mistake of typing "&amp;" directly, instead of
    # just "&". We ban the token "&amp;amp" to catch this error.
    Substitution("&", "&amp;", text_repl="&", ban=["&amp;amp"]),
    # The asterisk is not a reserved character in modern HTML, so we don't need
    # to use `&ast;`. However, using a plain asterisk risks conflicting with the
    # bold rule below. We therefore leave it up to our linters to replace
    # the occurrences of `&ask;` produced here with a literal asterisk.
    Substitution(r"\\\*", "&ast;", text_repl="*", ban=["*", "\\"]),
    Substitution(
        r"\\t",
        CLOSE_SUBPARAGRAPH + OPEN_SUBPARAGRAPH,
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
        r"\\n",
        CLOSE_SUBPARAGRAPH
        + CLOSE_PARAGRAPH
        + OPEN_PARAGRAPH
        + OPEN_SUBPARAGRAPH,
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
        record: dict[typing.Hashable, typing.Any],
    ) -> None:
        self.keys: list[int] = list(map(int, record["Marcion"].split(" ")))
        assert self.keys
        self.entry: str = record["Entry"]
        # TODO: (#503) Retrieve from the parsed entry. Abandon the "Headword"
        # column.
        self.headword: str = record["Headword"]
        assert self.headword

        # headwords tracks the headwords encountered in the text. In extremely
        # rare cases, there could be multiple, e.g. ϩⲁ, ϩⲟ:
        #  https://remnqymi.com/crum/2096.html
        self._headwords: list[str] = []

        self.crum: lex.Column = lex.Column(record["Crum"])
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

        if len(self.keys) != 1:
            ensure.ensure(
                self.vide,
                self,
                "is non-vide but has several keys:",
                self.keys,
            )

        self.footnotes: int = 0

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
                self,
                "contains invalid text:",
                invalid,
                "in:",
                self.entry,
            )

    def headwords(self) -> list[str]:
        # TODO: (#503) Restore the check below when the data is complete.
        # ensure.ensure(self._headwords, "Headwords for", self,
        # "not populated!")
        return self._headwords

    def headword_variants(self) -> abc.Generator[str]:
        # TODO: (#0) Deduplicate this code. The logic below has a large overlap
        # with `lexicographic_key`, as well as
        # `lexical.Line._normalize_optional_letters`.
        for headword in self.headwords():
            match: regex.Match[str] | None = _HEADWORD_RE.fullmatch(headword)
            assert match
            # Strip all leading and trailing markers.
            headword = match.group(1) or match.group(2)
            # Remove spaces, square brackets, and diacritics.
            headword = headword.replace(" ", "")
            headword = headword.replace("[", "").replace("]", "")
            headword = regex.sub(r"\p{Mark}", "", headword)
            assert headword
            # The headword should now consist of Coptic letters, marks, spaces,
            # and parentheses. Generate variants.
            for variant in headword_variants(headword):
                ensure.ensure(
                    constants.COPTIC_LETTERS_RE.fullmatch(variant),
                    "Invalid headword variant:",
                    variant,
                )
                yield variant

    def subs(self) -> abc.Generator[Substitution]:
        # The headword substitution (which uses triple brackets) must precede
        # the double-bracket substitution.
        yield Substitution(
            # Ensure the headword is preceded by the start of the string
            # (optionally with a single opening parenthesis) or by the
            # separator ']]], ' from a previous headword.
            # This prevents false positives in cases where multiple pieces of
            # Coptic text in the entry contain brackets at the beginning or the
            # end, resulting in triple brackets.
            # Headwords always occur:
            # - Either at the very beginning of the text, occasionally preceded
            # by a single parenthesis (e.g. ϩⲟⲟⲩⲣⲉ on page 737 b [1]).
            # - Following another headword (e.g. ϩⲁ, ϩⲟ on page 635 a [2]).
            #
            # [1] https://remnqymi.com/crum/2321.html
            # [2] https://remnqymi.com/crum/2095.html
            # [2] https://remnqymi.com/crum/2096.html
            r"(?:(?<=^)|(?<=^\()|(?<=]]], ))" + bracketed("(.*?)", 3),
            self.replace_headword,
            ban=["[[[", "]]]"],
        )

        yield from _SUBSTITUTIONS

        yield Substitution(
            r"{([^{}]*)}{{(.*?)}}",
            self.replace_footnote,
            # NOTE: Footnotes are omitted from the text version.
            text_repl="",
            ban=["{", "}"],
        )
        # The substitution for manual labels must follow the substitution for
        # footnotes.
        yield Substitution(
            r"{(.*?)}(?:{(.*?)})?",
            replace_manual,
            ban=["{", "}"],
        )
        yield Substitution(
            "//(.*?)//(.*?)//",
            self.replace_addendum,
            r"\2",
            ban=["//"],
        )

    def replace_addendum(self, match: re.Match[str]) -> str:
        return "".join(self.replace_addendum_aux(match))

    def replace_addendum_aux(self, match: re.Match[str]) -> abc.Generator[str]:
        yield f'<span class="addendum" data-page="{self.addenda_page}">'
        g1, g2 = match.group(1), match.group(2)
        if g1:
            yield f"<del>{g1}</del>"
        if g1 and g2:
            yield " "
        if g2:
            yield f"<ins>{g2}</ins>"
        yield "</span>"

    def replace_headword(self, match: re.Match[str]) -> str:
        headword: str = match.group(1)
        ensure.ensure(
            _HEADWORD_RE.fullmatch(headword),
            "Invalid headword:",
            headword,
        )
        self._headwords.append(headword)
        return f'<span class="headword coptic">{headword}</span>'

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

    @functools.cached_property
    def html(self) -> str:
        # NOTE: Each call to this method populates some fields, such as
        # headwords and footnotes. Calling it multiple times would be an error.
        # Caching should prevent multiple executions on the same object.
        assert not self.footnotes
        assert not self._headwords
        html: str = "".join(self._html_aux())
        for token in self._banned():
            ensure.ensure(
                token not in html,
                "Banned token",
                token,
                "found in entry",
                self,
                "output:",
                html,
            )
        return html

    def replace_footnote(self, match: re.Match[str]) -> str:
        self.footnotes += 1
        # The footnote content is embedded in a `data-footnote` attribute on
        # the `.footnoted` wrapper. The rest is taken care of by JavaScript.
        # The inner `.mark` element keeps the `[N]` indicator visible to flag
        # the presence of a footnote.
        # We opt for inserting it in the HTML, instead of in TypeScript, to
        # fulfill the condition that post-enrichment text must be identical to
        # initial text. In other words, while TypeScript can enrich the text
        # through tooltips, styling, etc., it's not allowed to add any text that
        # wasn't there in the first place.
        attr: str = escape(match.group(2), quote=True)
        return (
            f'<span class="footnoted" data-footnote="{attr}">'
            + match.group(1)
            + '<span class="mark">'
            + f"[{self.footnotes}]"
            + "</span>"
            + "</span>"
        )

    def _html_aux(self) -> abc.Generator[str]:
        classes: list[str] = ["entry"]
        if self.vide:
            classes.append("vide")
        yield f'<div class="{" ".join(classes)}">'
        yield OPEN_PARAGRAPH
        yield OPEN_SUBPARAGRAPH

        raw: str = self.entry
        for s in self.subs():
            raw = s.html(raw)
        yield raw

        yield CLOSE_SUBPARAGRAPH
        yield CLOSE_PARAGRAPH
        yield "</div>"

    @functools.cached_property
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
            and Corrections section that contains addenda for this entry. If
            this page lies outside the range of pages for which addenda are
            available, return None.

            NOTE: The return value is often inaccurate. In particular:
            - If addenda for a given column start on a column and spill over to
              the following one, the first column will be returned. For example,
              the addenda for 100b start on xviib and spill over to xviiia.
              For all entries on 100b, the addenda page will be reported as
              xviib.
            - If a Crum entry spans several columns, addenda will be inferred
              based on the first column. For example, ϯ spans 392a to 396a, but
              the addenda column will be inferred based on 392a.

            The blast radius is extremely small because the list of addenda is
            quite compact anyway.
            TODO: (#0) Contemplate a more precise implementation.
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


@functools.cache
def wikis() -> list[Wiki]:
    records: list[dict[typing.Hashable, typing.Any]] = gcp.tsv_spreadsheet(
        SHEET_TSV_URL,
    ).to_dict(orient="records")
    return list(map(Wiki, records))


@functools.cache
def by_marcion_key() -> dict[str, list[Wiki]]:
    by_key: dict[str, list[Wiki]] = defaultdict(list)
    for w in wikis():
        for key in w.keys:
            by_key[str(key)].append(w)
    return by_key


class Column:
    """Column represents a group of Wikis that occur on the same column."""

    def __init__(self, crum: lex.Column, ws: abc.Iterable[Wiki]) -> None:
        self.crum: lex.Column = crum
        self.wikis: list[Wiki] = list(ws)

    def html(self) -> str:
        return "".join(self.html_aux())

    def html_aux(self) -> abc.Generator[str]:
        yield '<div class="folio">'
        yield '<span class="crum-page">'
        yield str(self.crum)
        yield "</span>"
        html: str = "".join(w.html for w in self.wikis if w.complete)
        ensure.ensure(
            html,
            "Generating HTML for a page without any complete Wikis! Page:",
            self.crum,
            "Wikis:",
            list(map(str, self.wikis)),
        )
        yield html
        yield "</div>"
