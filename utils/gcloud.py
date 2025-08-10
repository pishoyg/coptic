"""Google Cloud and Google Sheets helpers."""

import typing

import gspread
import pandas as pd
from google.oauth2 import service_account

from utils import log, paths

_GSPREAD_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]


class GCPClient:
    """GCPClient caches a GCP client."""

    _client: gspread.client.Client | None = None

    @staticmethod
    def client() -> gspread.client.Client:
        if GCPClient._client is not None:
            return GCPClient._client

        creds: service_account.Credentials = (
            service_account.Credentials.from_service_account_file(
                paths.JSON_KEYFILE_NAME,
                scopes=_GSPREAD_SCOPE,
            )
        )
        GCPClient._client = gspread.auth.authorize(creds)
        return GCPClient._client


def read_gspread(
    gspread_url: str,
    worksheet: int = 0,
) -> gspread.worksheet.Worksheet:
    return GCPClient.client().open_by_url(gspread_url).get_worksheet(worksheet)


def get_column_index(
    worksheet: gspread.worksheet.Worksheet,
    column: str,
) -> int:
    for idx, value in enumerate(worksheet.row_values(1)):
        if value == column:
            return idx + 1  # Google  Sheets uses 1-based indexing.
    log.fatal(column, "not found in sheet")
    return -1  # Appease the linter.


def to_df(worksheet: gspread.worksheet.Worksheet) -> pd.DataFrame:
    return pd.DataFrame(worksheet.get_all_records()).astype(str)


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
    col_idx: int = get_column_index(worksheet, dst)
    log.ass(
        col_idx <= 26,
        "I am still not smart enough to infer the names of columns > 26!",
    )
    col: str = chr(ord("A") + col_idx - 1)
    # Calculate the range.
    range_name: str = f"{col}2:{col}{len(values)+1}"
    # Write the column.
    _ = worksheet.update(values, range_name, **args)
