"""Generic utilities and helprs."""

# TODO: This file is too big. We should split it up into multiple files.
import collections
import json
import os
import pathlib
import re
import typing
from collections import abc
from concurrent import futures

import colorama
import gspread
import pandas as pd
from oauth2client import service_account  # type: ignore[import-untyped]

SITE_DIR = "docs/"

CHARSET_TAG = """
  <meta charset="utf-8">
"""

# NOTE: As of now, the entire website uses a shared stylesheet.
STYLE_TAG = """
  <link href="/style.css" rel="stylesheet" type="text/css">
"""
assert os.path.isfile(os.path.join(SITE_DIR, "style.css"))

GOOGLE_TAG = """
  <script async src=
  "https://www.googletagmanager.com/gtag/js?id=G-VCVZFDFZR3"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "G-VCVZFDFZR3");
  </script>
"""

ICON_TAG = """
  <link rel="icon" type="image/x-icon" href="/img/icon/icon-circle.png">
"""
assert os.path.isfile(os.path.join(SITE_DIR, "img/icon/icon-circle.png"))

VIEWPORT_TAG = """
<meta name="viewport" content="width=device-width, initial-scale=1">
"""

INTEGER_RE = re.compile("[0-9]+")

GSPREAD_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
]

JSON_KEYFILE_NAME = "google_cloud_keyfile.json"


# html_head is used by our HTML generation logic to generated the <head>
# elements for our pages.
# Besides the generated HTML files, a number of singleton manually-written HTML
# pages don't use this function. If the desired head structure changes, updating
# this function should update all of the auto-generated pages. But the
# manually-written ones will have to be updated manually. As of now, this
# includes the following:
# - docs/index.html
# - docs/crum/index.html
# - docs/dawoud/index.html
# However, for the most up-to-date list, consult `pre-commit/docs_structure.py`.
def html_head(
    title: str,
    page_class: str = "",
    search: str = "",
    next_href: str = "",
    prev_href: str = "",
    scripts: list[str] | None = None,
    epub: bool = False,
) -> str:
    assert title
    if epub:
        assert not page_class
        assert not search
        assert not next_href
        assert not prev_href
        assert not scripts
    return "".join(
        html_head_aux(
            title,
            page_class,
            search,
            next_href,
            prev_href,
            scripts or [],
            epub,
        ),
    )


def html_head_aux(
    title: str,
    page_class: str,
    search: str,
    next_href: str,
    prev_href: str,
    scripts: list[str],
    epub: bool = False,
) -> abc.Generator[str]:
    yield "<head>"
    yield f"<title>{title}</title>"
    if epub:
        # None of what remains is relevant to EPUB.
        yield "</head>"
        return

    yield CHARSET_TAG
    yield VIEWPORT_TAG
    yield STYLE_TAG
    yield ICON_TAG
    yield GOOGLE_TAG
    if search:
        yield f'<link href="{search}" rel="search">'
    if next_href:
        yield f'<link href="{next_href}" rel="next">'
    if prev_href:
        yield f'<link href="{prev_href}" rel="prev">'
    if page_class:
        yield f"<script>const {page_class} = true;</script>"
    for script in scripts:
        yield f'<script src="{script}" type="module"></script>'
    yield "</head>"


def html_aux(head: str, *body: str) -> abc.Generator[str]:
    yield "<!DOCTYPE html>"
    yield "<html>"
    yield head
    yield "<body>"
    yield from body
    yield "</body>"
    yield "</html>"


def html(head: str, *body: str) -> str:
    return "".join(html_aux(head, *body))


def _print(
    color,
    recolor,
    *args,
    severity: typing.Literal["", "info", "warn", "error", "fatal"] = "",
    exception: bool = False,
):
    message: str = (
        colorama.Style.DIM
        + color
        + (severity.capitalize() + ": " if severity else "")
        + colorama.Style.NORMAL
        + " ".join(
            [
                (recolor if idx % 2 else color) + str(arg)
                for idx, arg in enumerate(args)
            ],
        )
        + colorama.Style.RESET_ALL
    )

    if exception:
        raise Exception(message)  # pylint: disable=broad-exception-raised
    else:
        print(message)


def info(*args, level: bool = True):
    """Log an informational message."""
    _print(
        colorama.Fore.GREEN,
        colorama.Fore.BLUE,
        severity="info" if level else "",
        *args,
    )


def warn(*args, level: bool = True):
    """Log a warning."""
    _print(
        colorama.Fore.YELLOW,
        colorama.Fore.CYAN,
        severity="warn" if level else "",
        *args,
    )


