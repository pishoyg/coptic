"""A word in Crum's dictionary."""

import enum

from dictionary.marcion_sourceforge_net import constants
from morphology import inflect


class Gender(enum.Enum):
    MASCULINE = 1
    FEMININE = 2
    PLURAL = 3


class Type:
    """A word type."""

    def __init__(
        self,
        marcion: str,
        coptic_symbol: str,
        description: str,
        inflect_type: inflect.Type | Gender | None,
        append: bool = True,
        is_root: bool = False,
    ):
        self._marcion: str = marcion
        self._coptic_symbol: str = coptic_symbol
        self._description: str = description
        self._inflect_type: inflect.Type | Gender | None = inflect_type
        self._append: bool = append
        if is_root:
            # Genders are not allowed as root types.
            # TODO: Add some root-specific checks for extra rigor.
            assert inflect_type is None or isinstance(
                inflect_type,
                inflect.Type,
            )

    def marcion(self) -> str:
        return self._marcion

    def coptic_symbol(self) -> str:
        return self._coptic_symbol

    def description(self) -> str:
        return self._description

    def inflect_type(self) -> inflect.Type | Gender | None:
        return self._inflect_type

    def append(self) -> bool:
        return self._append


class Word:
    """A line in Crum's dictionary.

    This represents a number of spellings (usually one, less commonly
    two or more) and their associated dialects. All dialects in the line
    apply to all the spellings in the line.

    Oftentimes, that comprises everything in the line. Though other
    entities may exist, such as a type override, a reference, or a
    comment (in plain English).

    As of the time of writing, we don't do a great job at extracting
    those extra entities, and precisely pinpointing the spelling. Lots
    of work needs to be done on improving line parsing.
    """

    def __init__(
        self,
        dialects: list[str],
        spellings: list[str],
        types: list[Type],
        references: list[str],
        root_type: Type | None,
        normalize_optional: bool = False,
        normalize_assumed: bool = False,
    ) -> None:
        assert all(d in constants.DIALECTS for d in dialects)
        self._dialects: list[str] = dialects
        self._spellings: list[str] = spellings
        self._types: list[Type] = types
        self._references: list[str] = references
        self._root_type: Type | None = root_type
        self._assumed: list[bool] = []

        if normalize_optional:
            self._spellings = sum(
                [self._normalize_optional_letters(s) for s in self._spellings],
                [],
            )

        if normalize_assumed:
            self._assumed = [self._is_assumed(s) for s in self._spellings]
            self._spellings = [
                s[1:-1] if a else s
                for s, a in zip(self._spellings, self._assumed)
            ]
            for s in self._spellings:
                # TODO: Remove the special case.
                if s == "ⲧⲣⲉ- (ⲉⲧⲣⲉ-, ⲡⲧⲣⲉ-)":
                    continue
                assert "(" not in s and ")" not in s

    def _is_assumed(self, spelling: str) -> bool:
        """
        Args:
            spelling: The word spelling in plain text. NOTE: It has to have
                already been normalized from the presence of other types of
                parentheses.

        Returns:
            Whether the given word is assumed.

        Raises:
            ValueError: If other parentheses are present in the spelling.
        """
        # TODO: Remove the special case.
        if spelling == "ⲧⲣⲉ- (ⲉⲧⲣⲉ-, ⲡⲧⲣⲉ-)":
            return False
        if "(" not in spelling and ")" not in spelling:
            return False
        if spelling[0] == "(" and spelling[-1] == ")":
            return True
        raise ValueError(f"Unexpected parentheses in {spelling}")

    def _normalize_optional_letters(self, spelling: str) -> list[str]:
        # TODO: This is ugly! And it's not even a structured word, but a piece
        # of English-within-Coptic text! The logic shouldn't come here in the
        # first place.
        # We handle it be returning it verbatim because we don't care about
        # this case!
        if spelling == "ⲧⲣⲉ- (ⲉⲧⲣⲉ-, ⲡⲧⲣⲉ-)":
            return [spelling]

        # A special case! Crum slipped in "(ⲉⲓⲛⲉ)" in order to make us aware
        # that is what the "ⲛ" means ("ⲛ" in this case is the prenominal form
        # of "ⲉⲓⲛⲉ"). Normalization therefore happens by simply removing the
        # interjection.
        # TODO: Surface for visibility! This shouldn't be buried so deep in the
        # code.
        if spelling == "ⲛ (ⲉⲓⲛⲉ) ⲣ.":
            return ["ⲛ ⲣ."]

        cnt_l, cnt_r = spelling.count("("), spelling.count(")")
        assert cnt_l == cnt_r
        if not cnt_l:
            return [spelling]
        assert cnt_l in [1, 2]  # In the vast majority of cases, it's 1.
        if spelling[0] == "(" and spelling[-1] == ")":
            assert cnt_l == 1
            assert len(spelling) > 3
            # TODO: Handle this case as a detached type or an annotation, in
            # order to enable normalization.
            return [spelling]
        i = spelling.find("(")
        j = spelling.find(")")
        assert j - i - 1 in [1, 2, 4]  # In the vast majority of cases, it's 1.
        assert constants.PURE_COPTIC_RE.match(spelling[i + 1])
        left = spelling[:i]
        middle = spelling[i + 1 : j]
        right = spelling[j + 1 :]
        # We have two possibilities. We recursively normalize them in case
        # there are other parentheses.
        return self._normalize_optional_letters(
            left + right,
        ) + self._normalize_optional_letters(left + middle + right)

    def __str__(self) -> str:
        raise ValueError(
            "Please use an explicitly string conversion method in"
            " order to provide the necessary arguments.",
        )

    def __repr__(self) -> str:
        raise ValueError(
            "Please use an explicitly string conversion method in"
            " order to provide the necessary arguments.",
        )

    def string(
        self,
        include_dialects: bool = True,
        include_references: bool = True,
        append_root_type: bool = False,
        parenthesize_assumed: bool = True,
        append_types: bool = True,
        classify: bool = False,
    ) -> str:
        """
        Args:
            include_dialects:
                Determine whether to include the list of dialect codes in the
                output.
            include_references:
                Determine whether to include references in the output. (This is
                currently present only for Nag Hammadi spellings.)
            append_root_type:
                Determine whether to prettify the output by appending a symbol
                that represents the root type.
                If the line already has types, those types trump, as they often
                invalidate / override the type of the root. However, if the
                line of spellings doesn't have any types specific to it, then
                the spellings likely have the same type as the root, so we
                append it.
            parenthesize_assumed:
                Determine whether to surround assumed spellings with
                parentheses. Notice that assumed spellings have parentheses by
                default, that may or may not have been normalized during
                parsing.
                - If they have, then we can either add them back or leave them
                  out.
                - If they have not, then we can keep them (they are there
                already), but we can't remove them in the output generation
                phase.
            append_types:
                Determine whether to prettify the output by appending symbols
                representing the detached types that have been picked up.
                This won't have any effect if types are not populated, which
                could be the case if detached types were not picked up but
                simply left in the text during the parsing phase.
            classify:
                Determine whether or not to wrap each element in an HTML
                `<span>` tag with classes indicating its "category".
                Categories could be a dialect code, a spelling, or a type. They
                could also be as simple as commas and parentheses.
                See below for which classes get populated for which elements.

        Returns:
            String representation of the word, potentially containing HTML tags.
        """

        def _span(content: str, classes: list[str]) -> str:
            assert classes
            if not content:
                return ""
            if not classify:
                return content
            return f'<span class="{" ".join(classes)}">{content}</span>'

        d = ""
        if include_dialects and self._dialects:
            dialects = [_span(d, ["dialect", d]) for d in self._dialects]

            d = (
                _span("(", ["dialect-parenthesis"])
                + _span(", ", ["dialect-comma"]).join(dialects)
                + _span(")", ["dialect-parenthesis"])
            )
        s = _span(", ", ["spelling-comma"]).join(
            _span(s, ["spelling"] + self._dialects)
            for s in self.spellings(parenthesize_assumed)
            if s
        )
        if not s:
            return ""

        t = ""
        if append_types:
            t = " ".join(i.coptic_symbol() for i in self._types if i.append())
        if append_root_type:
            assert self._root_type
            if not t and self._root_type.append():
                t = self._root_type.coptic_symbol()
        t = _span(t, ["type"] + self._dialects)
        r = ""
        if include_references:
            r = ", ".join("{" + r + "}" for r in self._references)
            r = _span(r, ["nag-hammadi"])
        word = " ".join(filter(None, [d, s, t, r]))
        word = _span(word, ["word"] + self._dialects)
        return word

    def dialects(self) -> list[str] | None:
        # Return None if there are no dialects.
        return self._dialects or None

    def spellings(self, parenthesize_assumed: bool = True) -> list[str]:
        if not parenthesize_assumed and not self._is_normalized_assumed():
            raise ValueError(
                "Can not remove assumed-spelling parentheses from unnormalized"
                " words!",
            )
        if not self._is_normalized_assumed():
            # The assumed-spelling parentheses are already there.
            return self._spellings
        if not parenthesize_assumed:
            return self._spellings
        assert len(self._spellings) == len(self._assumed)
        return [
            f"({s})" if a else s
            for s, a in zip(self._spellings, self._assumed)
        ]

    def _is_normalized_assumed(self) -> bool:
        if not self._spellings:
            # This word has no spellings to be normalized!
            # TODO: Not a clean check! Revisit!
            return True
        return bool(self._assumed)

    def infer(
        self,
        rt: inflect.Type | None,
        it: Gender,
    ) -> inflect.Type | None:
        if rt is None:
            return None
        if rt.is_verb():
            return rt
        if rt.is_noun():
            return {
                Gender.MASCULINE: inflect.Type.NOUN_MASCULINE,
                Gender.FEMININE: inflect.Type.NOUN_FEMININE,
                Gender.PLURAL: inflect.Type.NOUN_PLURAL,
            }[it]
        return None

    def inflect_type(self) -> inflect.Type | None:
        rt = self._root_type.inflect_type() if self._root_type else None
        # NOTE: The following if statement was introduced to appease `mypy`.
        # Reassess.
        if isinstance(rt, Gender):
            return None
        for t in self._types:
            it = t.inflect_type()
            if not it:
                continue
            if isinstance(it, inflect.Type):
                return it
            assert isinstance(it, Gender)
            inferred = self.infer(rt, it)
            if inferred:
                return inferred

        return rt
