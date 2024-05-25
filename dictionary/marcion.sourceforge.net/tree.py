# TODO: Although it suffices for our current purposes to use a flat list of
# descendants that is sorted and has indentation information, it may be
# beneficial to actually build a tree.

import itertools
import typing

import constants
import pandas as pd
import type_enforced

NUM_COLS = 10


class node:
    @type_enforced.Enforcer
    def __init__(self, row: pd.Series) -> None:
        self._row = row
        self._descendants = []
        self._preprocessed = False

    @type_enforced.Enforcer
    def row(self) -> pd.Series:
        return self._row

    @type_enforced.Enforcer
    def cell(self, key: str) -> str:
        return str(self.row()[key])

    @type_enforced.Enforcer
    def add_descendant(self, descendant) -> None:
        assert isinstance(descendant, node)
        assert descendant._row["key_word"] == self._row["key"]
        assert not self._preprocessed
        self._descendants.append(descendant)

    @type_enforced.Enforcer
    def preprocess(self) -> None:
        assert not self._preprocessed
        # Sort.
        self._descendants = sorted(self._descendants, key=lambda n: int(n.cell("pos")))
        self._preprocessed = True

    @type_enforced.Enforcer
    def descendants(self, include_root: bool = False):
        assert self._preprocessed
        return [self] + self._descendants if include_root else self._descendants

    @type_enforced.Enforcer
    def crum_pages(self) -> list[str]:
        cur = {d.row()["crum-page"] for d in self.descendants(include_root=True)}
        cur = map(int, cur)
        cur = filter(None, cur)  # Delete the zero page.
        cur = sorted(cur)  # Sort numerically, not lexicographically.
        cur = map(str, cur)  # Convert back to string.
        cur = list(cur)
        return cur

    @type_enforced.Enforcer
    def html(
        self, dialect: typing.Optional[str] = None, include_root: bool = False
    ) -> str:
        """
        derivations is a set of exactly five columns, each representing one field,
        namely:
            - depth
            - word-parsed-prettify
            - type-parsed
            - en-parsed
            - crum
            - key
        They are expected to be pre-sorted, and to belong to a single word.
        """
        assert not include_root, "An HTML tree with the root is not yet supported."
        assert self._preprocessed

        crum_row_spans = self.build_crum_row_spans()

        out = []
        out.extend(
            [
                "<table>",
                "<colgroup>",
            ]
        )
        out.extend([f'<col width="{100/NUM_COLS}%">'] * NUM_COLS)
        out.extend(["</colgroup>"])

        for d, crum_row_span in zip(self.descendants(), crum_row_spans):
            crum, crum_span = crum_row_span
            assert bool(crum) == bool(crum_span)
            depth = int(d.cell("depth"))
            word = (
                d.cell("word-parsed-prettify")
                if dialect is None
                else d.cell("dialect-" + dialect)
            )
            type = d.cell("type-parsed")
            meaning = d.cell("en-parsed")
            key = d.cell("key")
            word_width = int((NUM_COLS - depth) / 2) if word else 0
            # TODO: Handle the case when the meaning is absent.
            meaning_width = NUM_COLS - word_width - depth - 1
            out.extend(
                [
                    # New row.
                    "<tr>",
                    # Key (commented).
                    f"<!--Key: {key}-->",
                    # Margin.
                    f'<td colspan="{depth}"></td>' if depth else "",
                    # Word.
                    (
                        f'<td colspan="{word_width}" id="bordered">{word}</td>'
                        if word_width
                        else ""
                    ),
                    # Meaning.
                    f'<td colspan="{meaning_width}" id="bordered">',
                    f"<b>({type})</b><br>" if type not in ["-", "HEADER"] else "",
                    meaning,
                    "</td>",
                    (
                        f'<td rowspan="{crum_span}" id="bordered"><b>Crum: </b>{crum}</td>'
                        if crum_span
                        else ""
                    ),
                    # End row.
                    "</tr>",
                ]
            )
        out.append("</table>")
        out = " ".join(out)
        return out

    def build_crum_row_spans(self) -> list[tuple[str, int]]:
        crum_column = [d._row["crum"] for d in self.descendants()]
        out = []
        for group in itertools.groupby(crum_column):
            # Validate that all elements are equal.
            crum = group[0]
            repetitions = len(list(group[1]))
            out.append((crum, repetitions))
            for _ in range(repetitions - 1):
                out.append(("", 0))
        return out


@type_enforced.Enforcer
def depths(derivations: pd.DataFrame) -> list[int]:
    keys = [int(row["key"]) for _, row in derivations.iterrows()]
    parents = [int(row["key_deriv"]) for _, row in derivations.iterrows()]
    key_to_parent = {k: p for k, p in zip(keys, parents)}

    @type_enforced.Enforcer
    def depth(key: int) -> int:
        parent = key_to_parent[key]
        if not parent:
            return 0
        return 1 + depth(parent)

    depths = [depth(k) for k in keys]
    assert all(0 <= x <= constants.MAX_DERIVATION_DEPTH for x in depths)
    return depths
