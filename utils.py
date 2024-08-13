import json
import os
import pathlib
import shutil

import bs4
import colorama
import pandas as pd
import type_enforced

ENFORCED = False


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
def write(content: str, path: str, log: bool = True) -> None:
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
    zfill = zfill or len(str(len(df.index))) + 1  # We add 1 to allow for growth.

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
    soup = bs4.BeautifulSoup(html)
    return soup.get_text()


@type_enforced.Enforcer(enabled=ENFORCED)
def read(path: str) -> str:
    with open(path) as f:
        return f.read()
