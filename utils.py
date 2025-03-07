# TODO: This file is too big. We should split it up into multiple files.
import collections
import json
import os
import pathlib
import re
import typing
from concurrent import futures

import colorama
import gspread
import gspread_dataframe  # type: ignore[import-untyped]
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

INTEGER_RE = re.compile("[0-9]+")
MAX_INTEGER_LENGTH = 10

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
    next: str = "",
    prev: str = "",
    scripts: list[str] = [],
    epub: bool = False,
) -> str:
    assert title
    if epub:
        assert not page_class
        assert not search
        assert not next
        assert not prev
        assert not scripts
    return "".join(
        html_head_aux(title, page_class, search, next, prev, scripts, epub),
    )


def html_head_aux(
    title: str,
    page_class: str,
    search: str,
    next: str,
    prev: str,
    scripts: list[str],
    epub: bool = False,
) -> typing.Generator[str]:
    yield "<!DOCTYPE html>"
    yield "<head>"
    yield f"<title>{title}</title>"
    if epub:
        # None of what remains is relevant to EPUB.
        yield "</head>"
        return

    yield CHARSET_TAG
    yield STYLE_TAG
    yield ICON_TAG
    yield GOOGLE_TAG
    if search:
        yield f'<link href="{search}" rel="search">'
    if next:
        yield f'<link href="{next}" rel="next">'
    if prev:
        yield f'<link href="{prev}" rel="prev">'
    if page_class:
        yield f"<script>const {page_class} = true;</script>"
    for script in scripts:
        yield f'<script defer src="{script}" type="text/javascript"></script>'
    yield "</head>"


def _print(
    color,
    severity,
    recolor,
    *args,
    suppress: bool = False,
    throw: bool = False,
):
    message: str = (
        colorama.Style.DIM
        + color
        + ("" if suppress else severity.capitalize() + ": ")
        + colorama.Style.NORMAL
        + " ".join(
            [
                (recolor if idx % 2 else color) + str(arg)
                for idx, arg in enumerate(args)
            ],
        )
        + colorama.Style.RESET_ALL
    )
    if throw:
        raise Exception(message)
    else:
        print(message)


def info(*args):
    """Log an informational message."""
    _print(colorama.Fore.GREEN, "info", colorama.Fore.BLUE, *args)


def warn(*args):
    """Log a warning."""
    _print(colorama.Fore.YELLOW, "warn", colorama.Fore.CYAN, *args)


def error(*args):
    """Log an error."""
    _print(colorama.Fore.RED, "error", colorama.Fore.MAGENTA, *args)


def err(cond, *args):
    """If the condition is not satisfied, log an error."""
    if not cond:
        error(*args)


def throw(*args):
    """Throw an exception."""
    _print(
        colorama.Fore.RED,
        "error",
        colorama.Fore.MAGENTA,
        *args,
        throw=True,
    )


def ass(cond, *args):
    """Assert!

    If the condition is not satisfied, throw an error.
    """
    if not cond:
        throw(*args)


def fatal(*args):
    """Log an error and exit with a nonzero status!"""
    _print(colorama.Fore.RED, "fatal", colorama.Fore.MAGENTA, *args)
    exit(1)


def assass(cond, *args):
    """Assassinate.

    If a condition is not satisfied, exit with a nonzero status.
    """
    if not cond:
        fatal(*args)


def mkdir(path: str) -> None:
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)


def mk_parent_dir(path: str) -> None:
    pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)


def write(
    content: str,
    path: str,
    log: bool = True,
    fix_newline: bool = True,
    mkdir: bool = False,
) -> None:
    if mkdir:
        mk_parent_dir(path)
    if fix_newline and (not content or content[-1] != "\n"):
        content += "\n"
    with open(path, "w") as f:
        f.write(content)
    if not log:
        return
    wrote(path)


