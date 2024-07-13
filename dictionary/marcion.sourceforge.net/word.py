import enum
import typing

import constants
import enforcer
import type_enforced

from dictionary.inflect import inflect


class Gender(enum.Enum):
    MASCULINE = 1
    FEMININE = 2
    PLURAL = 3


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class type:
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
            assert inflect_type is None or isinstance(inflect_type, inflect.Type)

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


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class structured_word:

    def __init__(
        self,
        dialects: list[str],
        spellings: list[str],
        types: list[type],
        references: list[str],
        root_type: typing.Optional[type],
        normalize: bool = False,
    ) -> None:
        assert all(d in constants.DIALECTS for d in dialects)
        self._dialects: list[str] = dialects
        self._spellings: list[str] = spellings
        self._types: list[type] = types
        self._references: list[str] = references
        self._root_type: typing.Optional[type] = root_type

        if normalize:
            self._spellings = sum(
                [self._normalize(s) for s in self._spellings],
                [],
            )

    def _normalize(self, spelling: str) -> list[str]:

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
        right = spelling[j + 1 :] if j + 1 < len(spelling) else ""
        # We have two possibilities. We recursively normalize them in case
        # there are other parentheses.
        return self._normalize(left + right) + self._normalize(left + middle + right)

    def is_dialect(self, d: str, undialected_is_all: bool = False) -> bool:
        """
        undialected_is_all: If true, and the word is undialected, then it's
        considered to be a word in all dialects. So we will always return true.
        """
        if undialected_is_all and not self._dialects:
            return True
        return d in self._dialects

    def __str__(self) -> str:
        return self.string()

    def string(
        self, include_references: bool = True, append_root_type: bool = False
    ) -> str:
        d = "({}) ".format(", ".join(self._dialects)) if self._dialects else ""
        return d + self.undialected_string(include_references, append_root_type)

    def undialected_string(
        self, include_references: bool, append_root_type: bool
    ) -> str:
        s = ", ".join(self._spellings)
        t = " ".join(i.coptic_symbol() for i in self._types if i.append())
        if not t and append_root_type and self._root_type.append():
            t = self._root_type.coptic_symbol()
        r = ""
        if include_references:
            r = ", ".join("{" + r + "}" for r in self._references)
        return " ".join(filter(None, [s, t, r]))

    def dialects(self) -> list[str]:
        return self._dialects

    def spellings(self) -> list[str]:
        return self._spellings

    def lemma(self) -> str:
        # TODO: Use a smart heuristic to select the lemma form.
        for s in self._spellings:
            if s:
                return s
        return ""

    def infer(
        self, rt: inflect.Type | None, it: Gender
    ) -> typing.Optional[inflect.Type]:
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

    def inflect_type(self) -> typing.Optional[inflect.Type]:
        rt = self._root_type.inflect_type() if self._root_type else None
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
