"""Directory, file, and path helpers."""

import io
import json
import os
import pathlib
import typing
from collections import abc

import pandas as pd

from utils import log


def mkdir(path: str) -> None:
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)


def mk_parent_dir(path: str) -> None:
    pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)


def write(
    content: str,
    path: str,
    report: bool = True,
    fix_newline: bool = True,
    make_dir: bool = False,
) -> None:
    if make_dir:
        mk_parent_dir(path)
    if fix_newline and (not content or content[-1] != "\n"):
        content += "\n"
    with open(path, "w", encoding="utf-8") as f:
        _ = f.write(content)
    if not report:
        return
    log.wrote(path)


def writelines(
    content: abc.Generator[str],
    path: str,
    report: bool = True,
    make_dir: bool = False,
) -> None:
    if make_dir:
        mk_parent_dir(path)
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(content)
    if not report:
        return
    log.wrote(path)


def read(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def readlines(path: str) -> list[str]:
    try:
        with open(path, encoding="utf-8") as f:
            return f.readlines()
    except UnicodeDecodeError:
        with open(path, encoding="utf-16") as f:
            return f.readlines()


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


def json_dumps(j: object, **kwargs: typing.Any) -> str:
    return json.dumps(
        j,
        indent=2,
        ensure_ascii=False,
        allow_nan=False,
        **kwargs,
    )


def read_tsv(tsv: str | io.StringIO) -> pd.DataFrame:
    return pd.read_csv(
        tsv,
        sep="\t",
        dtype=str,
        encoding="utf-8",
        keep_default_na=False,
    ).fillna("")


def to_tsv(df: pd.DataFrame, path: str | pathlib.Path) -> None:
    df.to_csv(path, sep="\t", index=False)
