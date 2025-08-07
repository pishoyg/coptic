"""
Nomenclature:

A line in Marcion's dictionary database consists of words.
A word, represented by the class `lexical.structured_word` defined below,
consists of:
  - Dialects that this word belongs to.
  - Spellings that this word can take (usually 1).
  - Types that this word is (usually none).
  - References for the word (usually none).

For example, the following line is Marcion's representation of the word `ⲛⲁⲓ`
from page 216b from Crum's dictionary:
    (S) na,naa (S,A,sA) nae (S,B) nai (S) naeih \
    (F) nei,neei (S,A,B,F) ^na- *^[naHht, naht]^*

This line has several words, namely:
  - (S) na,naa                        # 1 dialect, 2 spellings
  - (S,A,sA) nae                      # 3 dialects, 1 spelling
  - (S,B) nai                         # 2 dialects, 1 spelling
  - (S) naeih                         # 1 dialect, 1 spelling
  - (F) nei,neei                      # 1 dialect, 2 spellings
  - (S,A,B,F) ^na- *^[naHht, naht]^*  # 4 dialects, 1 spelling, 1 type
    The type is "^", which means "conjunctive participle".

Grammar:
  - The parser assumes the following grammar:
    NOTE: Please take this with a grain of salt. The parser wasn't implemented
    strictly to parse entries that match this grammar. A lot of flexibility was
    allowed.
  <word> = <dialected_word>+ | <undialected_word>
  <dialected_word> = <dialect_list> <undialected_word>
  <dialect_list> = (<dialect> [, <dialect>]*)
  <undialected_word> = <spelling> [, <spelling>]*
  <spelling> = [<coptic> | <english> | <type>]+ [<reference>]*

Remarks about the parsing:
  The strings "$^" and "^$" are used to represent the parentheses "(" and ")"
  in Marcion's encoding of Crum.
  In Crum, the parentheses had the roles in Coptic forms:
    - To represent optional letters.
      For example, the word "horses" in Bohairic can be written as either
      "ⲉϩⲑⲱⲣ", "ϩⲑⲱⲣ", or "ϩⲑⲟⲣ". This is represented by "(ⲉ)ϩⲑⲱⲣ,ϩⲑⲟⲣ".
    - To represent "deduced" word forms (fewer use cases).
      For example, the word "ⲗⲟⲕⲉⲙ" (qualitative form) occurs in Coptic
      literature, with the meaning "be moist, sodden", but the root form never
      does. Crum assumes that it's like "ⲗⲱⲕⲉⲙ" and represents that by wriring
      "(ⲗⲱⲕⲉⲙ), ⲗⲟⲕⲉⲙ".
    The differentiation between the two use cases can be done by checking
    whether the parentheses cover the entire word, or a subpart of it.
"""

import functools
import re
import typing
from collections import abc

from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import word as lexical
from utils import log

HREF_START = "*^<a href="


def _apply_substitutions(
    line: str,
    subs: (
        list[tuple[re.Pattern[str], str]]
        | list[tuple[str, str]]
        | list[tuple[str, lexical.Type]]
        | list[tuple[re.Pattern[str] | str, str]]
    ),
    use_coptic_symbol: bool = False,
) -> str:
    for pair in subs:
        p0 = pair[0]
        p1 = pair[1]
        if isinstance(p1, lexical.Type):
            p1 = p1.coptic_symbol() if use_coptic_symbol else p1.marcion()
        assert isinstance(p1, str)
        if isinstance(p0, re.Pattern):
            line = p0.sub(p1, line)
        else:
            assert isinstance(p0, str)
            line = line.replace(p0, p1)
    return line


def _munch(text: str, regex: re.Pattern[str]) -> tuple[str, str]:
    # Munch the prefix of `text` which matches `regex`, and return both parts.
    m = regex.match(text)
    if not m:
        return "", text

    i, j = m.span()
    assert i == 0
    return text[:j], text[j:]


def _chop(text: str, regex: re.Pattern[str]) -> tuple[str, str, str]:
    # Extract a substring matching the given regex from the given text. Return
    # all three parts.
    # The substring does NOT have to be a prefix.
    # Return all three parts.
    s = regex.search(text)
    if not s:
        return text, "", ""
    i, j = s.span()
    return text[:i], text[i:j], text[j:]


def parse_word_cell(
    entry: str,
    root_type: lexical.Type,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
    normalize_optional: bool,
    normalize_assumed: bool,
) -> list[lexical.Word]:
    words: list[lexical.Word] = list(
        parse_word_cell_aux(
            entry,
            root_type,
            strict,
            detach_types,
            use_coptic_symbol,
            normalize_optional,
            normalize_assumed,
        ),
    )
    # Any entry that has multiple lines must be dialected.
    if len(words) > 1:
        assert all(w.dialects for w in words)

    return words


