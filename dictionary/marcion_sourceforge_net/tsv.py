"""Basic helpers to interact with the Crum sheet through Google Sheets API."""

# TODO: (#399) Rename module from `tsv` to `sheet`.

import gspread

from utils import cache, ensure, gcp

_GSPREAD_URL: str = (
    # pylint: disable-next=line-too-long
    "https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg"
)

KEY_COL = "key"
_WRD_SORT_COLS: list[str] = [KEY_COL]
_DRV_SORT_COLS: list[str] = ["key_word"]

_KEY_WORD_COL: str = "key_word"

# Each derivation row must contain the following cells.
_DRV_ALL_COLS: list[str] = [KEY_COL, "key_word", "key_deriv", "type"]
# Each derivation row must contain at least of the following cell.s
_DRV_ANY_COLS: list[str] = ["word", "en"]


def _verify_balanced_brackets(records: list[gcp.Record]) -> None:
    for record in records:
        for col, value in record.row.items():
            # We can't enforce balanced brackets in Wiki, for two reasons:
            # - We don't own its source of truth, so sometimes we can't fix
            #   errors immediately. Those should be fixed.
            # - Crum's text has unbalanced brackets sometimes!
            if col == "wiki":
                continue
            ensure.brackets_balanced(
                value,
                "row",
                record.row[KEY_COL],
                "column",
                col,
            )


def _is_sorted_by_int_columns(
    records: list[gcp.Record],
    column_names: list[str],
):
    def _sort_key(record: gcp.Record) -> list[int]:
        return [int(record.row[col]) for col in column_names]

    int_tuples: list[list[int]] = list(map(_sort_key, records))
    return int_tuples == sorted(int_tuples)


def _valid_drv_record(record: gcp.Record) -> None:
    key = record.row[KEY_COL]
    ensure.ensure(
        all(record.row[col] for col in _DRV_ALL_COLS),
        "Row",
        key,
        "doesn't populate all the columns",
        _DRV_ALL_COLS,
    )
    ensure.ensure(
        any(record.row[col] for col in _DRV_ANY_COLS),
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
    def roots_snapshot() -> list[gcp.Record]:
        """Retrieve a shared, static snapshot of the roots.

        Returns:
            A shared, static snapshot of the roots.
        """
        return Sheet.snapshot_roots()

    @staticmethod
    def snapshot_roots() -> list[gcp.Record]:
        """Retrieve a fresh snapshot of the roots.

        Returns:
            A fresh snapshot of the roots.
        """
        records: list[gcp.Record] = [
            gcp.Record(idx + 2, record)
            for idx, record in enumerate(Sheet.roots_sheet.get_all_records())
        ]
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
    def derivations_snapshot() -> list[gcp.Record]:
        """Retrieve a shared, static snapshot of the derivations.

        Returns:
            A shared, static snapshot of the derivations.
        """
        return Sheet.snapshot_derivations()

    @staticmethod
    def snapshot_derivations() -> list[gcp.Record]:
        """Retrieve a fresh snapshot of the derivations.

        Returns:
            A fresh snapshot of the derivations.
        """
        records: list[gcp.Record] = [
            gcp.Record(idx + 2, record)
            for idx, record in enumerate(
                Sheet.derivations_sheet.get_all_records(),
            )
        ]
        _verify_balanced_brackets(records)

        # Validate empty rows are inserted.
        prev_key_word = ""
        for record in records:
            cur: str = record.row[_KEY_WORD_COL]
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