def error(*args, level: bool = True):
    """Log an error."""
    _print(
        colorama.Fore.RED,
        colorama.Fore.MAGENTA,
        severity="error" if level else "",
        *args,
    )


def err(cond, *args, level: bool = True):
    """If the condition is not satisfied, log an error."""
    if not cond:
        error(*args, level=level)


def throw(*args, level: bool = True):
    """Throw an exception."""
    _print(
        colorama.Fore.RED,
        colorama.Fore.MAGENTA,
        severity="error" if level else "",
        *args,
        exception=True,
    )


def ass(cond, *args, level: bool = True):
    """Assert!

    If the condition is not satisfied, throw an error.
    """
    if not cond:
        throw(*args, level=level)


def fatal(*args, level: bool = True):
    """Log an error and exit with a nonzero status!"""
    _print(
        colorama.Fore.RED,
        colorama.Fore.MAGENTA,
        severity="fatal" if level else "",
        *args,
    )
    exit(1)


def assass(cond, *args, level: bool = True):
    """Assassinate.

    If a condition is not satisfied, exit with a nonzero status.
    """
    if not cond:
        fatal(*args, level=level)


def mkdir(path: str) -> None:
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)


def mk_parent_dir(path: str) -> None:
    pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)


def write(
    content: str,
    path: str,
    log: bool = True,
    fix_newline: bool = True,
    make_dir: bool = False,
) -> None:
    if make_dir:
        mk_parent_dir(path)
    if fix_newline and (not content or content[-1] != "\n"):
        content += "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    if not log:
        return
    wrote(path)


def writelines(
    content: abc.Generator[str],
    path: str,
    log: bool = True,
    make_dir: bool = False,
) -> None:
    if make_dir:
        mk_parent_dir(path)
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(content)
    if not log:
        return
    wrote(path)


def wrote(path: str, verify: bool = True) -> None:
    if verify:
        assert os.path.exists(path)
    info("Wrote", path)


def json_dumps(j, **kwargs) -> str:
    return json.dumps(
        j,
        indent=2,
        ensure_ascii=False,
        allow_nan=False,
        **kwargs,
    )


def read_tsv(path: str | pathlib.Path, sort_values_by=None) -> pd.DataFrame:
    path = str(path)
    df = pd.read_csv(
        path,
        sep="\t",
        dtype=str,
        encoding="utf-8",
        keep_default_na=False,
    ).fillna("")
    if sort_values_by:
        df.sort_values(sort_values_by, inplace=True)
    return df


# TODO: This cache doesn't work with multiprocessing. It's shared by threads,
# but not between processes.
class TSVCache:
    _cache: dict[str, pd.DataFrame] = {}

    @staticmethod
    def read(path: str) -> pd.DataFrame:
        if path in TSVCache._cache:
            return TSVCache._cache[path]
        df = read_tsv(path)
        TSVCache._cache[path] = df
        return df


class GCPClient:
    """GCP client to interact with Google Sheets."""

    _client: gspread.Client | None = None

    @staticmethod
    def client() -> gspread.Client:
        if GCPClient._client is not None:
            return GCPClient._client
        GCPClient._client = gspread.authorize(
            service_account.ServiceAccountCredentials.from_json_keyfile_name(
                JSON_KEYFILE_NAME,
                GSPREAD_SCOPE,
            ),
        )
        return GCPClient._client


def read_gspread(
    gspread_name: str,
    worksheet: int = 0,
):
    return (
        GCPClient.client().open_by_url(gspread_name).get_worksheet(worksheet)
    )


def get_column_index(worksheet, column: str) -> int:
    for idx, value in enumerate(worksheet.row_values(1)):
        if value == column:
            return idx + 1  # Google  Sheets uses 1-based indexing.
    fatal(column, "not found in sheet")
    return -1  # Appease the linter.