def writelines(
    content: typing.Generator[str],
    path: str,
    log: bool = True,
    mkdir: bool = False,
) -> None:
    if mkdir:
        mk_parent_dir(path)
    with open(path, "w") as f:
        f.writelines(content)
    if not log:
        return
    wrote(path)


def wrote(path: str) -> None:
    info("Wrote", path)


def json_dumps(j, **kwargs) -> str:
    return json.dumps(
        j,
        indent=2,
        ensure_ascii=False,
        allow_nan=False,
        **kwargs,
    )


def to_tsv(df: pd.DataFrame, path: str, **kwargs):
    df.to_csv(path, sep="\t", index=False, **kwargs)


def read_tsv(path: str, sort_values_by=None) -> pd.DataFrame:
    df = pd.read_csv(path, sep="\t", dtype=str, encoding="utf-8").fillna("")
    if sort_values_by:
        df.sort_values(sort_values_by, inplace=True)
    return df


_gclient: gspread.Client | None = None


def get_gclient() -> gspread.Client:
    global _gclient
    if _gclient:
        return _gclient
    credentials = (
        service_account.ServiceAccountCredentials.from_json_keyfile_name(
            JSON_KEYFILE_NAME,
            GSPREAD_SCOPE,
        )
    )
    _gclient = gspread.authorize(credentials)
    return _gclient


def read_gspread(
    gspread_name: str,
    worksheet: int = 0,
):
    return get_gclient().open(gspread_name).get_worksheet(worksheet)


def get_column_index(worksheet, column: str) -> int:
    for idx, value in enumerate(worksheet.row_values(1)):
        if value == column:
            return idx + 1  # Google  Sheets uses 1-based indexing.
    fatal(column, "not found in sheet")
    return -1  # Appease the linter.


def write_gspread(
    gspread_name: str,
    df: pd.DataFrame,
    worksheet: int = 0,
) -> None:
    gspread_dataframe.set_with_dataframe(
        get_gclient().open(gspread_name).get_worksheet(worksheet),
        df,
    )


def read(path: str) -> str:
    with open(path) as f:
        return f.read()


def paths(dir: str) -> list[str]:
    return [os.path.join(dir, f) for f in os.listdir(dir)]


def splitext(path: str) -> tuple[str, str]:
    return os.path.splitext(os.path.basename(path))


def stem(path: str) -> str:
    stem, _ = splitext(path)
    return stem


def stems(paths: list[str]) -> list[str]:
    return list(map(stem, paths))


def ext(path: str) -> str:
    _, ext = splitext(path)
    return ext


def exts(paths: list[str]) -> list[str]:
    return list(map(ext, paths))


def split(line: str, *args) -> list[str]:
    """Split a string, discarding empty entries."""
    return list(filter(None, line.split(*args)))


def ssplit(line: str, *args) -> list[str]:
    """Split a string, stripping whitespace from each entry, and discarding
    empty entries."""
    return list(
        filter(None, map(lambda word: word.strip(), line.split(*args))),
    )


def use_html_line_breaks(text: str) -> str:
    return text.replace("\n", "<br/>")


def _semver_sort_key(path: str) -> list[str]:
    path = os.path.basename(path)
    return [x.zfill(MAX_INTEGER_LENGTH) for x in INTEGER_RE.findall(path)] + [
        path,
    ]


def sort_semver(paths: list[str]) -> list[str]:
    return sorted(paths, key=_semver_sort_key)


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
# - Profiling to find the bottlenecks, as cProfile is unable to profile the
#   tasks.
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
    def map(self, fn: typing.Callable, *iterables: typing.Iterable):
        return map(fn, *iterables)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        pass


def ProcessPoolExecutor() -> futures.ProcessPoolExecutor | SequentialExecutor:
    return (
        SequentialExecutor() if SEQUENTIAL else futures.ProcessPoolExecutor()
    )


def ThreadPoolExecutor() -> futures.ThreadPoolExecutor | SequentialExecutor:
    return SequentialExecutor() if SEQUENTIAL else futures.ThreadPoolExecutor()
