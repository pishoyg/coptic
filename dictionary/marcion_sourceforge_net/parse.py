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
    ),
    use_coptic_symbol: bool,
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


def _munch(text: str, regex: re.Pattern[str], strict: bool) -> tuple[str, str]:
    # Munch the prefix of `text` which matches `regex`, and return both parts.
    m = regex.match(text)
    if strict:
        assert m
    elif not m:
        return "", text

    i, j = m.span()
    assert i == 0
    return text[:j], text[j:].strip()


def _chop(
    text: str,
    regex: re.Pattern[str],
    strict: bool,
    strip_ends: bool,
) -> tuple[str, str, str]:
    # Extract a substring matching the given regex from the given text. Return
    # all three parts.
    # The substring does NOT have to be a prefix.
    # Return all three parts.
    s = regex.search(text)
    if strict:
        assert s
    elif not s:
        return text, "", ""
    i, j = s.span()
    left, mid, right = text[:i], text[i:j], text[j:]
    if strip_ends:
        left, right = left.strip(), right.strip()
    return left, mid, right


def parse_quality_cell(q: str) -> str:
    return constants.QUALITY_ENCODING[int(q)]


def parse_type_cell(t: str) -> lexical.Type:
    return constants.TYPE_ENCODING[int(t)]


def parse_word_cell(
    line: str,
    root_type: lexical.Type,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
    normalize_optional: bool,
    normalize_assumed: bool,
) -> list[lexical.Word]:
    line = line.strip()
    # Replace the non-breaking space with a unicode space.
    line = line.replace("\xa0", " ")
    # TODO: Fix the quotation mark issue at the origin.
    # Right now, lines with references have misplaced double quotes, which we
    # fix manually below.
    if HREF_START in line:
        assert line.endswith('"')
        line = line[:-1]
        line = line.replace(HREF_START, HREF_START + '"')
        line = line.replace(HREF_START + '""', HREF_START + '"')

    words: list[lexical.Word] = []
    if strict and not constants.DIALECTS_RE.search(line):
        d = []
        s, t, r, line = _munch_and_parse_spellings_types_and_references(
            line,
            strict,
            detach_types,
            use_coptic_symbol,
        )
        # In strict mode, an undialected entry exists on its own.
        assert not line
        # Undialected and Ⳉ, it's Akhmimic!
        if any("ⳉ" in spelling for spelling in s):
            d = ["A"]
        # Undialected and ϧ, it's Bohairic!
        if any("ϧ" in spelling for spelling in s):
            d = ["B"]
        return [
            lexical.Word(
                d,
                s,
                t,
                r,
                root_type,
                normalize_optional=normalize_optional,
                normalize_assumed=normalize_assumed,
            ),
        ]

    while line:
        # Parse the dialects.
        d, line = _munch_and_parse_dialects(line, strict)
        # Parse the spellings, types, and references.
        s, t, r, line = _munch_and_parse_spellings_types_and_references(
            line,
            strict,
            detach_types,
            use_coptic_symbol,
        )
        words.append(
            lexical.Word(
                d,
                s,
                t,
                r,
                root_type,
                normalize_optional=normalize_optional,
                normalize_assumed=normalize_assumed,
            ),
        )

    return words