def read(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def paths(dir_path: str) -> list[str]:
    return [os.path.join(dir_path, f) for f in os.listdir(dir_path)]


def splitext(path: str) -> tuple[str, str]:
    return os.path.splitext(os.path.basename(path))


def stem(path: str) -> str:
    return splitext(path)[0]


def stems(file_paths: list[str]) -> list[str]:
    return list(map(stem, file_paths))


def ext(path: str) -> str:
    return splitext(path)[1]


def exts(file_paths: list[str]) -> list[str]:
    return list(map(ext, file_paths))


def split(line: str, *args) -> list[str]:
    """Split a string, discarding empty entries."""
    return list(filter(None, line.split(*args)))


def ssplit(line: str, *args) -> list[str]:
    """Split a string, stripping whitespace from each entry, and discarding
    empty entries."""
    return list(
        filter(None, map(lambda word: word.strip(), line.split(*args))),
    )


def _semver_sort_key(file_path: str) -> list[str | int]:
    """Construct a sort key for file path with a semantic version basename."""
    file_path = os.path.basename(file_path)
    return list(map(int, INTEGER_RE.findall(file_path))) + [
        file_path,
    ]


def sort_semver(file_paths: list[str]) -> list[str]:
    return sorted(file_paths, key=_semver_sort_key)


def verify_unique(arr, message: str) -> None:
    dupes = [
        item for item, count in collections.Counter(arr).items() if count > 1
    ]
    if dupes:
        fatal(message, "duplicate elements:", dupes)


def verify_all_belong_to_set(arr, accepted: set | dict, message: str) -> None:
    for x in arr:
        if x in accepted:
            continue
        fatal(message, x, "does not belong to the set", accepted)


def verify_equal_sets(s1, s2, message: str) -> None:
    s1, s2 = set(s1), set(s2)
    diff = s1.difference(s2)
    if diff:
        fatal(message, diff, "present in the former but not the latter")

    diff = s2.difference(s1)
    if diff:
        fatal(message, diff, "present in the latter but not the former")


# The following types provide executors that execute sequentially if the
# environment variable SEQUENTIAL is set to True.
# This is useful in the following situations:
# - Comparing the latencies of sequential and concurrent execution.
# - Profiling to find the bottlenecks, as cProfile is unable to profile child
#   tasks.
# NOTE: When you set the SEQUENTIAL environment variable to force sequential
# execution for the purpose of profiling, be careful as the analysis may not
# misleading, and may deviate substantially from the behavior observed when
# executing concurrently.
# This was found to be the case when the use of ProcessPoolExecutor in Xooxle,
# as opposed to ThreadPoolExecutor, resulted in a degradation in performance by
# a factor of roughly 20! Profiling was misleading, as the bottleneck could only
# be observed when executing concurrently, and when using ProcessPoolExecutor!
# TODO: Prevent the use of futures.ProcessPoolExecutor and
# futures.ThreadPoolExecutor directly in the code, in order for the SEQUENTIAL
# environment variable to be respected everywhere.
def env_bool(name: str) -> bool:
    val = os.getenv(name, "0").lower()
    if val in ["false", "0", ""]:
        return False
    if val in ["true", "1"]:
        return True
    warn(name, "has an unparsable value:", val, "we assume", True)
    return True


SEQUENTIAL = env_bool("SEQUENTIAL")
if SEQUENTIAL:
    info(
        "Sequential execution forced by the",
        "SEQUENTIAL",
        "environment variable",
    )


# NOTE: To make sure any errors encountered during the execution of the child
# tasks propagate to the parent task, make sure to loop over the generator
# returned by the `map` method.
#     with utils.ThreadPoolExecutor() as executor:
#       # Code that uses `data`.
# If the returned data doesn't need to be used, you can simply convert the
# generator to a list:
#     with utils.ThreadPoolExecutor() as executor:
#       list(executor.map(fn, data))
# Our types don't implement a `submit` method despite its convenient because
# it's tricker to mimic, and error propagation with `submit` is also trickier.
class SequentialExecutor:
    def map(self, fn: typing.Callable, *iterables: abc.Iterable):
        return map(fn, *iterables)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        pass


# NOTE: `ProcessPoolExecutor` has a few caveats:
# - It requires all the tasks to be picklable, thus it's problematic with
#   lambdas and closures, and often complains about generators.
# - Our static-scope variables are shared between threads, but not between
#   processes! This can corrupt non-process-safe caches, for example.
# - In our experimentation, processing time often soared when using
#   `ProcessPoolExecutor` instead of `ThreadPoolExecutor`, possibly because of
#   unexpected cache / static-scope behavior.
def process_pool_executor() -> (
    futures.ProcessPoolExecutor | SequentialExecutor
):
    return (
        SequentialExecutor() if SEQUENTIAL else futures.ProcessPoolExecutor()
    )


def thread_pool_executor() -> futures.ThreadPoolExecutor | SequentialExecutor:
    return SequentialExecutor() if SEQUENTIAL else futures.ThreadPoolExecutor()
