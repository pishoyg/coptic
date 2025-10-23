"""Google Cloud and Google Sheets helpers."""

import functools
import io
import typing
from collections import abc

import gspread
import pandas as pd
import requests
from google.oauth2 import service_account

from utils import ensure, file, paths

_GSPREAD_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]


class Record:
    """Record represents a record in a sheet."""

    def __init__(
        self,
        row_num: int,
        row: abc.Mapping[str, str | int | float],
    ) -> None:
        self.row_num: int = row_num
        self.row: dict[str, str] = to_str(row)

    @classmethod
    def worksheet(cls) -> gspread.worksheet.Worksheet:
        """Retrieve the sheet that this record belongs to.

        Raises:
            NotImplementedError: This method must be overridden.
        """
        raise NotImplementedError

    @classmethod
    def worksheet_url(cls) -> str:
        """Retrieve a URL to the worksheet that this record belongs to.

        Raises:
            NotImplementedError: This method must be overridden.
        """
        raise NotImplementedError

    @functools.cached_property
    def row_url(self) -> str:
        return f"{self.worksheet_url()}?range={self.row_num}:{self.row_num}"

    @classmethod
    @functools.cache
    def col_num(cls) -> dict[str, int]:
        return column_nums(cls.worksheet())

    def update(self, col_name: str, value: str) -> bool:
        """Update the value of the given column.

        Args:
            col_name: Name of the column to update.
            value: New value.

        Returns:
            True if a value has been updated, False if the cached value is
            already equal to the new one.

        NOTE: If the value in the snapshot matches the given value, do nothing.
        """
        if self.row[col_name] == value:
            return False
        _ = self.worksheet().update_cell(
            self.row_num,
            self.col_num()[col_name],
            value,
        )
        return True


def to_str(d: abc.Mapping[str, str | int | float]) -> dict[str, str]:
    return {k: str(v) for k, v in d.items()}


@functools.cache
def client() -> gspread.client.Client:
    creds: service_account.Credentials = (
        service_account.Credentials.from_service_account_file(
            paths.JSON_KEYFILE_NAME,
            scopes=_GSPREAD_SCOPE,
        )
    )
    return gspread.auth.authorize(creds)


def spreadsheet(gspread_url: str) -> gspread.spreadsheet.Spreadsheet:
    """Retrieve a spreadsheet from URL.

    Args:
        gspread_url: Spreadsheet URL.

    Returns:
        Spreadsheet object.
    """
    return client().open_by_url(gspread_url)


def column_nums(worksheet: gspread.worksheet.Worksheet) -> dict[str, int]:
    # Row 1 in the sheet represents the header. It contains the column names.
    # Build a mapping from column names to column numbers.
    # Notice that Google Sheets uses 1-based indexing.
    return {
        value: idx + 1 for idx, value in enumerate(worksheet.row_values(1))
    }


def tsv_spreadsheet(export_url: str, **kwargs) -> pd.DataFrame:
    """Retrieve spreadsheet data from a TSV export URL.

    This is useful when a spreadsheet has been exported or published to the
    internet, but our GCP client doesn't have access to the sheet object. In
    this case, we're capable of retrieving the sheet's raw data, but not the
    sheet object. And we can read the sheet but not write to it.

    Args:
        export_url: Sheet TSV export URL.
        kwargs: Additional keyword arguments to pass to `pandas.read_csv`.

    Returns:
        Sheet data as a dataframe.
    """
    response = requests.get(export_url)
    response.raise_for_status()
    response.encoding = "UTF-8"
    return file.read_tsv(io.StringIO(response.text), **kwargs)


def apply(
    worksheet: gspread.worksheet.Worksheet,
    src: list[str],
    dst: str,
    f: typing.Callable[..., str],
    **args,
) -> None:
    """Apply the given function to the src columns, storing the result in dst.

    For each row in the sheet, pass the data from the given list of columns to
    the given function, storing the result in the destination column.

    Args:
        worksheet: Google sheet.
        src: List of names of the source columns.
        dst: Name of the destination column.
        f: Function to apply to the data in the source columns.
        args: optional keyword parameters to pass to worksheet.update.
            See
            https://docs.gspread.org/en/latest/api/models/worksheet.html#gspread.worksheet.Worksheet.update.

    """
    # For the purpose of writing everything on one column, we generate a list of
    # lists, where each sublist has a single item.
    values: list[list[str]] = [
        [f(*map(str, map(row.get, src)))]
        for row in worksheet.get_all_records()
    ]
    # Get the name of the destination column.
    col_idx: int = column_nums(worksheet)[dst]
    ensure.ensure(
        col_idx <= 26,
        "I am still not smart enough to infer the names of columns > 26!",
    )
    col: str = chr(ord("A") + col_idx - 1)
    # Calculate the range.
    range_name: str = f"{col}2:{col}{len(values)+1}"
    # Write the column.
    _ = worksheet.update(values, range_name, **args)