def parse_word_cell_aux(
    entry: str,
    root_type: lexical.Type,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
    normalize_optional: bool,
    normalize_assumed: bool,
) -> abc.Generator[lexical.Word]:
    if not entry:
        return

    # TODO: (#204) Fix the quotation mark issue at the origin.
    # Right now, lines with references have misplaced double quotes, which we
    # fix manually below.
    if HREF_START in entry:
        assert entry.endswith('"')
        entry = entry[:-1]
        entry = entry.replace(HREF_START, HREF_START + '"')
        entry = entry.replace(HREF_START + '""', HREF_START + '"')

    lines: list[str] = entry.split("\n")
    del entry

    for line in lines:
        # Parse the dialects.
        d, line = _munch_dialects(line)
        # Parse the spellings, types, and references.
        s, t, r = _parse_spellings_types_and_references(
            line,
            detach_types,
            use_coptic_symbol,
        )
        # If this entry is undialected, try to infer the dialects from the
        # spellings. We only do this for roots, but not derivations – hence the
        # check for `strict`.
        if not d and strict:
            # Undialected and Ⳉ, it's Akhmimic!
            if all("ⳉ" in spelling for spelling in s):
                d = ["A"]
            # Undialected and ϧ, it's Bohairic!
            if all("ϧ" in spelling for spelling in s):
                d = ["B"]

        yield lexical.Word(
            d,
            s,
            t,
            r,
            root_type,
            normalize_optional=normalize_optional,
            normalize_assumed=normalize_assumed,
        )


def _parse_spellings_types_and_references(
    line: str,
    detach_types: bool,
    use_coptic_symbol: bool,
) -> tuple[list[str], list[lexical.Type], list[str]]:
    ss: list[str] = []
    tt: list[lexical.Type] = []
    rr: list[str] = []

    while line:
        spelling_and_types, reference, line = _chop(
            line,
            constants.REFERENCE_RE,
        )
        if reference:
            rr.extend(_parse_reference(reference))
        if spelling_and_types:
            s, t = _parse_spellings_and_types(
                spelling_and_types,
                detach_types,
                use_coptic_symbol,
            )
            ss.extend(s)
            tt.extend(t)

    return ss, tt, rr


def _parse_spellings_and_types(
    line: str,
    detach_types: bool,
    use_coptic_symbol: bool,
) -> tuple[list[str], list[lexical.Type]]:
    # This makes the assumption that references have been removed.
    types: list[lexical.Type] = []

    line = _apply_substitutions(
        line,
        constants.PARENTHESES_AND_BRACKETS,
        use_coptic_symbol,
    )

    line, line_no_english = _parse_coptic(line)
    _analyze_no_english(line_no_english)
    del line_no_english

    line = _apply_substitutions(
        line,
        constants.SPELLING_ANNOTATIONS_1,
        use_coptic_symbol,
    )

    if detach_types:
        cur, line = _pick_up_detached_types(line, constants.DETACHED_TYPES_1)
        types.extend(cur)
    else:
        line = _apply_substitutions(
            line,
            constants.DETACHED_TYPES_1,
            use_coptic_symbol,
        )

    line = _apply_substitutions(
        line,
        constants.SPELLING_ANNOTATIONS_2,
        use_coptic_symbol,
    )

    if detach_types:
        cur, line = _pick_up_detached_types(line, constants.DETACHED_TYPES_2)
        types.extend(cur)
    else:
        line = _apply_substitutions(
            line,
            constants.DETACHED_TYPES_2,
            use_coptic_symbol,
        )

    spellings: list[str] = constants.COMMA_NOT_BETWEEN_PARENTHESES_RE.split(
        line,
    )
    # TODO: (#0) Ideally, you should never strip the text.
    spellings = list(filter(None, map(str.strip, spellings)))

    return spellings, types


def _analyze_no_english(line_no_english: str) -> None:
    # NOTE: The body of this method is largely similar to
    # _parse_spellings_and_types.
    # For the sake of rigor, investigate the content of the no-English subset.
    line_no_english = _apply_substitutions(
        line_no_english,
        constants.SPELLING_ANNOTATIONS_1,
        use_coptic_symbol=True,
    )
    _, line_no_english = _pick_up_detached_types(
        line_no_english,
        constants.DETACHED_TYPES_1,
    )
    line_no_english = _apply_substitutions(
        line_no_english,
        constants.SPELLING_ANNOTATIONS_2,
        use_coptic_symbol=True,
    )
    _, line_no_english = _pick_up_detached_types(
        line_no_english,
        constants.DETACHED_TYPES_2,
    )
    line_no_english = line_no_english.replace(
        "(?)",
        "",
    )  # TODO: (#338) Ugly! :/
    spellings = constants.COMMA_NOT_BETWEEN_PARENTHESES_RE.split(
        line_no_english,
    )
    for s in spellings:
        for c in s:
            valid = (
                c in constants.LETTERS
                or c in constants.ACCEPTED_UNKNOWN_CHARS_2
            )
            if not valid:
                log.error(s)


