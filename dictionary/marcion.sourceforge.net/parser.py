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

(S) na,naa (S,A,sA) nae (S,B) nai (S) naeih (F) nei,neei (S,A,B,F) ^na- *^[naHht, naht]^*

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
    N.B. Please take this with a grain of salt. The parser wasn't implemented
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

import re

import constants
import enforcer
import type_enforced
import word as lexical

_reference_count = 0


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def reset():
    global _reference_count
    _reference_count = 0


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def verify(want_reference_count):
    assert _reference_count == want_reference_count


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _apply_substitutions(line: str, subs: list, use_coptic_symbol: bool) -> str:
    for pair in subs:
        p0 = pair[0]
        p1 = pair[1]
        if not isinstance(p1, str):
            assert isinstance(p1, lexical.type)
            p1 = p1.coptic_symbol() if use_coptic_symbol else p1.marcion()
        line = line.replace(p0, p1)
    return line


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _munch(text: str, regex: re.Pattern, strict: bool) -> tuple[str, str]:
    # Munch the prefix of `text` which matches `regex`, and return both parts.
    m = regex.match(text)
    if strict:
        assert m
    elif not m:
        return "", text

    i, j = m.span()
    assert i == 0
    return text[:j], text[j:].strip()


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _chop(text: str, regex: re.Pattern, strict: bool) -> tuple[str, str, str]:
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
    return text[:i].strip(), text[i:j], text[j:].strip()


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def parse_quality_cell(q: str) -> str:
    return constants.QUALITY_ENCODING[int(q)]


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def parse_type_cell(t: str) -> lexical.type:
    return constants.TYPE_ENCODING[int(t)]


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def parse_word_cell(
    line: str,
    root_type: lexical.type,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
) -> list[lexical.structured_word]:
    line = line.strip()
    # Replace the non-breaking space with a unicode space.
    line = line.replace("\xa0", " ")
    # TODO: Fix the quotation mark issue at the origin.
    # Right now, lines with references have misplaced double quotes, which we
    # fix manually below.
    HREF_START = "*^<a href="
    if HREF_START in line:
        assert line.endswith('"')
        line = line[:-1]
        line = line.replace(HREF_START, HREF_START + '"')
        line = line.replace(HREF_START + '""', HREF_START + '"')

    words = []
    if strict:
        # Handle undialected entries.
        if not constants.DIALECTS_RE.search(line):
            # This has a single undialected (spellings, types, references) tuple.
            s, t, r, line = _munch_and_parse_spellings_types_and_references(
                line, strict, detach_types, use_coptic_symbol
            )
            assert not line
            return [
                lexical.structured_word([], s, t, r, root_type, normalize=detach_types)
            ]

        while line:
            # Parse the dialects.
            d, line = _munch_and_parse_dialects(line, strict)
            # Parse the spellings, types, and references.
            s, t, r, line = _munch_and_parse_spellings_types_and_references(
                line, strict, detach_types, use_coptic_symbol
            )
            words.append(
                lexical.structured_word(d, s, t, r, root_type, normalize=detach_types)
            )
    else:
        while line:
            # Parse the dialects.
            d, line = _munch_and_parse_dialects(line, strict)
            # Parse the spellings, types, and references.
            s, t, r, line = _munch_and_parse_spellings_types_and_references(
                line, strict, detach_types, use_coptic_symbol
            )
            words.append(
                lexical.structured_word(d, s, t, r, root_type, normalize=detach_types)
            )

    return words


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _munch_and_parse_spellings_types_and_references(
    line: str,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
):  # -> tuple[list[str], list[lexical.type], list[str], str]:

    match, line = _munch(line, constants.SPELLINGS_TYPES_REFERENCES_RE, strict)

    ss, tt, rr = [], [], []

    while match:
        spelling_and_types, reference, match = _chop(
            match, constants.REFERENCE_RE, strict=False
        )
        if reference:
            rr.extend(_parse_reference(reference))
            global _reference_count
            _reference_count += 1
        if spelling_and_types:
            s, t = _parse_spellings_and_types(
                spelling_and_types, detach_types, use_coptic_symbol
            )
            ss.extend(s)
            tt.extend(t)

    return ss, tt, rr, line


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _parse_spellings_and_types(
    line: str, detach_types: bool, use_coptic_symbol: bool
):  # ) -> tuple[list[str], list[lexical.type]]:
    # This makes the assumption that references have been removed.
    types = []

    line = _apply_substitutions(line, constants.PREPROCESSING, use_coptic_symbol)

    line, line_no_english = _parse_coptic(line)
    _analyze_no_english(line_no_english)

    line = _apply_substitutions(
        line, constants.SPELLING_ANNOTATIONS_1, use_coptic_symbol
    )

    if detach_types:
        cur, line = _pick_up_detached_types(line, constants.DETACHED_TYPES_1)
        types.extend(cur)
    else:
        line = _apply_substitutions(line, constants.DETACHED_TYPES_1, use_coptic_symbol)

    line = _apply_substitutions(
        line, constants.SPELLING_ANNOTATIONS_2, use_coptic_symbol
    )

    if detach_types:
        cur, line = _pick_up_detached_types(line, constants.DETACHED_TYPES_2)
        types.extend(cur)
    else:
        line = _apply_substitutions(line, constants.DETACHED_TYPES_2, use_coptic_symbol)

    spellings = constants.COMMA_NOT_BETWEEN_PARENTHESES_RE.split(line)
    spellings = list(map(clean, spellings))

    return spellings, types


