"""Parse Crum's dictionary."""

import re
from collections import abc

from dictionary.marcion_sourceforge_net import constants
from dictionary.marcion_sourceforge_net import lexical as lex
from utils import log


def _apply_substitutions(
    line: str,
    subs: abc.Iterable[tuple[str | re.Pattern[str], str]],
) -> str:
    for pattern, replacement in subs:
        if isinstance(pattern, re.Pattern):
            line = pattern.sub(replacement, line)
        else:
            line = line.replace(pattern, replacement)
    return line


def parse_word_cell(
    entry: str,
    root_type: lex.Type,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
    normalize_optional: bool,
    normalize_assumed: bool,
) -> list[lex.Line]:
    if not entry:
        return []
    lines: list[lex.Line] = []
    for line in entry.split("\n"):
        lines.append(
            _parse_line(
                line,
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


def _parse_line(
    line: str,
    root_type: lex.Type,
    strict: bool,
    detach_types: bool,
    use_coptic_symbol: bool,
    normalize_optional: bool,
    normalize_assumed: bool,
) -> lex.Line:
    # Parse the dialects.
    dialects, line = _munch_dialects(line)

    # Parse the forms, types, and references.
    forms: list[str] = []
    types: list[lex.Type] = []
    references: list[lex.Reference] = []
    for rich_form in constants.COMMA_NOT_BETWEEN_BRACKETS_RE.split(line):
        form, form_types, form_refs = _parse_rich_form(
            rich_form,
            detach_types,
            use_coptic_symbol,
        )
        forms.append(form)
        types.extend(form_types)
        references.extend(form_refs)
    del line

    # If this entry is undialected, try to infer the dialects from the
    # forms. We only do this for roots, but not derivations – hence the
    # check for `strict`.
    if not dialects and strict:
        # Undialected and Ⳉ, it's Akhmimic!
        if all("ⳉ" in form for form in forms):
            dialects = ["A"]
        # Undialected and ϧ, it's Bohairic!
        if all("ϧ" in form for form in forms):
            dialects = ["B"]

    return lex.Line(
        dialects,
        forms,
        types,
        [r.string(use_coptic_symbol) for r in references],
        root_type,
        normalize_optional=normalize_optional,
        normalize_assumed=normalize_assumed,
    )


def _parse_rich_form(
    line: str,
    detach_types: bool,
    use_coptic_symbol: bool,
) -> tuple[str, list[lex.Type], list[lex.Reference]]:

    parts: list[lex.Word | lex.Annotation | lex.Remark] = []
    references: list[lex.Reference] = []
    for part in constants.SPACE_NOT_BETWEEN_BRACKETS_RE.split(line):
        if not part:
            continue
        part = _apply_substitutions(part, constants.PREPROCESSING)
        if constants.REFERENCE_RE.fullmatch(part):
            references.extend(_parse_reference(part))
            continue
        if constants.ENGLISH_WITHIN_COPTIC_RE.match(part):
            parts.append(lex.Remark(part))
            continue
        if part in constants.DETACHED_TYPES:
            parts.append(lex.Annotation(constants.DETACHED_TYPES[part]))
            continue
        if constants.WORD_RE.match(part):
            parts.append(lex.Word(part))
            continue
        log.fatal("Unable to make sense of", part, "in", line)

    if detach_types:
        words_and_remarks: list[lex.Word | lex.Remark] = []
        types: list[lex.Annotation] = []
        for p in parts:
            if isinstance(p, lex.Annotation):
                types.append(p)
            else:
                words_and_remarks.append(p)
        assert len(types) + len(words_and_remarks) == len(parts)
        del parts
        return (
            " ".join([s.string(use_coptic_symbol) for s in words_and_remarks]),
            [t.type for t in types],
            references,
        )

    return (
        " ".join(p.string(use_coptic_symbol) for p in parts),
        [],
        references,
    )


def parse_english_cell(line: str) -> str:
    return _apply_substitutions(line, constants.ENGLISH_PROCESSING)


def _parse_reference(line: str) -> abc.Generator[lex.Reference]:
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
        ref: str = "; ".join(filter(None, parts[i : i + 5] + [body, note]))
        yield lex.Reference(ref)


def _munch_dialects(line: str) -> tuple[list[str], str]:
    match = constants.DIALECTS_RE.match(line)
    if not match:
        return [], line
    assert match.start() == 0
    return match.group(1).split(","), line[match.end() :].strip()


def lighten_greek(line: str) -> str:
    return constants.PARSED_GREEK_WITHIN_ENGLISH_RE.sub(lighten(r"\1"), line)


def lighten(line: str) -> str:
    return f'<span style="opacity:0.7">{line}</span>'
