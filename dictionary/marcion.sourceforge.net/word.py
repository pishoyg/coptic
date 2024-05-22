import typing

import type_enforced


class type:
    _marcion = None
    _coptic_symbol = None
    _description = None

    @type_enforced.Enforcer
    def __init__(
        self, marcion: str, coptic_symbol: str, description: str, append: bool = True
    ):

        self._marcion = marcion
        self._coptic_symbol = coptic_symbol
        self._description = description
        self._append = append

    @type_enforced.Enforcer
    def marcion(self) -> str:
        return self._marcion

    @type_enforced.Enforcer
    def coptic_symbol(self) -> str:
        return self._coptic_symbol

    @type_enforced.Enforcer
    def description(self) -> str:
        return self._description

    @type_enforced.Enforcer
    def append(self) -> bool:
        return self._append


class structured_word:
    _dialects = None
    _spellings = None
    _types = None
    _references = None
    _root_type = None

    @type_enforced.Enforcer
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

    @type_enforced.Enforcer
    def is_dialect(self, d: str) -> bool:
        return d in self._dialects

    @type_enforced.Enforcer
    def __str__(self) -> str:
        return self.string()

    @type_enforced.Enforcer
    def string(
        self, include_references: bool = True, append_root_type: bool = False
    ) -> str:
        d = "({}) ".format(", ".join(self._dialects)) if self._dialects else ""
        return d + self.undialected_string(include_references, append_root_type)

    @type_enforced.Enforcer
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

    @type_enforced.Enforcer
    def dialects(self) -> list[str]:
        return self._dialects
