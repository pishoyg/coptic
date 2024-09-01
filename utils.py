import collections
import json
import os
import pathlib
import re
import shutil
import typing

import bs4
import colorama
import gspread
import pandas as pd
from oauth2client import service_account  # type: ignore[import-untyped]

INTEGER_RE = re.compile("[0-9]+")
MAX_INTEGER_LENGTH = 10


def _print(color, severity, recolor, *args, suppress: bool = False):
    print(
        colorama.Style.DIM
        + color
        + ("" if suppress else severity.capitalize() + ": ")
        + colorama.Style.NORMAL
        + str(args[0])
        + (" " if args[0] and len(args) > 1 else "")
        + recolor
        + ("".join(map(str, args[1:2])))
        + color,
        *args[2:],
    )
    print(colorama.Style.RESET_ALL, end="")


def info(*args):
    _print(colorama.Fore.GREEN, "info", colorama.Fore.BLUE, *args)


def warn(*args):
    _print(colorama.Fore.YELLOW, "warn", colorama.Fore.CYAN, *args)


def error(*args):
    _print(colorama.Fore.RED, "error", colorama.Fore.MAGENTA, *args)


def fatal(*args):
    _print(colorama.Fore.RED, "fatal", colorama.Fore.MAGENTA, *args)
    exit(1)


def write(
    content: str,
    path: str,
    log: bool = True,
    fix_newline: bool = True,
) -> None:
    if fix_newline and (not content or content[-1] != "\n"):
        content += "\n"
    with open(path, "w") as f:
        f.write(content)
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


def clean_dir(dir: str) -> None:
    if os.path.exists(dir):
        assert os.path.isdir(dir)
        shutil.rmtree(dir)
    pathlib.Path(dir).mkdir(parents=True)


def write_tsvs(
    df: pd.DataFrame,
    tsvs: str,
    chunk_size: int = 100,
    zfill: int = 0,
    **kwargs,
) -> None:
    clean_dir(tsvs)
    starts = list(range(0, len(df.index), chunk_size))
    # We add 1 to allow for growth.
    zfill = zfill or len(str(len(df.index))) + 1

    def iota(i):
        return str(i).zfill(zfill)

    for start in starts:
        chunk = df.iloc[start : start + chunk_size]
        basename = f"{iota(start+1)}_{iota(start+chunk_size)}.tsv"
        to_tsv(chunk, os.path.join(tsvs, basename), **kwargs)
    wrote(tsvs)


def read_tsvs(tsvs: str, sort_values_by=None) -> pd.DataFrame:
    files = [os.path.join(tsvs, basename) for basename in os.listdir(tsvs)]
    files = sorted(files)
    df = pd.DataFrame()
    for f in files:
        cur = read_tsv(f)
        df = pd.concat([df, cur], ignore_index=True)
    if sort_values_by:
        df.sort_values(sort_values_by, inplace=True)
    return df


def html_text(html: str) -> str:
    soup = bs4.BeautifulSoup(html, "html.parser")
    return soup.get_text()


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


def verify_all_belong_to_set(arr, accepted: set[str], message: str) -> None:
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


def download_gsheet(
    gspread_url: str,
    out_tsv: str,
    worksheet: int = 0,
    columns: typing.Optional[list[str]] = None,
) -> None:
    GSPREAD_SCOPE = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
    ]
    credentials = (
        service_account.ServiceAccountCredentials.from_json_keyfile_name(
            os.environ["JSON_KEYFILE_NAME"],
            GSPREAD_SCOPE,
        )
    )
    sheet = gspread.authorize(credentials).open_by_url(gspread_url)
    records = sheet.get_worksheet(worksheet).get_all_records()
    df = pd.DataFrame(records)
    df.to_csv(out_tsv, sep="\t", index=False, columns=columns)
