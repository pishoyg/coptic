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
        self._attested: list[bool] = []
        normalize_attestations = normalize

        if normalize:
            self._spellings = sum(
                [self._normalize_optional_letters(s) for s in self._spellings],
                [],
            )

        if normalize_attestations:
            self._attested = [self._is_attested(s) for s in self._spellings]
            self._spellings = [
                s if a else s[1:-1] for s, a in zip(self._spellings, self._attested)
            ]
            for s in self._spellings:
                # TODO: Remove the special case.
                if s == "ⲧⲣⲉ- (ⲉⲧⲣⲉ-, ⲡⲧⲣⲉ-)":
                    continue
                assert "(" not in s and ")" not in s

    def _is_attested(self, spelling: str) -> bool:
        """
        N.B. Spellings passed are expected to have already been normalized from
        the presence of other types of parentheses.
        """
        # TODO: Remove the special case.
        if spelling == "ⲧⲣⲉ- (ⲉⲧⲣⲉ-, ⲡⲧⲣⲉ-)":
            return True
        if "(" not in spelling and ")" not in spelling:
            return True
        if spelling[0] == "(" and spelling[-1] == ")":
            return False
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
        return self._normalize_optional_letters(
            left + right
        ) + self._normalize_optional_letters(left + middle + right)

    def is_dialect(self, d: str, undialected_is_all: bool = False) -> bool:
        """
        undialected_is_all: If true, and the word is undialected, then it's
        considered to be a word in all dialects. So we will always return true.
        """
        if undialected_is_all and not self._dialects:
            return True
        return d in self._dialects

    def __str__(self) -> str:
        raise ValueError(
            "Please use an explicity string conversion method in"
            " order to provide the necessary arguments."
        )

    def string(
        self,
        include_references: bool = True,
        append_root_type: bool = False,
        parenthesize_unattested: bool = True,
    ) -> str:
        d = "({}) ".format(", ".join(self._dialects)) if self._dialects else ""
        return d + self.undialected_string(
            include_references, append_root_type, parenthesize_unattested
        )

    def undialected_string(
        self,
        include_references: bool,
        append_root_type: bool,
        parenthesize_unattested: bool = True,
    ) -> str:
        s = ", ".join(self.spellings(parenthesize_unattested))
        t = " ".join(i.coptic_symbol() for i in self._types if i.append())
        if not t and append_root_type and self._root_type.append():
            t = self._root_type.coptic_symbol()
        r = ""
        if include_references:
            r = ", ".join("{" + r + "}" for r in self._references)
        return " ".join(filter(None, [s, t, r]))

    def dialects(self) -> list[str]:
        return self._dialects

    def spellings(self, parenthesize_unattested: bool = True) -> list[str]:
        if not parenthesize_unattested and not self._is_normalized_attestations():
            raise ValueError(
                "Can not remove attestation parentheses from unnormalized words!"
            )
        if not self._is_normalized_attestations():
            # The attestation parentheses are already there.
            return self._spellings
        if not parenthesize_unattested:
            return self._spellings
        assert len(self._spellings) == len(self._attested)
        return [s if a else f"({s})" for s, a in zip(self._spellings, self._attested)]

    def _is_normalized_attestations(self) -> bool:
        if not self._spellings:
            # This word has no spellings to be normalized!
            # TODO: Not a clean check! Revisit!
            return True
        return bool(self._attested)

    def attested(self) -> list[bool]:
        assert self._is_normalized_attestations()
        return self._attested

    def lemma(self) -> str:
        # TODO: Use a smart heuristic to select the lemma form.
        for s in self.spellings(parenthesize_unattested=False):
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
