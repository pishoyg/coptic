"""Download and read the entries of the Coptic Dictionary Online (CDO).

CDO serves the details of each entry as a JSON file, such as
https://coptic-dictionary.org/details/C1.json. `download` downloads all of
them to `data/raw/cdo/`, one file per entry, named after the entry ID, and
`supplemental_forms` reads the forms that CDO adds to an entry.

The ID of a form tells where it comes from:
- A `CF` ID (such as `CF8796`) is the ID of a form of the CCL XML. Most of them
  are forms of our XML, but some are new in the newer release that CDO uses
  (such as `CF34057`, `ⲭⲱ B`, under `C1058`), and some differ from our XML.
  We skip them all, and rely on our XML instead.
- A numeric ID (such as `1396.1`) starts with the Marcion key of an entry of
  Crum's dictionary (`1396` is `ⲥⲟⲕⲥⲉⲕ`), and the form is retrieved from
  remnqymi.com's version of Crum's dictionary.
- A null or absent ID indicates that the form comes from Coptic Scriptorium.

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

TODO: (#305) Consider using the entries of the newer release that are absent
from our XML (283, as of the time of writing, such as `C12016`). This would
expand the purpose of the JSON from supplemental forms to supplemental entries.
"""

import concurrent.futures
import json
import pathlib
import threading
import typing

import requests
import typeguard
from requests import adapters
from urllib3 import util

from dictionary.kellia_uni_goettingen_de import tei
from utils import ensure, file, log, paths

_URL: str = "https://coptic-dictionary.org"
_INDEX_URL: str = f"{_URL}/index.json"
_TIMEOUT_S: int = 30
_RETRY: util.Retry = util.Retry(
    total=5,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)

# CDO doesn't serve these entries, although they are live in our XML. The newer
# release of the XML deprecates them.
# TODO: (#305) Delete this set once we upgrade to the newer release of the XML.
_UNSERVED: set[str] = {"C4760", "C4954"}
# The prefix of the IDs of the forms of the XML.
_XML_FORM_ID_PREFIX: str = "CF"

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
        entry.xml_id for entry in tei.parse(paths.KELLIA_XML).iter_entries()
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
        paths.KELLIA_CDO_DIR / f"{entry_id}.json",
        report=False,
        normalize=False,
    )
    return True


def _sort_key(entry_id: str) -> int:
    return int(entry_id.removeprefix("C"))


def download(jobs: int) -> None:
    """Download all entries, and delete the stale ones.

    Args:
        jobs: The number of parallel downloads.
    """
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

    with concurrent.futures.ThreadPoolExecutor(jobs) as executor:
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
        for path in paths.KELLIA_CDO_DIR.glob("*.json")
        if path.stem not in downloaded
    ]
    for path in stale:
        path.unlink()
    if stale:
        log.info("Deleted", len(stale), "stale entries.")

    log.info("Wrote", len(downloaded), "entries to", paths.KELLIA_CDO_DIR)


class _Frequency(typing.TypedDict):
    rate: float
    rank: int
    count: int


# The schema of a form. We only read the orthography and the dialect, but
# validate the rest, to detect a change of schema.
_Form = typing.TypedDict(
    "_Form",
    {
        "id": typing.NotRequired[str | None],
        "orth": str,
        "dialect": str | None,
        "oRef": typing.NotRequired[str],
        "type": typing.NotRequired[str],
        "freq_form": typing.NotRequired[_Frequency],
    },
)


class Form(typing.NamedTuple):
    orth: str
    dialect: str


def supplemental_forms(entry_id: str) -> list[Form]:
    """Read the supplemental forms that CDO adds to an entry.

    These are the forms that carry no `CF` ID (see the module docstring).

    Args:
        entry_id: The ID of the entry, such as `C1`.

    Returns:
        The supplemental forms, in CDO's order. An entry that CDO doesn't serve
        has none.
    """
    path: pathlib.Path = paths.KELLIA_CDO_DIR / f"{entry_id}.json"
    if entry_id in _UNSERVED:
        ensure.ensure(
            not path.exists(),
            entry_id,
            "is served by CDO! Remove it from the list of unserved entries.",
        )
        return []
    ensure.ensure(
        path.is_file(),
        path,
        "doesn't exist! Run `make cdo` to download CDO's entries. If CDO"
        " doesn't serve the entry, add it to the list of unserved entries.",
    )
    forms: list[_Form] = typeguard.check_type(
        json.loads(file.read(path))["forms"],
        list[_Form],
        collection_check_strategy=typeguard.CollectionCheckStrategy.ALL_ITEMS,
    )
    supplemental: list[Form] = []
    for form in forms:
        form_id: str | None = form.get("id")
        if form_id and form_id.startswith(_XML_FORM_ID_PREFIX):
            # TODO: (#305) Consider incorporating the forms whose values
            # differ from those in our XML (spellings, and occasionally
            # dialects), and the forms that are absent from our XML.
            continue
        dialect: str | None = form["dialect"]
        if dialect is None:
            log.fatal(
                entry_id,
                "has a supplemental form with no dialect:",
                form["orth"],
            )
        supplemental.append(Form(form["orth"], dialect))
    return supplemental
