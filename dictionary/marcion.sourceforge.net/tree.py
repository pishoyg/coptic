# TODO: Actually build a tree, rather than a flat list of descendants.
import pandas as pd
import type_enforced


class node:
    @type_enforced.Enforcer
    def __init__(self, row: pd.Series) -> None:
        self._row = row
        self._descendants = []
        self._sorted = False

    @type_enforced.Enforcer
    def row(self) -> pd.Series:
        return self._row

    @type_enforced.Enforcer
    def add_descendant(self, descendant) -> None:
        assert isinstance(descendant, node)
        assert descendant.row()["key_word"] == self._row["key"]
        assert not self._sorted
        self._descendants.append(descendant)

    @type_enforced.Enforcer
    def sort_descendants(self) -> None:
        assert not self._sorted
        self._descendants = sorted(self._descendants, key=row_sort_key)
        self._sorted = True

    @type_enforced.Enforcer
    def tree(self) -> list[pd.Series]:
        assert self._sorted
        raise ValueError("Tree construction is not yet implemented!")

    @type_enforced.Enforcer
    def descendants(self, include_root: bool = False):
        assert self._sorted
        return [self] + self._descendants if include_root else self._descendants


@type_enforced.Enforcer
def row_sort_key(n: node) -> int:
    return int(n.row()["pos"])
