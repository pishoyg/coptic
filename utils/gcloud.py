"""Google Cloud helpers."""

import gspread
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
    gspread_name: str,
    worksheet: int = 0,
) -> gspread.worksheet.Worksheet:
    return (
        GCPClient.client().open_by_url(gspread_name).get_worksheet(worksheet)
    )


def get_column_index(
    worksheet: gspread.worksheet.Worksheet,
    column: str,
) -> int:
    for idx, value in enumerate(worksheet.row_values(1)):
        if value == column:
            return idx + 1  # Google  Sheets uses 1-based indexing.
    log.fatal(column, "not found in sheet")
    return -1  # Appease the linter.
