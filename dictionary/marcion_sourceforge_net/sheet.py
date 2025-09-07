"""Basic helpers to interact with the Crum sheet through Google Sheets API."""

import enum
import functools

import gspread

from utils import ensure, gcp

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
    TYPE = "type"
    EN = "en"
    CRUM = "crum"
    # The following columns are, as of the time of writing, only available in
    # the roots sheet.
    CRUM_LAST_PAGE = "crum-last-page"
    DAWOUD_PAGES = "dawoud-pages"
    CATEGORIES = "categories"
    NOTES = "notes"
    SENSES = "senses"
    SISTERS = "sisters"
    ANTONYMS = "antonyms"
    HOMONYMS = "homonyms"
    GREEK_SISTERS = "greek-sisters"
    QUALITY = "quality"
    WIKI = "wiki"
    WIKI_WIP = "wiki-wip"
    # The following columns are only found in the derivations sheet.
    KEY_WORD = "key_word"
    KEY_DERIV = "key_deriv"


_WRD_SORT_COLS: list[COL] = [COL.KEY]
_DRV_SORT_COLS: list[COL] = [COL.KEY_WORD]

# Each derivation row must contain the following cells.
_DRV_ALL_COLS: list[COL] = [COL.KEY, COL.KEY_WORD, COL.KEY_DERIV, COL.TYPE]
# Each derivation row must contain at least of the following cell.s
_DRV_ANY_COLS: list[COL] = [COL.WORD, COL.EN]


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


def roots() -> list[gcp.Record]:
    records: list[gcp.Record] = [
        gcp.Record(idx + 2, record)
        for idx, record in enumerate(roots_sheet().get_all_records())
    ]
    _verify_balanced_brackets(records)
    ensure.ensure(
        _is_sorted_by_int_columns(records, _WRD_SORT_COLS),
        "Roots",
        "TSV is not sorted by",
        _WRD_SORT_COLS,
    )
    return records


def derivations() -> list[gcp.Record]:
    records: list[gcp.Record] = [
        gcp.Record(idx + 2, record)
        for idx, record in enumerate(
            derivations_sheet().get_all_records(),
        )
    ]
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
