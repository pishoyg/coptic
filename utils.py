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
import type_enforced
from oauth2client import service_account

ENFORCED = False

INTEGER_RE = re.compile("[0-9]+")
MAX_INTEGER_LENGTH = 10


@type_enforced.Enforcer(enabled=ENFORCED)
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


@type_enforced.Enforcer(enabled=ENFORCED)
def info(*args):
    _print(colorama.Fore.GREEN, "info", colorama.Fore.BLUE, *args)


@type_enforced.Enforcer(enabled=ENFORCED)
def warn(*args):
    _print(colorama.Fore.YELLOW, "warn", colorama.Fore.CYAN, *args)


@type_enforced.Enforcer(enabled=ENFORCED)
def error(*args):
    _print(colorama.Fore.RED, "error", colorama.Fore.MAGENTA, *args)


@type_enforced.Enforcer(enabled=ENFORCED)
def fatal(*args):
    _print(colorama.Fore.RED, "fatal", colorama.Fore.MAGENTA, *args)
    exit(1)


@type_enforced.Enforcer(enabled=ENFORCED)
def write(content: str, path: str, log: bool = True, fix_newline: bool = True) -> None:
    if fix_newline and (not content or content[-1] != "\n"):
        content += "\n"
    with open(path, "w") as f:
        f.write(content)
    if not log:
        return
    wrote(path)


@type_enforced.Enforcer(enabled=ENFORCED)
def wrote(path: str) -> None:
    info("Wrote", path)


@type_enforced.Enforcer(enabled=ENFORCED)
def json_dumps(j, **kwargs) -> str:
    return json.dumps(j, indent=2, ensure_ascii=False, allow_nan=False, **kwargs)


@type_enforced.Enforcer(enabled=ENFORCED)
def to_tsv(df: pd.DataFrame, path: str, **kwargs):
    df.to_csv(path, sep="\t", index=False, **kwargs)


@type_enforced.Enforcer(enabled=ENFORCED)
def read_tsv(path: str) -> pd.DataFrame:
    return pd.read_csv(path, sep="\t", dtype=str, encoding="utf-8").fillna("")


@type_enforced.Enforcer(enabled=ENFORCED)
def clean_dir(dir: str) -> None:
    if os.path.exists(dir):
        assert os.path.isdir(dir)
        shutil.rmtree(dir)
    pathlib.Path(dir).mkdir(parents=True)


@type_enforced.Enforcer(enabled=ENFORCED)
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


@type_enforced.Enforcer(enabled=ENFORCED)
def read_tsvs(tsvs: str) -> pd.DataFrame:
    files = [os.path.join(tsvs, basename) for basename in os.listdir(tsvs)]
    files = sorted(files)
    df = pd.DataFrame()
    for f in files:
        cur = read_tsv(f)
        df = pd.concat([df, cur], ignore_index=True)
    return df


@type_enforced.Enforcer(enabled=ENFORCED)
def html_text(html: str) -> str:
    soup = bs4.BeautifulSoup(html, "html.parser")
    return soup.get_text()


@type_enforced.Enforcer(enabled=ENFORCED)
def read(path: str) -> str:
    with open(path) as f:
        return f.read()


@type_enforced.Enforcer(enabled=ENFORCED)
def paths(dir: str) -> list[str]:
    return [os.path.join(dir, f) for f in os.listdir(dir)]


@type_enforced.Enforcer(enabled=ENFORCED)
def splitext(path: str) -> tuple[str, str]:
    return os.path.splitext(os.path.basename(path))


@type_enforced.Enforcer(enabled=ENFORCED)
def stem(path: str) -> str:
    stem, _ = splitext(path)
    return stem


@type_enforced.Enforcer(enabled=ENFORCED)
def stems(paths: list[str]) -> list[str]:
    return list(map(stem, paths))


@type_enforced.Enforcer(enabled=ENFORCED)
def ext(path: str) -> str:
    _, ext = splitext(path)
    return ext


@type_enforced.Enforcer(enabled=ENFORCED)
def exts(paths: list[str]) -> list[str]:
    return list(map(ext, paths))


@type_enforced.Enforcer(enabled=ENFORCED)
def use_html_line_breaks(text: str) -> str:
    return text.replace("\n", "<br/>")


@type_enforced.Enforcer(enabled=ENFORCED)
def _semver_sort_key(path: str) -> list[str]:
    path = os.path.basename(path)
    return [x.zfill(MAX_INTEGER_LENGTH) for x in INTEGER_RE.findall(path)] + [path]


@type_enforced.Enforcer(enabled=ENFORCED)
def sort_semver(paths: list[str]) -> list[str]:
    return sorted(paths, key=_semver_sort_key)


@type_enforced.Enforcer(enabled=ENFORCED)
def verify_unique(arr, message: str) -> None:
    dupes = [item for item, count in collections.Counter(arr).items() if count > 1]
    if dupes:
        fatal(message, "duplicate elements:", dupes)


@type_enforced.Enforcer(enabled=ENFORCED)
def verify_all_belong_to_set(arr, accepted: set[str], message: str) -> None:
    for x in arr:
        if x in accepted:
            continue
        fatal(message, x, "does not belong to the set", accepted)


@type_enforced.Enforcer(enabled=ENFORCED)
def verify_equal_sets(s1, s2, message: str) -> None:
    s1, s2 = set(s1), set(s2)
    diff = s1.difference(s2)
    if diff:
        fatal(message, diff, "present in the former but not the latter")

    diff = s2.difference(s1)
    if diff:
        fatal(message, diff, "present in the latter but not the former")


@type_enforced.Enforcer(enabled=ENFORCED)
def download_gsheet(
    gspread_url: str,
    out_tsv: str,
    columns: typing.Optional[list[str]] = None,
) -> None:
    GSPREAD_SCOPE = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
    ]
    credentials = service_account.ServiceAccountCredentials.from_json_keyfile_name(
        os.environ["JSON_KEYFILE_NAME"], GSPREAD_SCOPE
    )
    sheet = gspread.authorize(credentials).open_by_url(gspread_url)
    records = sheet.get_worksheet(0).get_all_records()
    df = pd.DataFrame(records)
    df.to_csv(out_tsv, sep="\t", index=False, columns=columns)
