#!/usr/bin/env python3
"""Download the entries of the Coptic Dictionary Online (CDO).

CDO serves the details of each entry as a JSON file, such as
https://coptic-dictionary.org/details/C1.json. This script downloads all of
them to `data/raw/cdo/`, one file per entry, named after the entry ID.

The IDs come from two sources:
- `index.json`, which CDO's frontend loads to search the dictionary. It lists
  every live entry, including those of a release of the Comprehensive Coptic
  Lexicon (CCL) newer than our v1.2 XML.
- Our copy of the CCL XML. The index omits deprecated entries, but CDO still
  serves the details of most of them.

An ID that CDO doesn't know is not an HTTP error: the server answers with the
frontend's HTML page instead. We report such IDs and skip them.

A successful run leaves exactly the downloaded entries in the output
directory, deleting the files of entries that CDO no longer serves.
"""

import argparse
import concurrent.futures
import pathlib
import threading
import typing

import requests
from requests import adapters
from urllib3 import util

from dictionary.kellia_uni_goettingen_de import kellia, tei
from utils import ensure, file, log

_URL: str = "https://coptic-dictionary.org"
_INDEX_URL: str = f"{_URL}/index.json"
_OUTPUT_DIR: pathlib.Path = (
    pathlib.Path(__file__).parent / "data" / "raw" / "cdo"
)
_TIMEOUT_S: int = 30
_RETRY: util.Retry = util.Retry(
    total=5,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)

_argparser = argparse.ArgumentParser(
    "Download the entries of the Coptic Dictionary Online.",
)

_ = _argparser.add_argument(
    "--jobs",
    type=int,
    default=16,
    help="The number of parallel downloads.",
)

# A `requests.Session` isn't guaranteed to be thread-safe, so each thread gets
# its own.
_local = threading.local()


def _session() -> requests.Session:
    session: requests.Session | None = getattr(_local, "session", None)
    if session is None:
        session = requests.Session()
        session.mount("https://", adapters.HTTPAdapter(max_retries=_RETRY))
        _local.session = session
    return session


def _get(url: str) -> requests.Response:
    response: requests.Response = _session().get(url, timeout=_TIMEOUT_S)
    response.raise_for_status()
    return response


def _is_json(response: requests.Response) -> bool:
    return response.headers.get("Content-Type", "").startswith(
        "application/json",
    )


def _index_ids() -> list[str]:
    response: requests.Response = _get(_INDEX_URL)
    ensure.ensure(_is_json(response), _INDEX_URL, "is not JSON!")
    ids: list[str] = [entry["id"] for entry in response.json()]
    ensure.unique(ids, "index IDs")
    return ids


def _xml_ids() -> list[str]:
    return [
        entry.xml_id
        for entry in tei.parse(kellia.COMPREHENSIVE).iter_entries()
    ]


def _download(entry_id: str) -> bool:
    """Download the details of an entry.

    Args:
        entry_id: The ID of the entry, such as `C1`.

    Returns:
        Whether CDO serves the entry.
    """
    url: str = f"{_URL}/details/{entry_id}.json"
    response: requests.Response = _get(url)
    if not _is_json(response):
        return False
    data: dict[str, typing.Any] = response.json()
    ensure.ensure(data["id"] == entry_id, url, "has ID", data["id"])
    # This is raw data, so we don't normalize it.
    file.write(
        file.json_dumps(data, indent=2),
        _OUTPUT_DIR / f"{entry_id}.json",
        report=False,
        normalize=False,
    )
    return True


def _sort_key(entry_id: str) -> int:
    return int(entry_id.removeprefix("C"))


def main() -> None:
    args = _argparser.parse_args()
    index: list[str] = _index_ids()
    xml: list[str] = _xml_ids()
    ids: list[str] = sorted(set(index) | set(xml), key=_sort_key)
    log.info(
        len(ids),
        "IDs:",
        len(index),
        "from the index,",
        len(set(xml) - set(index)),
        "more from the XML.",
    )

    file.mkdir(_OUTPUT_DIR)
    with concurrent.futures.ThreadPoolExecutor(args.jobs) as executor:
        served: list[bool] = list(executor.map(_download, ids))

    missing: list[str] = [i for i, ok in zip(ids, served) if not ok]
    if missing:
        index_set: set[str] = set(index)
        log.warn(
            "CDO doesn't serve",
            len(missing),
            "entries:",
            ", ".join(
                f"{i} (index)" if i in index_set else i for i in missing
            ),
        )

    downloaded: set[str] = {i for i, ok in zip(ids, served) if ok}
    stale: list[pathlib.Path] = [
        path
        for path in _OUTPUT_DIR.glob("*.json")
        if path.stem not in downloaded
    ]
    for path in stale:
        path.unlink()
    if stale:
        log.info("Deleted", len(stale), "stale entries.")

    log.info("Wrote", len(downloaded), "entries to", _OUTPUT_DIR)


if __name__ == "__main__":
    main()