def _pick_up_detached_types(
    line: str,
    detached_types: list[tuple[str, lexical.Type]],
) -> tuple[list[lexical.Type], str]:
    t: list[lexical.Type] = []
    for p in detached_types:
        if p[0] in line:
            line = line.replace(p[0], "")
            t.append(p[1])
    return t, line


def _parse_coptic(line: str) -> tuple[str, str]:
    """Parse one line of ASCII-encoded Coptic.

    Args:
        line: ASCII-encoded Coptic. It is possible for the text to contain
            English text within it, and for the English text to contain Coptic
            text within.

    Returns:
        A tuple, one representing the parsed Coptic (with the English comments
        included), and one representing the parsed Coptic (with the English
        removed).
    """
    out: list[str] = []
    out_no_english: list[str] = []
    while line:
        copt, eng, line = _chop(line, constants.ENGLISH_WITHIN_COPTIC_RE)
        if copt:
            copt = _ascii_to_unicode(copt)
            out.append(copt)
            out_no_english.append(copt)
        if eng:
            eng = _convert_coptic_within_english(eng)
            out.append(eng)
    return "".join(out), "".join(out_no_english)


def _convert_coptic_within_english(line: str) -> str:
    return "".join(_convert_coptic_within_english_aux(line))


def _convert_coptic_within_english_aux(line: str) -> abc.Generator[str]:
    while line:
        eng, copt, line = _chop(line, constants.COPTIC_WITHIN_ENGLISH_RE)
        yield eng
        if not copt:
            assert not line
            return
        assert copt.startswith("[") and copt.endswith("]")
        copt = copt[1:-1]
        assert copt
        copt = _ascii_to_unicode(copt, strict=False)
        copt = _apply_substitutions(
            copt,
            constants.COPTIC_WITHIN_ENGLISH_POSTPROCESSING,
        )
        yield copt


def parse_english_cell(line: str) -> str:
    return _apply_substitutions(line, constants.ENGLISH_PROCESSING)


@functools.total_ordering
class CrumPage:
    """A page number in Crum's dictionary."""

    num: int
    col: str

    def __init__(self, raw: str):
        if not raw:
            self.num = 0
            self.col = ""
            return
        match = constants.CRUM_RE.match(raw)
        assert match
        assert len(match.groups()) == 2
        self.num = int(match.groups()[0])
        self.col = match.groups()[1]
        assert self.num >= 0 and self.num <= constants.CRUM_LAST_PAGE_NUM
        assert self.col in {"a", "b"}

    def parts(self) -> tuple[int, str]:
        return self.num, self.col

    @typing.override
    def __eq__(self, other: object) -> bool:
        if isinstance(other, CrumPage):
            return self.parts() == other.parts()
        return NotImplemented

    def __lt__(self, other: typing.Self) -> bool:
        return self.parts() < other.parts()

    def real(self) -> bool:
        return any(self.parts())

    def string(self) -> str:
        assert all(self.parts())
        return "".join(str(x) for x in self.parts())


def _ascii_to_unicode(txt: str, strict: bool = True) -> str:
    return "".join(_ascii_to_unicode_aux(txt, strict))


def _ascii_to_unicode_aux(txt: str, verify: bool = True) -> abc.Generator[str]:
    for c in txt:
        if verify:
            assert (
                c in constants.LETTER_ENCODING
                or c in constants.ACCEPTED_UNKNOWN_CHARS
            )
        yield constants.LETTER_ENCODING.get(c, c)


def _parse_reference(line: str) -> abc.Generator[str]:
    """Parse a reference.

    Args:
        line: A string representing a single (not nested nor concatenated)
            reference, whose boundaries have been removed.
            A reference is an <a></a> HTML tag with some text as the body, and
            an 'href' property that has (one or more) of the following format:
                "ext <name>;<id>;<chapter>;<verse>;<text>"
            The 'href' contains most of the information. The body can contain
            something, and the tag could optionally be followed by some text.

    Yields:
        Strings, each representing an encoded representation of the one of the
        references.
    """

    match = constants.REFERENCE_RE.match(line)
    assert match, line
    assert len(match.groups()) == 3, line
    line = match.group(1)
    body = match.group(2)
    note = match.group(3)
    parts = line.split(";")
    assert not (len(parts) % 5), parts
    for i in range(0, len(parts), 5):
        parts[i + 4], _ = _parse_coptic(parts[i + 4])
        yield "; ".join(filter(None, parts[i : i + 5] + [body, note]))


def _munch_dialects(
    line: str,
) -> tuple[list[str], str]:
    match, line = _munch(line, constants.DIALECTS_RE)
    if not match:
        return [], line
    assert match, line
    assert match[0] == "(" and match[-1] == ")"
    return match[1:-1].split(","), line


def lighten_greek(line: str) -> str:
    return constants.PARSED_GREEK_WITHIN_ENGLISH_RE.sub(lighten(r"\1"), line)


def lighten(line: str) -> str:
    return f'<span style="opacity:0.7">{line}</span>'
