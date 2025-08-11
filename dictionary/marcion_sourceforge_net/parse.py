"""Parse Crum's dictionary."""

import functools
import re
import typing
from collections import abc

from dictionary.marcion_sourceforge_net import constants, lexical


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


def parse_word_cell(
    entry: str,
    root_type: lexical.Type,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
    normalize_optional: bool,
    normalize_assumed: bool,
) -> list[lexical.Line]:
    lines: list[lexical.Line] = list(
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
    if len(lines) > 1:
        assert all(w.dialects for w in lines)

    return lines


def parse_word_cell_aux(
    entry: str,
    root_type: lexical.Type,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
    normalize_optional: bool,
    normalize_assumed: bool,
) -> abc.Generator[lexical.Line]:
    for line in entry.splitlines():
        # Parse the dialects.
        d, line = _munch_dialects(line)
        # Parse the forms, types, and references.
        f, t, r = _parse_forms_types_and_references(
            line,
            detach_types,
            use_coptic_symbol,
        )
        # If this entry is undialected, try to infer the dialects from the
        # forms. We only do this for roots, but not derivations – hence the
        # check for `strict`.
        if not d and strict:
            # Undialected and Ⳉ, it's Akhmimic!
            if all("ⳉ" in form for form in f):
                d = ["A"]
            # Undialected and ϧ, it's Bohairic!
            if all("ϧ" in form for form in f):
                d = ["B"]

        yield lexical.Line(
            d,
            f,
            t,
            r,
            root_type,
            normalize_optional=normalize_optional,
            normalize_assumed=normalize_assumed,
        )


def _parse_forms_types_and_references(
    line: str,
    detach_types: bool,
    use_coptic_symbol: bool,
) -> tuple[list[str], list[lexical.Type], list[str]]:
    ss: list[str] = []
    tt: list[lexical.Type] = []
    rr: list[str] = []

    def sub_ref(match: re.Match[str]) -> str:
        rr.extend(_parse_reference(match.group(0)))
        return ""

    forms: list[str] = constants.COMMA_NOT_BETWEEN_PARENTHESES_RE.split(line)
    del line

    f: str
    t: list[lexical.Type]

    for form in forms:
        form = constants.REFERENCE_RE.sub(sub_ref, form)
        f, t = _parse_form_and_types(form, detach_types, use_coptic_symbol)
        ss.append(f)
        tt.extend(t)

    return ss, tt, rr


def _parse_form_and_types(
    line: str,
    detach_types: bool,
    use_coptic_symbol: bool,
) -> tuple[str, list[lexical.Type]]:
    # This makes the assumption that references have been removed.
    types: list[lexical.Type] = []

    line = _apply_substitutions(
        line,
        constants.PREPROCESSING,
        use_coptic_symbol,
    )

    _validate_words(constants.ENGLISH_WITHIN_COPTIC_RE.sub("", line))

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
        constants.FORM_ANNOTATIONS,
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

    return line.strip(), types


def _remove_assumed_form_parentheses(f: str) -> str:
    # Remove surrounding parentheses if present.
    if not f:
        return f
    if f[0] == "(" and f[-1] == ")":
        return f[1:-1]
    return f


def _validate_words(line: str) -> None:
    # For the sake of rigor, investigate the content of the no-English subset.
    # NOTE: The body of this method is largely similar to
    # _parse_forms_and_types.
    _, line = _pick_up_detached_types(line, constants.DETACHED_TYPES_1)
    line = _apply_substitutions(line, constants.FORM_ANNOTATIONS)
    _, line = _pick_up_detached_types(line, constants.DETACHED_TYPES_2)
    line = line.replace("(?)", "")  # TODO: (#338) Ugly! :/

    assert line
    words: list[str] = line.split()
    del line

    # Get rid of the parentheses marking unattested forms, as they aren't
    # matched by our regex.
    words = list(map(_remove_assumed_form_parentheses, words))
    assert all(constants.WORD_RE.fullmatch(w) for w in words), words


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
