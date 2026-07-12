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
import typing
from collections import abc, defaultdict
from html import escape

import regex

from dictionary import cls as dict_cls
from dictionary.marcion_sourceforge_net import cls, constants
from dictionary.marcion_sourceforge_net import lexical as lex
from utils import ensure, gcp, lang, log, orth

# HTML data attribute names emitted in the Wiki HTML, and consumed by both the
# TypeScript front-end and the Xooxle indexer.
DATA_FOOTNOTE: str = "data-footnote"
DATA_KEY: str = "data-key"
DATA_PAGE: str = "data-page"

# TODO: (#0) Move to `utils/paths.py`.
SHEET_TSV_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1lhjcnkHS-pA3p5Vys-6ohKu7Y4ZCJ5NO/export?format=tsv"
)

COMMA_OR_SPACE: regex.Pattern[str] = regex.compile(r"[ ,]")

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

# Matches an opening tag immediately followed by a space, which signals stray
# leading whitespace inside an element.
_SPACE_AFTER_TAG_RE: regex.Pattern[str] = regex.compile(
    r"<(?!/)[^>]+> .*?</[^>]+>",
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
        repl: str | typing.Callable[[regex.Match[str]], str],
        ban: list[str] | None = None,
    ):
        """Initializes a Substitution object.

        Args:
            pattern: The regular expression pattern to search for.
            repl: The replacement string.
            ban: A list of tokens that are used for substitution, and
                can't be present in the HTML post-processing. Use this optional
                field to verify that all substitutions are well-formed.
        """
        self.pattern: regex.Pattern[str] = regex.compile(pattern)
        self.repl: str | typing.Callable[[regex.Match[str]], str] = repl
        self.ban: list[str] = ban or []

    def html(self, raw: str) -> str:
        return self.pattern.sub(self.repl, raw)


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


Language: typing.TypeAlias = typing.Literal[
    "GREEK",
    "COPTIC",
    "ARABIC",
    "HEBREW",
    "SYRIAC",
    "ETHIOPIC",
    "HIEROGLYPH",
    "DEMOTIC",
]

# LANGS maps language names, as they appear in the Unicode names of characters
# belonging to the language, to a tuple containing:
# - The HTML class used for the language.
# - A validation regular expression for text marked as belonging to this
# language.
#
# Each validation pattern accepts a sequence of tokens, where a token is a
# single allowed character optionally followed by combining marks (`\p{M}*`).
# The allowed characters are the letters of the relevant Unicode script, plus
# the punctuation and separators that actually occur in that language's text.
# TODO: (#0) You can simplify the structure by deduplicating `regex.compile` and
# `(?:...)+`, retaining only the core of the regex in each entry.
LANGS: dict[Language, tuple[str, regex.Pattern[str]]] = {
    # NOTE: Since Greek can contain Coptic, it's important for the Greek to
    # precede Coptic in the list, so that a text will be tested for being Greek
    # first.
    "GREEK": (
        cls.GREEK,
        regex.compile(
            # TODO: (#503) Ideally, the comma should be removed.
            r"(?:[\p{Greek}\p{Coptic} '(),\-./?\[\]·—…⸝ʹ]\p{M}*)+",
        ),
    ),
    "COPTIC": (
        cls.COPTIC,
        # TODO: (#503) Ideally, the comma should be removed. A Coptic block of
        # comma-separated words should instead be represented as a
        # comma-separated list of one-word Coptic blocks.
        regex.compile(
            r"(?:[\p{Coptic} Ꞩ(),\-./:?\[\]·―†…⸗⸪]\p{M}*)+",
        ),
    ),
    "ARABIC": (
        cls.ARABIC,
        regex.compile(r"(?:[\p{Arabic} ()?\-.\]…،]\p{M}*)+"),
    ),
    "HEBREW": (cls.HEBREW, regex.compile(r"(?:[\p{Hebrew} ]\p{M}*)+")),
    "SYRIAC": (cls.ARAMAIC, regex.compile(r"(?:[\p{Syriac} …]\p{M}*)+")),
    "ETHIOPIC": (cls.AMHARIC, regex.compile(r"\p{Ethiopic}+")),
    "HIEROGLYPH": (
        cls.HIEROGLYPHIC,
        regex.compile(r"\p{Egyptian_Hieroglyphs}+"),
    ),
    # NOTE: Demotic is not detectable using a character's Unicode name.
    "DEMOTIC": (
        cls.DEMOTIC,
        regex.compile(r"(?:\p{Latin}\p{M}*|[ꜣꜥʾʿ '\-.])+"),
    ),
}


