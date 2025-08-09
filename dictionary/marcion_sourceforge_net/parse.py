"""Parse Crum's dictionary."""

import functools
import re
import typing
from collections import abc

from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import word as lexical


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
        constants.PREPROCESSING,
        use_coptic_symbol,
    )

    _validate_morphemes(constants.ENGLISH_WITHIN_COPTIC_RE.sub("", line))

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
        constants.SPELLING_ANNOTATIONS,
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
    spellings = list(map(str.strip, spellings))

    return spellings, types


def _validate_morphemes(line_no_english: str) -> None:
    # For the sake of rigor, investigate the content of the no-English subset.
    # NOTE: The body of this method is largely similar to
    # _parse_spellings_and_types.
    _, line_no_english = _pick_up_detached_types(
        line_no_english,
        constants.DETACHED_TYPES_1,
    )
    line_no_english = _apply_substitutions(
        line_no_english,
        constants.SPELLING_ANNOTATIONS,
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

    # Our use of the terms ‘lexeme’ and ‘morpheme’ in this context is likely
    # inaccurate.
    lexemes = constants.COMMA_NOT_BETWEEN_PARENTHESES_RE.split(
        line_no_english,
    )

    morphemes: list[str] = sum([lex.split() for lex in lexemes], [])

    def attest(s: str) -> str:
        # Remove surrounding parentheses if present.
        if not s:
            return s
        if s[0] == "(" and s[-1] == ")":
            return s[1:-1]
        return s

    # Get rid of the parentheses marking unattested forms, as they aren't
    # matched by our regex.
    morphemes = list(map(attest, morphemes))
    assert all(
        constants.MORPHEME_RE.fullmatch(m) for m in morphemes
    ), morphemes


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
    assert body in ["Ext", "compare", "ref"], body
    note = match.group(3)
    parts = line.split(";")
    assert not (len(parts) % 5), parts
    for i in range(0, len(parts), 5):
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
