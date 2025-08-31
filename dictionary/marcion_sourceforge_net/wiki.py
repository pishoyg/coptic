#!/usr/bin/env python3
"""Process coptic.wiki's Digital Version of Crum."""

from dictionary.marcion_sourceforge_net import main as crum
from utils import gcp, log

# pylint: disable=line-too-long
SHEET_URL: str = (
    "https://docs.google.com/spreadsheets/d/1lhjcnkHS-pA3p5Vys-6ohKu7Y4ZCJ5NO/export?format=tsv"
)
# pylint: enable=line-too-long


def main():
    """Copy updated Wiki data to our Crum sheet.

    NOTE: We intentionally update one row at a time, although this consumes the
    API quota.
    """
    for record in gcp.raw_spreadsheet(SHEET_URL).to_dict(orient="records"):
        key: str = record["Marcion"]
        entry: str = record["Entry"]
        if not key or not entry:
            continue
        if key not in crum.Crum.roots:
            log.error("key", key, "not found in Crum!")
            continue
        # Copy the value to our sheet.
        crum.Crum.roots[key].update("wiki", entry)


if __name__ == "__main__":
    main()
