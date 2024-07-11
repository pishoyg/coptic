import typing

import enforcer
import type_enforced


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class type:
    _marcion = None
    _coptic_symbol = None
    _description = None

    def __init__(
        self, marcion: str, coptic_symbol: str, description: str, append: bool = True
    ):

        self._marcion = marcion
        self._coptic_symbol = coptic_symbol
        self._description = description
        self._append = append

    def marcion(self) -> str:
        return self._marcion

    def coptic_symbol(self) -> str:
        return self._coptic_symbol

    def description(self) -> str:
        return self._description

    def append(self) -> bool:
        return self._append


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
class structured_word:
    _dialects = None
    _spellings = None
    _types = None
    _references = None
    _root_type = None

    def __init__(
        self,
        dialects: list[str],
        spellings: list[str],
        types: list[type],
        references: list[str],
        root_type: typing.Optional[type],
    ) -> None:
        self._dialects = dialects
        self._spellings = spellings
        self._types = types
        self._references = references
        self._root_type = root_type

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
