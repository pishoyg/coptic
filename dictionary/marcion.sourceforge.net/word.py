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
    ) -> None:
        assert all(d in constants.DIALECTS for d in dialects)
        self._dialects: list[str] = dialects
        self._spellings: list[str] = spellings
        self._types: list[type] = types
        self._references: list[str] = references
        self._root_type: typing.Optional[type] = root_type

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