def _language(text: str) -> Language:
    # We exclude diacritics from language determination because Coptic uses
    # Greek diacritics in the expression ⲇͅⲇͅ - which is the abbreviation for
    # the Greek phrase δεῖνα δεῖνος, translating to "so-and-so" or "NN".
    # The diacritic used is Combining Greek Ypogegrammeni (U+0345), and we don't
    # want use of this diacritic to cause the expression to be evaluated as
    # Greek.
    text = orth.clean_diacritics(text)
    for language in LANGS:
        if lang.has_lang(language, text):
            return language
    return "DEMOTIC"


def replace_bracketed(match: regex.Match[str]) -> str:
    text: str = match.group(1)
    del match

    if text == "·":
        # This special case happens to exist in the Wiki data. It likely
        # shouldn't be classified as belonging to one of the languages, so we
        # simply return the text itself.
        return text

    language: Language = _language(text)

    klass: str
    expression: regex.Pattern[str]
    klass, expression = LANGS[language]

    ensure.ensure(
        expression.fullmatch(
            # Greek and Coptic are allowed to have superscripts and stacks
            # within.
            _detag(text) if language in ["GREEK", "COPTIC"] else text,
        ),
        "invalid",
        language,
        "text:",
        repr(text),
    )

    return f'<span class="{klass}">{text}</span>'


_SIGLA: list[str] = [
    "S",  # Sahidic
    "Sa",  # Sahidic with Akhmimic tendency
    "Sf",  # Sahidic with Fayyumic tendency
    "A",  # Akhmimic
    "A2",  # Lycopolitan (Subakhmimic)
    "B",  # Bohairic
    "F",  # Fayyumic
    "Fb",  # Fayyumic with Bohairic tendency
    "O",  # Old Coptic
    # While not explicitly mentioned in Crum's intro, there are occurrences
    # of non-standard dialect sigla in the dictionary.
    # For each of these, we add a non-standard dialect entry in TypeScript,
    # so they can render properly.
    "Of",
    "Saf",
    "Sb",
    "Bf",
]
_CANONICAL: dict[str, str] = {"A2": "L"}


def replace_dialect(match: regex.Match[str]) -> str:
    siglum: str = "".join(g or "" for g in match.group(1, 2))
    ensure.ensure(siglum in _SIGLA, "unknown siglum:", siglum)
    klass: str = _CANONICAL.get(siglum, siglum)
    return rf'<span class="{dict_cls.DIALECT} {klass}">{siglum}</span>'


def replace_manual(match: regex.Match[str]) -> str:
    text, key = match.group(1, 2)
    if key is None:
        return rf'<span class="{cls.MANUAL}">{text}</span>'
    return rf'<span class="{cls.MANUAL}" {DATA_KEY}="{key}">{text}</span>'


OPEN_SUBPARAGRAPH: str = f'<span class="{cls.SUBPARAGRAPH}">'
CLOSE_SUBPARAGRAPH: str = "</span>"
OPEN_PARAGRAPH: str = "<p>"
CLOSE_PARAGRAPH: str = "</p>"

# Footnotes and addenda both render a footnote-like `[N]` indicator, numbered
# sequentially across the entry in document order. A mark's number depends on
# how many marks precede it in the final text, which isn't known while the
# substitution passes run (footnotes and addenda are numbered in separate
# passes). So we emit this placeholder and assign the numbers in a single pass
# once the entry is assembled.
# A Private Use Area code point, guaranteed not to occur in real entry text.
_MARK_PLACEHOLDER: str = "\uf8ff"
_MARK_PLACEHOLDER_RE: regex.Pattern[str] = regex.compile(
    regex.escape(_MARK_PLACEHOLDER),
)
_MARK: str = f'<span class="{cls.MARK}">{_MARK_PLACEHOLDER}</span>'

