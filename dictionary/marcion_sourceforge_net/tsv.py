"""This package defines basic helpers to read and validate the raw TSV data."""

import pathlib

import pandas as pd

from utils import file, log

_SCRIPT_DIR = pathlib.Path(__file__).parent
_WRD = _SCRIPT_DIR / "data" / "input" / "coptwrd.tsv"
_DRV = _SCRIPT_DIR / "data" / "input" / "coptdrv.tsv"
# Each derivation row must contain the following cells.
_DRV_ALL_COLS = ["key", "key_word", "key_deriv", "type", "pos"]
# Each derivation row must contain at least of the following cell.s
_DRV_ANY_COLS = ["word", "en"]

_WRD_SORT_COLS = ["key"]
_DRV_SORT_COLS = ["key_word", "pos"]

_KEY_WORD_COL = "key_word"


def is_sorted(tsv: pd.DataFrame, column_names: list[str]):
    def as_int(row: pd.Series):
        return tuple(int(row[col]) for col in column_names)

    int_tuples = tsv.apply(as_int, axis=1).tolist()
    return int_tuples == sorted(int_tuples)


def roots() -> pd.DataFrame:
    tsv: pd.DataFrame = file.read_tsv(_WRD)
    log.assass(
        is_sorted(tsv, _WRD_SORT_COLS),
        "Roots",
        "TSV is not sorted by",
        _WRD_SORT_COLS,
    )
    return tsv


def _valid_drv_row(row: pd.Series) -> bool:
    key = row["key"]
    log.assass(
        not row[_DRV_ALL_COLS].eq("").any(),
        "Row",
        key,
        "doesn't populate all the columns",
        _DRV_ALL_COLS,
    )
    log.assass(
        not row[_DRV_ANY_COLS].eq("").all(),
        "Row",
        key,
        "populates none of the following columns:",
        _DRV_ANY_COLS,
    )
    return True


def derivations() -> pd.DataFrame:
    tsv = file.read_tsv(_DRV)

    # Validate empty rows are inserted.
    prev_key_word = ""
    for _, row in tsv.iterrows():
        cur: str = row[_KEY_WORD_COL]
        log.assass(
            cur == prev_key_word or not cur or not prev_key_word,
            "Empty rows are broken at",
            cur,
            "previous key is",
            prev_key_word,
        )
        prev_key_word = cur

    # Drop empty rows.
    tsv = tsv[~tsv.eq("").all(axis=1)]

    # Validate content.
    tsv.apply(_valid_drv_row, axis=1)

    # Validate sorting.
    log.assass(
        is_sorted(tsv, _DRV_SORT_COLS),
        "Derivations",
        "TSV is not sorted by",
        _DRV_SORT_COLS,
    )

    return tsv
