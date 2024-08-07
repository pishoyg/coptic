import os
import pathlib
import shutil

import colorama
import numpy as np
import pandas as pd
import type_enforced

ENFORCED = False


@type_enforced.Enforcer(enabled=ENFORCED)
def warning(*args):
    print(colorama.Fore.RED + "Warning:" + colorama.Fore.YELLOW, *args)
    print(colorama.Fore.RESET, end="")


@type_enforced.Enforcer(enabled=ENFORCED)
def to_tsv(df: pd.DataFrame, path: str):
    df.to_csv(path, sep="\t", index=False)


def clean_dir(dir: str) -> None:
    if os.path.exists(dir):
        assert os.path.isdir(dir)
        shutil.rmtree(dir)
    pathlib.Path(dir).mkdir(parents=True)


def write_tsvs(
    df: pd.DataFrame, tsvs: str, chunk_size: int = 100, zfill: int = 0
) -> None:
    clean_dir(tsvs)
    boundaries = list(range(chunk_size, len(df.index), chunk_size))
    zfill = zfill or len(str(len(boundaries) + 2))
    for idx, chunk in enumerate(np.array_split(df, boundaries)):
        chunk.to_csv(
            os.path.join(tsvs, str(idx).zfill(zfill) + ".tsv"), sep="\t", index=False
        )


def read_tsvs(tsvs: str) -> pd.DataFrame:
    files = [os.path.join(tsvs, basename) for basename in os.listdir(tsvs)]
    files = sorted(files)
    df = pd.DataFrame()
    for f in files:
        cur = pd.read_csv(f, sep="\t", dtype=str, encoding="utf-8").fillna("")
        df = pd.concat([df, cur], ignore_index=True)
    return df
