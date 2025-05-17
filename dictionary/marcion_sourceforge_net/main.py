#!/usr/bin/env python3
"""Parse Crum's dictionary."""
import pandas as pd

from . import constants, parse, tree, tsv
from . import word as lexical

_MIN_KEY = 1
_MAX_KEY = 3385


class _Keyer:
    """Store and track word keys."""

    def __init__(self, df: pd.DataFrame):
        self.keys = {str(row["key"]) for _, row in df.iterrows()}

    def assert_valid_key(self, key: int) -> None:
        assert key >= _MIN_KEY and key <= _MAX_KEY

    def next(self, key: int) -> str:
        self.assert_valid_key(key)
        if key == _MAX_KEY:
            return ""
        nxt = int(key) + 1
        while str(nxt) not in self.keys:
            nxt += 1
        self.assert_valid_key(nxt)
        return str(nxt)

    def prev(self, key: int) -> str:
        self.assert_valid_key(key)
        if key == _MIN_KEY:
            return ""
        prv = key - 1
        while str(prv) not in self.keys:
            prv -= 1
        self.assert_valid_key(prv)
        return str(prv)


def _title(word: list[lexical.structured_word]) -> str:
    return ", ".join(
        w.string(
            include_dialects=False,
            include_references=False,
            append_root_type=False,
            parenthesize_assumed=True,
            append_types=False,
            classify=False,
        )
        for w in word
    )


def _process_data(df: pd.DataFrame, strict: bool) -> None:
    extra_cols: dict[str, list[str]] = {}

    def insert(col: str, cell: str) -> None:
        if col not in extra_cols:
            extra_cols[col] = []
        extra_cols[col].append(cell)

    keysmith = _Keyer(df)
    for _, row in df.iterrows():
        if strict:
            insert(
                "key-link",
                constants.CARD_LINK_FMT.format(key=row["key"]),
            )
        else:
            insert(
                "key-link",
                constants.CARD_LINK_FMT.format(key=row["key_word"])
                + "#drv"
                + row["key"],
            )
        root_type = parse.parse_type_cell(row["type"])
        word = parse.parse_word_cell(
            row["word"],
            root_type,
            strict,
            detach_types=False,
            use_coptic_symbol=False,
            normalize_optional=False,
            normalize_assumed=False,
        )
        insert("word-parsed", "\n".join(w.string() for w in word))
        insert(
            "word-parsed-classify",
            "\n".join(w.string(classify=True) for w in word),
        )
        word = parse.parse_word_cell(
            row["word"],
            root_type,
            strict,
            detach_types=True,
            use_coptic_symbol=True,
            normalize_optional=True,
            normalize_assumed=True,
        )
        insert("word-title", _title(word))
        insert(
            "word-parsed-prettify",
            "\n".join(
                w.string(
                    include_references=False,
                    append_root_type=True,
                    classify=True,
                )
                for w in word
            ),
        )

        if strict:
            insert(
                "quality-parsed",
                parse.parse_quality_cell(row["quality"]),
            )
        insert("type-parsed", root_type.marcion())
        ep = parse.parse_english_cell(row["en"])
        insert("en-parsed", ep)
        crum = row["crum"]
        if crum == "0a":
            row["crum"] = ""
            insert("crum-link", "")
        else:
            insert("crum-link", constants.CRUM_PAGE_FMT.format(key=crum))
        dialects: list[str] = _dialects(word, is_root=strict)
        insert("dialects", ", ".join(dialects))
        if strict:
            insert("key-next", keysmith.next(int(row["key"])))
            insert("key-prev", keysmith.prev(int(row["key"])))

    for col, values in extra_cols.items():
        df[col] = values


def _build_trees(roots: pd.DataFrame, derivations: pd.DataFrame) -> None:
    derivations["depth"] = tree.depths(derivations)
    # Build trees.
    keys = [row["key"] for _, row in roots.iterrows()]
    trees = {row["key"]: tree.node(row) for _, row in roots.iterrows()}
    for _, row in derivations.iterrows():
        trees[row["key_word"]].add_descendant(tree.node(row))
    for _, t in trees.items():
        t.preprocess()

    # Add extra columns to the parents, using the derivations.
    roots["crum-page-range"] = [trees[key].crum_page_range() for key in keys]
    roots["derivations-table"] = [trees[key].html_table() for key in keys]
    roots["derivations-list"] = [trees[key].html_list() for key in keys]
    roots["dialects"] = [", ".join(trees[key].dialects()) for key in keys]


def _dialects(word: list[lexical.structured_word], is_root: bool) -> list[str]:
    dialects: set[str] = set()
    for w in word:
        d = w.dialects()
        if d is None:
            if is_root:
                # If one word is undialected, we treat it as belonging to all
                # dialects.
                return sorted(constants.DIALECTS)
            else:
                continue
        dialects.update(d)
    assert all(d in constants.DIALECTS for d in dialects)
    return sorted(dialects)


# Process roots.
roots: pd.DataFrame = tsv.roots()
_process_data(roots, strict=True)

# Process derivations.
derivations: pd.DataFrame = tsv.derivations()
_process_data(derivations, strict=False)

# Gain tree insights.
_build_trees(roots, derivations)
