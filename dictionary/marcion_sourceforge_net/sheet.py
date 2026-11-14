"""Basic helpers to interact with the Crum sheet through Google Sheets API.

The pipeline reads a local snapshot of the sheet, tracked in Git, so that a
sheet edit shows up as a `diff`. The helpers that write to the sheet read it
live instead, so that their writes land on the right rows.
"""

import enum
import functools
import pathlib
import typing
from collections import abc

import gspread
import pandas as pd

from utils import ensure, file, gcp, paths

# TODO: (#0) Move to `utils/paths.py`.
GSPREAD_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg"
)
ROOTS_URL: str = f"{GSPREAD_URL}/edit?gid=1575616379"
DERIVATIONS_URL: str = f"{GSPREAD_URL}/edit?gid=698638592"


@functools.cache
def _sheet() -> gspread.spreadsheet.Spreadsheet:
    return gcp.spreadsheet(GSPREAD_URL)


@functools.cache
def roots_sheet() -> gspread.worksheet.Worksheet:
    return _sheet().get_worksheet(0)


@functools.cache
def derivations_sheet() -> gspread.worksheet.Worksheet:
    return _sheet().get_worksheet(1)


class COL(enum.Enum):
    """COL stores the column names of the Crum sheet."""

    # The following columns are common.
    KEY = "key"
    WORD = "word"
    WORDS = "words"
    TYPE = "type"
    EN = "en"
    CRUM = "crum"
    # The following columns are, as of the time of writing, only available in
    # the roots sheet.
    CATEGORIES = "categories"
    NOTES = "notes"
    SENSES = "senses"
    SISTERS = "sisters"
    ANTONYMS = "antonyms"
    HOMONYMS = "homonyms"
    GREEK_SISTERS = "greek-sisters"
    QUALITY = "quality"
    # The following columns are only found in the derivations sheet.
    KEY_WORD = "key_word"
    KEY_DERIV = "key_deriv"


_WRD_SORT_COLS: list[COL] = [COL.KEY]
_DRV_SORT_COLS: list[COL] = [COL.KEY_WORD]

# Each derivation row must contain the following cells.
_DRV_ALL_COLS: list[COL] = [COL.KEY, COL.KEY_WORD, COL.KEY_DERIV, COL.TYPE]
# Each derivation row must contain at least of the following cell.s
_DRV_ANY_COLS: list[COL] = [COL.WORD, COL.WORDS, COL.EN]


def _verify_balanced_brackets(records: list[gcp.Record]) -> None:
    for record in records:
        for col, value in record.row.items():
            ensure.brackets_balanced(
                value,
                "row",
                record.row[COL.KEY.value],
                "column",
                col,
            )


def _is_sorted_by_int_columns(
    records: list[gcp.Record],
    column_names: list[COL],
):
    def _sort_key(record: gcp.Record) -> list[int]:
        return [int(record.row[col.value]) for col in column_names]

    int_tuples: list[list[int]] = list(map(_sort_key, records))
    return int_tuples == sorted(int_tuples)


def _valid_drv_record(record: gcp.Record) -> None:
    key = record.row[COL.KEY.value]
    ensure.ensure(
        all(record.row[col.value] for col in _DRV_ALL_COLS),
        "Row",
        key,
        "doesn't populate all the columns",
        _DRV_ALL_COLS,
    )
    ensure.ensure(
        any(record.row[col.value] for col in _DRV_ANY_COLS),
        "Row",
        key,
        "populates none of the following columns:",
        _DRV_ANY_COLS,
    )


_Worksheet = abc.Callable[[], gspread.worksheet.Worksheet]

# Each worksheet, and the path of its local snapshot.
_TSV: dict[_Worksheet, pathlib.Path] = {
    roots_sheet: paths.MARCION_ROOTS_TSV,
    derivations_sheet: paths.MARCION_DERIVATIONS_TSV,
}


def _fetch(worksheet: _Worksheet) -> list[dict[str, str]]:
    return [
        # Only retain used columns.
        {k: v for k, v in gcp.to_str(row).items() if k in COL}
        for row in worksheet().get_all_records(
            numericise_ignore=["all"],  # Read the sheet cells as text.
        )
    ]


def snapshot() -> None:
    """Refresh the local snapshots of the roots and derivations sheets.

    We keep the sheet's column order, as well as its empty rows, which count
    toward the row numbers.
    """
    for worksheet, tsv in _TSV.items():
        file.to_tsv(pd.DataFrame(_fetch(worksheet)), tsv)


def _records(worksheet: _Worksheet, live: bool) -> list[gcp.Record]:
    # Pandas types the TSV records' keys as `Hashable`, but they are strings.
    rows: abc.Iterable[abc.Mapping[typing.Any, str]] = (
        _fetch(worksheet)
        if live
        else file.read_tsv(_TSV[worksheet]).to_dict("records")
    )
    # Google Sheets uses 1-based indexing, and row 1 is the header.
    return [gcp.Record(num, row) for num, row in enumerate(rows, start=2)]


def roots(live: bool) -> list[gcp.Record]:
    """Retrieve the roots.

    Args:
        live: Read the sheet rather than the local snapshot. Do so if you
            intend to write to the sheet.

    Returns:
        The roots.
    """
    records: list[gcp.Record] = _records(roots_sheet, live)
    _verify_balanced_brackets(records)
    ensure.ensure(
        _is_sorted_by_int_columns(records, _WRD_SORT_COLS),
        "Roots",
        "TSV is not sorted by",
        _WRD_SORT_COLS,
    )
    return records


def derivations(live: bool) -> list[gcp.Record]:
    """Retrieve the derivations.

    Args:
        live: Read the sheet rather than the local snapshot. Do so if you
            intend to write to the sheet.

    Returns:
        The derivations, with empty rows dropped.
    """
    records: list[gcp.Record] = _records(derivations_sheet, live)
    _verify_balanced_brackets(records)

    # Validate empty rows are inserted.
    prev_key_word = ""
    for record in records:
        cur: str = record.row[COL.KEY_WORD.value]
        ensure.ensure(
            cur == prev_key_word or not cur or not prev_key_word,
            "Empty rows are broken at",
            cur,
            "previous key is",
            prev_key_word,
        )
        prev_key_word = cur

    # Drop empty rows.
    records = list(filter(lambda r: any(r.row.values()), records))

    # Validate content.
    for r in records:
        _valid_drv_record(r)

    # Validate sorting.
    ensure.ensure(
        _is_sorted_by_int_columns(records, _DRV_SORT_COLS),
        "Derivations",
        "TSV is not sorted by",
        _DRV_SORT_COLS,
    )

    return records