def _analyze_no_english(line_no_english: str) -> None:
    # N.B. The body of this method is largely similar to
    # _parse_spellings_and_types.
    # For the sake of rigor, investigate the content of the no-English subset.
    line_no_english = _apply_substitutions(
        line_no_english, constants.SPELLING_ANNOTATIONS_1, use_coptic_symbol=True
    )
    _, line_no_english = _pick_up_detached_types(
        line_no_english, constants.DETACHED_TYPES_1
    )
    line_no_english = _apply_substitutions(
        line_no_english, constants.SPELLING_ANNOTATIONS_2, use_coptic_symbol=True
    )
    _, line_no_english = _pick_up_detached_types(
        line_no_english, constants.DETACHED_TYPES_2
    )
    line_no_english = line_no_english.replace("(?)", "")  # TODO: Ugly! :/
    spellings = constants.COMMA_NOT_BETWEEN_PARENTHESES_RE.split(line_no_english)
    for s in spellings:
        for c in s:
            valid = c in constants.LETTERS or c in constants.ACCEPTED_UNKNOWN_CHARS_2
            if not valid:
                print(s)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _pick_up_detached_types(
    line: str, detached_types: list[tuple[str, lexical.type]]
) -> tuple[list[lexical.type], str]:
    t = []
    for p in detached_types:
        if p[0] in line:
            line = line.replace(p[0], "")
            t.append(p[1])
    return t, line.strip()


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _parse_coptic(line: str) -> tuple[str, str]:
    """
    _parse_coptic parses one line of ASCII-encoded Coptic. It is possible for
    the text to contain English text within it, and for the English text to
    contain Coptic text within.
    """
    out = []
    out_no_english = []
    while line:
        copt, eng, line = _chop(line, constants.ENGLISH_WITHIN_COPTIC_RE, strict=False)
        if copt:
            copt = _ascii_to_unicode(copt)
            out.append(copt)
            out_no_english.append(copt)
        if eng:
            eng = _parse_english(eng)
            out.append(eng)
    out = " ".join(out)
    out_no_english = " ".join(out_no_english)
    return clean(out), clean(out_no_english)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _parse_english(line: str) -> str:
    out = []
    while line:
        eng, copt, line = _chop(line, constants.COPTIC_WITHIN_ENGLISH_RE, strict=False)
        if eng:
            out.append(eng)
        if copt:
            assert copt.startswith("[") and copt.endswith("]")
            copt = copt[1:-1]
            assert copt
            s, t = _parse_spellings_and_types(
                copt, detach_types=True, use_coptic_symbol=True
            )
            assert not t
            out.append(
                lexical.structured_word([], s, t, [], None, normalize=True).string(
                    False
                )
            )

    out = " ".join(out)
    return clean(out)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def parse_english_cell(line: str) -> str:
    out = []
    while line:
        eng, greek, line = _chop(line, constants.GREEK_WITHIN_ENGLISH_RE, strict=False)
        if eng:
            out.append(_parse_english(eng))
        if greek:
            assert greek.startswith("[[") and greek.endswith("]]")
            greek = greek[2:-2]
            out.append(parse_greek_cell(greek))
    out = " ".join(out)
    # TODO: English post-processing likely shouldn't apply to Coptic within
    # English.
    out = _apply_substitutions(
        out, constants.ENGLISH_POSTPROCESSING, use_coptic_symbol=False
    )
    return clean(out)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def parse_crum_cell(line: str):
    match = constants.CRUM_RE.match(line)
    assert match
    assert len(match.groups()) == 2
    page, column = match.groups()
    assert int(page) >= 0 and int(page) <= constants.CRUM_LAST_PAGE_NUM, page
    return page, column


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def parse_greek_cell(line: str) -> str:
    line = _ascii_to_unicode_greek(line)
    return clean(line)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _ascii_to_unicode(ascii: str) -> str:
    uni = ""
    for c in ascii:
        if c in constants.LETTER_ENCODING:
            uni = uni + constants.LETTER_ENCODING[c]
        else:
            uni = uni + c
            assert c in constants.ACCEPTED_UNKNOWN_CHARS
    return clean(uni)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _ascii_to_unicode_greek(ascii: str) -> str:
    uni = "".join(constants.GREEK_LETTER_ENCODING.get(c, c) for c in ascii)
    return clean(uni)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _parse_reference(line: str):  # -> typing.Generator[str, None, None]:
    """
    This method makes the assumption that the input is a single
    (not nested nor concatenated) reference, whose boundaries have been
    removed.

    A reference is an <a></a> HTML tag with some text as the body, and an
    'href' property that has the following format:
        "ext name;id;chapter;verse;text"
    The 'href' contains most of the information. The body can contain
    something, and the tag could optionally be followed by some text.
    """

    line = line.strip()
    match = constants.REFERENCE_RE.match(line)
    assert match, line
    assert len(match.groups()) == 3, line
    line = match.group(1)
    body = _parse_english(match.group(2))
    note = _parse_english(match.group(3))
    line = line.split(";")
    assert not (len(line) % 5), line
    for i in range(0, len(line), 5):
        line[i + 4], _ = _parse_coptic(line[i + 4])
        yield "; ".join(filter(None, line[i : i + 5] + [body, note]))


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def _munch_and_parse_dialects(line: str, strict: bool) -> tuple[list[str], str]:
    match, line = _munch(line, constants.DIALECTS_RE, strict)
    if not strict and not match:
        return [], line
    assert match, line
    assert match[0] == "(" and match[-1] == ")"
    return match[1:-1].split(","), line


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def clean(line: str) -> str:
    for _ in range(2):
        line = _apply_substitutions(line, constants.CLEAN, False)
    return line.strip()


# TODO: This is incomplete. You've added tags. Make sure this is comprehensive.
@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def remove_html(line: str) -> str:
    for t in constants.HTML_TAGS:
        line = line.replace(t, "")
    return clean(line)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def remove_greek(line: str) -> str:
    line = constants.PARSED_GREEK_WITHIN_ENGLISH_RE.sub("", line)
    return clean(line)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def lighten_greek(line: str) -> str:
    line = constants.PARSED_GREEK_WITHIN_ENGLISH_RE.sub(lighten(r"\1"), line)
    return clean(line)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def lighten(line: str) -> str:
    return f'<span style="opacity:0.7">{line}</span>'


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def add_greek_links(line: str) -> str:
    line = constants.GREEK_WORD.sub(
        add_a_href(constants.KOINE_GREEK_DICTIONARY_FMT, r"\1"), line
    )
    return clean(line)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def remove_greek_and_html(line: str) -> str:
    line = remove_html(line)
    line = remove_greek(line)
    return line


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def add_a_href(link_fmt: str, key: str) -> str:
    link = link_fmt.format(key=key)
    return '<a href="{link}">{key}</a>'.format(link=link, key=key)
