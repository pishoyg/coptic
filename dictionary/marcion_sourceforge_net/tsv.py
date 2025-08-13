"""This package defines basic helpers to read and validate the raw TSV data."""

import pathlib

import gspread
import pandas as pd

from utils import gcloud, lazy, log, text

_GSPREAD_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg"
)


class Sheet:
    """Sheet store the Crum sheet."""

    # NOTE:
    # - The class functions are defined as lazy static properties. See the
    # lazy module for documentation about the implications.
    # - The @staticmethod decorator is required, merely to appease some static
    # type checkers!
    # - We resort to static class properties, rather than globals, because our
    # lazy module doesn't support lazy global properties (yet?).

    @lazy.StaticProperty
    @staticmethod
    def sheet() -> gspread.spreadsheet.Spreadsheet:
        return gcloud.spreadsheet(_GSPREAD_URL)

    @lazy.StaticProperty
    @staticmethod
    def roots_sheet() -> gspread.worksheet.Worksheet:
        return Sheet.sheet.get_worksheet(0)

    @lazy.StaticProperty
    @staticmethod
    def derivations_sheet() -> gspread.worksheet.Worksheet:
        return Sheet.sheet.get_worksheet(1)


_SCRIPT_DIR = pathlib.Path(__file__).parent
# Each derivation row must contain the following cells.
_DRV_ALL_COLS: list[str] = ["key", "key_word", "key_deriv", "type"]
# Each derivation row must contain at least of the following cell.s
_DRV_ANY_COLS: list[str] = ["word", "en"]

_WRD_SORT_COLS: list[str] = ["key"]
_DRV_SORT_COLS: list[str] = ["key_word"]

_KEY_WORD_COL: str = "key_word"


def _verify_balanced_brackets(df: pd.DataFrame) -> None:
    for r, row in df.iterrows():
        for c, value in row.items():
            log.ass(
                text.are_brackets_balanced(value),
                "row",
                r,
                "column",
                c,
                "has unbalanced brackets:",
                value,
            )


def _is_sorted(tsv: pd.DataFrame, column_names: list[str]):
    def as_int(row: pd.Series):
        return tuple(int(row[col]) for col in column_names)

    int_tuples = tsv.apply(as_int, axis=1).tolist()
    return int_tuples == sorted(int_tuples)


# TODO: (#399) Abandon intermediate TSV.
def roots() -> pd.DataFrame:
    tsv: pd.DataFrame = gcloud.to_df(Sheet.roots_sheet)
    _verify_balanced_brackets(tsv)
    log.assass(
        _is_sorted(tsv, _WRD_SORT_COLS),
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


# TODO: (#399) Abandon intermediate TSV.
def derivations() -> pd.DataFrame:
    tsv: pd.DataFrame = gcloud.to_df(Sheet.derivations_sheet)
    _verify_balanced_brackets(tsv)

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
        _is_sorted(tsv, _DRV_SORT_COLS),
        "Derivations",
        "TSV is not sorted by",
        _DRV_SORT_COLS,
    )

    return tsv