def _munch_and_parse_spellings_types_and_references(
    line: str,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
) -> tuple[list[str], list[lexical.Type], list[str], str]:
    match, line = _munch(line, constants.SPELLINGS_TYPES_REFERENCES_RE, strict)

    ss: list[str] = []
    tt: list[lexical.Type] = []
    rr: list[str] = []

    while match:
        spelling_and_types, reference, match = _chop(
            match,
            constants.REFERENCE_RE,
            strict=False,
            strip_ends=True,
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

    return ss, tt, rr, line


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
    spellings = list(map(clean, spellings))

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
    line_no_english = line_no_english.replace("(?)", "")  # TODO: Ugly! :/
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
    return t, line.strip()


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
        copt, eng, line = _chop(
            line,
            constants.ENGLISH_WITHIN_COPTIC_RE,
            strict=False,
            strip_ends=True,
        )
        if copt:
            copt = _ascii_to_unicode(copt)
            out.append(copt)
            out_no_english.append(copt)
        if eng:
            eng = _parse_english(eng)
            out.append(eng)
    return clean(" ".join(out)), clean(" ".join(out_no_english))


def _parse_english(line: str) -> str:
    out: list[str] = []
    while line:
        eng, copt, line = _chop(
            line,
            constants.COPTIC_WITHIN_ENGLISH_RE,
            strict=False,
            strip_ends=True,
        )
        if eng:
            out.append(eng)
        if copt:
            assert copt.startswith("[") and copt.endswith("]")
            copt = copt[1:-1]
            assert copt
            s, t = _parse_spellings_and_types(
                copt,
                detach_types=True,
                use_coptic_symbol=True,
            )
            assert not t
            # TODO: (#63) Stop using words for Coptic within English!
            out.append(
                lexical.Word(
                    [],
                    s,
                    t,
                    [],
                    None,
                    normalize_optional=True,
                    normalize_assumed=True,
                ).string(
                    include_references=True,
                    parenthesize_assumed=True,
                ),
            )

    return clean(" ".join(out))


def parse_english_cell(line: str) -> str:
    out_parts: list[str] = []
    while line:
        eng, greek, line = _chop(
            line,
            constants.GREEK_WITHIN_ENGLISH_RE,
            strict=False,
            strip_ends=True,
        )
        if eng:
            out_parts.append(_parse_english(eng))
        if greek:
            assert greek.startswith("[[") and greek.endswith("]]")
            greek = greek[2:-2]
            out_parts.append(parse_greek_cell(greek))
    out = " ".join(out_parts)
    # TODO: (#63) English post-processing likely shouldn't apply to Coptic
    # within English.
    out = _apply_substitutions(
        out,
        constants.ENGLISH_POSTPROCESSING,
        use_coptic_symbol=False,
    )
    out = _apply_substitutions(
        out,
        constants.ENGLISH_PRETTIFYING,
        use_coptic_symbol=False,
    )
    return clean(out)


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


def parse_crum_cell(line: str) -> CrumPage:
    return CrumPage(line)


def parse_greek_cell(line: str) -> str:
    line = _ascii_to_unicode_greek(line)
    line = constants.FINAL_SIGMA_RE.sub("ς", line)
    return clean(line)


def _ascii_to_unicode(txt: str) -> str:
    uni = ""
    for c in txt:
        if c in constants.LETTER_ENCODING:
            uni = uni + constants.LETTER_ENCODING[c]
        else:
            uni = uni + c
            assert c in constants.ACCEPTED_UNKNOWN_CHARS
    return clean(uni)


def _ascii_to_unicode_greek(txt: str) -> str:
    uni = "".join(constants.GREEK_LETTER_ENCODING.get(c, c) for c in txt)
    return clean(uni)


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

    line = line.strip()
    match = constants.REFERENCE_RE.match(line)
    assert match, line
    assert len(match.groups()) == 3, line
    line = match.group(1)
    body = _parse_english(match.group(2))
    note = _parse_english(match.group(3))
    parts = line.split(";")
    assert not (len(parts) % 5), parts
    for i in range(0, len(parts), 5):
        parts[i + 4], _ = _parse_coptic(parts[i + 4])
        yield "; ".join(filter(None, parts[i : i + 5] + [body, note]))


def _munch_and_parse_dialects(
    line: str,
    strict: bool,
) -> tuple[list[str], str]:
    match, line = _munch(line, constants.DIALECTS_RE, strict)
    if not strict and not match:
        return [], line
    assert match, line
    assert match[0] == "(" and match[-1] == ")"
    return match[1:-1].split(","), line


def clean(line: str) -> str:
    for _ in range(2):
        line = _apply_substitutions(line, constants.CLEAN, False)
    return line.strip()


def lighten_greek(line: str) -> str:
    line = constants.PARSED_GREEK_WITHIN_ENGLISH_RE.sub(lighten(r"\1"), line)
    return clean(line)


def lighten(line: str) -> str:
    return f'<span style="opacity:0.7">{line}</span>'