# Coptic Wiki substitutions:
#
# NOTE: This is based on a snapshot of the following file, taken on
# September 17, 2025:
# pylint: disable-next=line-too-long
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
    Substitution("&", "&amp;", ban=["&amp;amp"]),
    # The asterisk is not a reserved character in modern HTML, so we don't need
    # to use `&ast;`. However, using a plain asterisk risks conflicting with the
    # bold rule below. We therefore leave it up to our linters to replace
    # the occurrences of `&ask;` produced here with a literal asterisk.
    Substitution(r"\\\*", "&ast;", ban=["*", "\\"]),
    Substitution(r"\\t", CLOSE_SUBPARAGRAPH + OPEN_SUBPARAGRAPH, ban=["\\"]),
    Substitution(
        r"__(.+?)__",
        rf'<span class="{cls.GLOSS}">\1</span>',
        ban=["_"],
    ),
    Substitution(
        # Bold text is simply bullets. We prefer using an explicit `bullet`
        # class to mark them, instead of relying on `<b>`.
        # We can use a stricter regex that only allows alphabetical characters
        # (optionally followed by a period).
        r"\*([a-zA-Z]+?\.?)\*",
        rf'<span class="{cls.BULLET}">\1</span>',
        ban=["*"],
    ),
    Substitution(r"_(.+?)_", r"<i>\1</i>", ban=["_"]),
    Substitution(
        bracketed(r"([SABFO])(?:\^(a|f|b|af|2))?"),
        replace_dialect,
        ban=["[[", "]]", "^"],
    ),
    Substitution(
        r"(\p{Letter})\^\^(\p{Letter})",
        rf'<span class="{cls.STACK}">'
        rf'<span class="{cls.STACK_BOTTOM}">\1</span>'
        rf'<span class="{cls.STACK_TOP}">\2</span>'
        r"</span>",
        ban=["^^"],
    ),
    Substitution(r"\^([-–—\w\p{Letter}]+)", r"<sup>\1</sup>", ban=["^"]),
    Substitution(
        r"\\n",
        CLOSE_SUBPARAGRAPH
        + CLOSE_PARAGRAPH
        + OPEN_PARAGRAPH
        + OPEN_SUBPARAGRAPH,
        ban=["\\"],
    ),
    Substitution(bracketed(r"(.*?)"), replace_bracketed, ban=["[[", "]]"]),
]


