import pandas as pd
import type_enforced


class node:
    @type_enforced.Enforcer
    def __init__(self, row: pd.Series) -> None:
        self._row = row
        self._children = []
        self._sorted = False

    @type_enforced.Enforcer
    def row(self) -> pd.Series:
        return self._row

    @type_enforced.Enforcer
    def add_child(self, child) -> None:
        assert child.row()["key_word"] == self._row["key"]
        assert not self._sorted
        self._children.append(child)

    @type_enforced.Enforcer
    def sort(self) -> None:
        assert not self._sorted
        self._children = sorted(self._children, key=row_sort_key)
        for child in self._children:
            child.sort()
        self._sorted = True

    # TODO: Complete building the tree.
    def tree(self) -> list[pd.Series]:
        assert self._sorted
        return [self.row()] + [child.row() for child in self._children]


@type_enforced.Enforcer
def row_sort_key(n: node) -> int:
    return int(n.row()["pos"])
