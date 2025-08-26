"""Basic helpers to interact with the Crum sheet through Google Sheets API."""

# TODO: (#399) Rename module from `tsv` to `sheet`.

import gspread

from utils import cache, ensure, gcp

_GSPREAD_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg"
)

_WRD_SORT_COLS: list[str] = ["key"]
_DRV_SORT_COLS: list[str] = ["key_word"]

_KEY_WORD_COL: str = "key_word"

# Each derivation row must contain the following cells.
_DRV_ALL_COLS: list[str] = ["key", "key_word", "key_deriv", "type"]
# Each derivation row must contain at least of the following cell.s
_DRV_ANY_COLS: list[str] = ["word", "en"]

type Record = dict[str, str]
type Records = list[Record]


def to_str(d: dict[str, str | int | float]) -> dict[str, str]:
    return {k: str(v) for k, v in d.items()}


def _verify_balanced_brackets(records: Records) -> None:
    for record in records:
        for key, value in record.items():
            ensure.brackets_balanced(value, "record", record, "key", key)


def _is_sorted_by_int_columns(records: Records, column_names: list[str]):
    def _sort_key(record: Record) -> list[int]:
        return [int(record[col]) for col in column_names]

    int_tuples: list[list[int]] = list(map(_sort_key, records))
    return int_tuples == sorted(int_tuples)


def _valid_drv_row(row: Record) -> None:
    key = row["key"]
    ensure.ensure(
        all(row[col] for col in _DRV_ALL_COLS),
        "Row",
        key,
        "doesn't populate all the columns",
        _DRV_ALL_COLS,
    )
    ensure.ensure(
        any(row[col] for col in _DRV_ANY_COLS),
        "Row",
        key,
        "populates none of the following columns:",
        _DRV_ANY_COLS,
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

    @cache.StaticProperty
    @staticmethod
    def _sheet() -> gspread.spreadsheet.Spreadsheet:
        return gcp.spreadsheet(_GSPREAD_URL)

    @cache.StaticProperty
    @staticmethod
    def roots_sheet() -> gspread.worksheet.Worksheet:
        return Sheet._sheet.get_worksheet(0)

    @cache.StaticProperty
    @staticmethod
    def derivations_sheet() -> gspread.worksheet.Worksheet:
        return Sheet._sheet.get_worksheet(1)

    @cache.StaticProperty
    @staticmethod
    def roots_snapshot() -> Records:
        """Retrieve a shared, static snapshot of the roots.

        Returns:
            A shared, static snapshot of the roots.
        """
        return Sheet.snapshot_roots()

    @staticmethod
    def snapshot_roots() -> Records:
        """Retrieve a fresh snapshot of the roots.

        Returns:
            A fresh snapshot of the roots.
        """
        records: Records = list(
            map(to_str, Sheet.roots_sheet.get_all_records()),
        )
        _verify_balanced_brackets(records)
        ensure.ensure(
            _is_sorted_by_int_columns(records, _WRD_SORT_COLS),
            "Roots",
            "TSV is not sorted by",
            _WRD_SORT_COLS,
        )
        return records

    @cache.StaticProperty
    @staticmethod
    def derivations_snapshot() -> Records:
        """Retrieve a shared, static snapshot of the derivations.

        Returns:
            A shared, static snapshot of the derivations.
        """
        return Sheet.snapshot_derivations()

    @staticmethod
    def snapshot_derivations() -> Records:
        """Retrieve a fresh snapshot of the derivations.

        Returns:
            A fresh snapshot of the derivations.
        """
        records: Records = list(
            map(to_str, Sheet.derivations_sheet.get_all_records()),
        )
        _verify_balanced_brackets(records)

        # Validate empty rows are inserted.
        prev_key_word = ""
        for row in records:
            cur: str = row[_KEY_WORD_COL]
            ensure.ensure(
                cur == prev_key_word or not cur or not prev_key_word,
                "Empty rows are broken at",
                cur,
                "previous key is",
                prev_key_word,
            )
            prev_key_word = cur

        # Drop empty rows.
        records = list(filter(lambda r: any(r.values()), records))

        # Validate content.
        for r in records:
            _valid_drv_row(r)

        # Validate sorting.
        ensure.ensure(
            _is_sorted_by_int_columns(records, _DRV_SORT_COLS),
            "Derivations",
            "TSV is not sorted by",
            _DRV_SORT_COLS,
        )

        return records
