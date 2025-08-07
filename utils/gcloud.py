"""Google Cloud and Google Sheets helpers."""

import pathlib
import typing

import gspread
import pandas as pd
from google.oauth2 import service_account

from utils import file, log, paths

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
    return pd.DataFrame(worksheet.get_all_records())


def to_tsv(
    worksheet: gspread.worksheet.Worksheet,
    path: str | pathlib.Path,
) -> None:
    file.to_tsv(to_df(worksheet), path)


def apply(
    worksheet: gspread.worksheet.Worksheet,
    src: str,
    dst: str,
    f: typing.Callable[[str], str],
) -> None:
    """Apply the given lambda to the src column, storing the result in dst.

    Args:
        worksheet: Google sheet.
        src: Name of the source column.
        dst: Name of the destination column.
        f: Function to apply.
    """
    # For the purpose of writing everything on one column, we generate a list of
    # lists, where each sublist has a single item.
    values: list[list[str]] = [
        [f(str(row[src]))] for row in worksheet.get_all_records()
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
    _ = worksheet.update(values, range_name)