def _detag(text: str) -> str:
    for tag in [
        "<sup>",
        "</sup>",
        f'<span class="{cls.STACK}">',
        f'<span class="{cls.STACK_TOP}">',
        f'<span class="{cls.STACK_BOTTOM}">',
        "</span>",
    ]:
        text = text.replace(tag, "")
    return text


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
        invalid: str = RAW_RE.sub(" ", self.entry)
        invalid = ", ".join(invalid.split())
        ensure.ensure(
            not invalid,
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
        yield Substitution(
            # Four square brackets mark special-font (old) Coptic.
            bracketed("(.*?)", 4),
            r'<span class="old coptic">\1</span>',
            ["[[[[", "]]]]"],
        )
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
            ban=["//"],
        )

    def replace_addendum(self, match: regex.Match[str]) -> str:
        return "".join(self.replace_addendum_aux(match))

    def replace_addendum_aux(
        self,
        match: regex.Match[str],
    ) -> abc.Generator[str]:
        yield f'<span class="{cls.ADDENDUM}" {DATA_PAGE}="{self.addenda_page}">'
        g1, g2 = match.group(1), match.group(2)
        if g1:
            yield f"<del>{g1}</del>"
        if g1 and g2:
            yield " "
        if g2:
            yield f"<ins>{g2}</ins>"
        # Append a footnote-like `[N]` indicator, mirroring `replace_footnote`.
        yield _MARK
        yield "</span>"

    def replace_headword(self, match: regex.Match[str]) -> str:
        headword: str = match.group(1)
        ensure.ensure(
            _HEADWORD_RE.fullmatch(headword),
            "Invalid headword:",
            headword,
        )
        self._headwords.append(headword)
        return f'<span class="{cls.HEADWORD} {cls.COPTIC}">{headword}</span>'

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
        # headwords. Calling it multiple times would be an error. Caching
        # should prevent multiple executions on the same object.
        assert not self._headwords
        html: str = self._number_marks("".join(self._html_aux()))
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
        # TODO: (#756) This check belongs in a shared package.
        invalid_tags: list[str] = _SPACE_AFTER_TAG_RE.findall(html)
        ensure.ensure(
            not invalid_tags,
            self,
            "contains an opening tag immediately followed by a space:",
            invalid_tags,
        )
        return html

    @staticmethod
    def _number_marks(html: str) -> str:
        """Replace each mark placeholder with a sequential `[N]` indicator.

        Footnotes and addenda share a single numbering sequence, assigned in
        document order once the entry's HTML is fully assembled.

        Args:
            html: HTML potentially containing mark placeholders.

        Returns:
            HTML with mark placeholders replaced appropriately.
        """
        counter = itertools.count(1)
        return _MARK_PLACEHOLDER_RE.sub(lambda _: f"[{next(counter)}]", html)

    def replace_footnote(self, match: regex.Match[str]) -> str:
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
            f'<span class="{cls.FOOTNOTED}" {DATA_FOOTNOTE}="{attr}">'
            + match.group(1)
            + _MARK
            + "</span>"
        )

    def _html_aux(self) -> abc.Generator[str]:
        classes: list[str] = [cls.ENTRY]
        if self.vide:
            classes.append(cls.VIDE)
        yield f'<div class="{" ".join(classes)}">'
        yield OPEN_PARAGRAPH
        yield OPEN_SUBPARAGRAPH

        raw: str = self.entry
        assert _MARK_PLACEHOLDER not in raw
        for s in self.subs():
            raw = s.html(raw)
        yield raw

        yield CLOSE_SUBPARAGRAPH
        yield CLOSE_PARAGRAPH
        yield "</div>"

    @typing.override
    def __str__(self) -> str:
        return self.headword

    @functools.cached_property
    def addenda_page(self) -> str:
        """
        Returns:
            A string representing the page number and column in the Additions
            and Corrections section that contains addenda for this entry.

            NOTE: The return value is often inaccurate. In particular:
            - If addenda for a given column start on a column and spill over to
              the following one, the first column will be returned. For example,
              the addenda for '100b' start on 'xviib' and spill over to
              'xviiia'. For all entries on '100b', the addenda page will be
              reported as 'xviib'.
            - If a Crum entry spans several columns, addenda will be inferred
              based on the first column. For example, ϯ spans '392a' to '396a',
              but the addenda column will be inferred based on '392a'.

            The blast radius is extremely small because the list of addenda is
            quite compact anyway.
            TODO: (#0) Contemplate a more precise implementation.
        """
        # We could binary-search, but the list only contains 20 elements, so
        # binary search is not worth it.
        for col in constants.COLUMN_RANGES:
            if self.crum <= col.end:
                return col.name
        log.fatal(self, "has no addenda page!")


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

    def html_aux(self) -> abc.Generator[str]:
        yield f'<div class="{cls.FOLIO}">'
        yield f'<span class="{cls.CRUM_PAGE}">'
        yield str(self.crum)
        yield "</span>"
        ensure.ensure(
            any(w.complete for w in self.wikis),
            "Generating HTML for a page without any complete Wikis! Page:",
            self.crum,
            "Wikis:",
            list(map(str, self.wikis)),
        )
        for w in self.wikis:
            if not w.complete:
                continue
            yield w.html
        yield "</div>"
