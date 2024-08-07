import os
import pathlib
import shutil

import colorama
import pandas as pd
import type_enforced

ENFORCED = False


@type_enforced.Enforcer(enabled=ENFORCED)
def warning(*args):
    print(colorama.Fore.RED + "Warning:" + colorama.Fore.YELLOW, *args)
    print(colorama.Fore.RESET, end="")


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
    df: pd.DataFrame, tsvs: str, chunk_size: int = 100, zfill: int = 0, **kwargs
) -> None:
    clean_dir(tsvs)
    starts = list(range(0, len(df.index), chunk_size))
    zfill = zfill or len(str(len(starts) + 2))
    for idx, start in enumerate(starts):
        chunk = df.iloc[start : start + chunk_size]
        to_tsv(chunk, os.path.join(tsvs, str(idx).zfill(zfill) + ".tsv"), **kwargs)


@type_enforced.Enforcer(enabled=ENFORCED)
def read_tsvs(tsvs: str) -> pd.DataFrame:
    files = [os.path.join(tsvs, basename) for basename in os.listdir(tsvs)]
    files = sorted(files)
    df = pd.DataFrame()
    for f in files:
        cur = read_tsv(f)
        df = pd.concat([df, cur], ignore_index=True)
    return df
