#!/usr/bin/env python3
"""Plot statistics."""

# TODO: (#183) This script was copied from a Bash script, hence its has no OOP.
# It should be redesigned with good OOP practices. There is a lot of code that
# should be deduplicated.

import argparse
import itertools
import os
import re
import subprocess
import time
import typing
from collections import abc

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from dictionary.marcion_sourceforge_net import tsv
from utils import file, log, sane

_ONE_DAY: int = 24 * 60 * 60
_COMMIT_MESSAGE = "[Stats] Run `make stats`."
_TSV_FILE = "data/stats.tsv"
_TARGET_ANNOTATIONS = 15
_PLOT_COLUMNS: dict[str | None, list[str]] = {
    # We ignore the following fields, but we have to include them nevertheless
    # to appease our tests.
    None: [
        # Timestamps
        "date",
        "timestamp",
        # Disk usage
        "disk_usage",
        "disk_usage_human",
        # Noisy code statistics.
        "foc",
        "loc",
        "loc_inc_archive",
        "loc_archive",
        # Noise Crum statistics.
        "crum_sisters_sum",
        "crum_antonyms_sum",
        "crum_dawoud_sum",
        "crum_greek_sisters_sum",
        "crum_homonyms_sum",
        "crum_img_sum",
        "crum_root_senses_sum",
        "crum_categories_sum",
        # Typo statistics are currently broken.
        "crum_drv_typos",
        "crum_pages_changed",
        "crum_typos",
        "crum_wrd_typos",
    ],
    "Crum Fixes": [
        # The following Crum fields are not expected to be populated for every
        # entry.
        "crum_last_page",
        "crum_notes",
        "crum_type_override",
    ],
    "Crum Appendices": [
        # The following Crum fields are ones that we seek to populated for most
        # entries.
        "crum_antonyms",
        "crum_dawoud",
        "crum_greek_sisters",
        "crum_homonyms",
        "crum_img",
        "crum_root_senses",
        "crum_sisters",
        "crum_categories",
    ],
    "Files of Code per Language": [
        "foc_css",
        "foc_dot",
        "foc_html",
        "foc_js",
        "foc_json",
        "foc_keyboard_layout",
        "foc_make",
        "foc_md",
        "foc_python",
        "foc_sh",
        "foc_toml",
        "foc_ts",
        "foc_txt",
        "foc_yaml",
    ],
    "Lines of code per Language": [
        # Lines of code, broken by language.
        "loc_css",
        "loc_dot",
        "loc_html",
        "loc_js",
        "loc_json",
        "loc_keyboard_layout",
        "loc_make",
        "loc_md",
        "loc_python",
        "loc_sh",
        "loc_toml",
        "loc_ts",
        "loc_txt",
        "loc_yaml",
    ],
    "Lines of Code per Project": [
        # Lines of code, broken by project.
        "loc_bible",
        "loc_copticsite",
        "loc_crum",
        "loc_andreas",
        "loc_flashcards",
        "loc_grammar",
        "loc_kellia",
        "loc_keyboard",
        "loc_morphology",
        "loc_shared",
        "loc_site",
        "loc_dawoud",
    ],
    "Number of Commits": [
        "num_commits",
    ],
    "Number of GitHub Issues": [
        "open_issues",
        "closed_issues",
    ],
    "Number of Contributors": [
        "num_contributors",
    ],
}

_argparser: argparse.ArgumentParser = argparse.ArgumentParser(
    description="Process Stats.",
)

_ = _argparser.add_argument(
    "-c",
    "--commit",
    action="store_true",
    default=False,
    help="Save an update to the stats file, and create a commit.",
)

_ = _argparser.add_argument(
    "-p",
    "--print",
    action="store_true",
    default=False,
    help="Collect statistics, and print them to the console.",
)

_ = _argparser.add_argument(
    "-r",
    "--reminder",
    action="store_true",
    default=False,
    help="Print a reminder if it has been a while since the stats were last"
    " collected.",
)


def _run(*command: str) -> str:
    try:
        result = subprocess.run(
            " ".join(command),
            check=True,
            capture_output=True,
            text=True,
            shell=True,
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        log.error("stderr:", e.stderr, "stdout:", e.stdout)
        raise e


class Stat:
    """A single statistic."""

    def __init__(
        self,
        name: str,
        description: str,
        val: int | str | typing.Callable[[], int | str],
        minimum: int | None = None,
        maximum: int | None = None,
        broken: bool = False,
    ) -> None:
        self.name: str = name
        self.description: str = description
        self._val: int | str | typing.Callable[[], int | str] = val
        self._min: int | None = minimum
        self._max: int | None = maximum
        self._broken: bool = broken

    def val(self) -> int | str:
        # Notice that we memorize the value once we've computed it once.
        self._val = (
            self._val if isinstance(self._val, int | str) else self._val()
        )
        if isinstance(self._min, int):
            self._val = int(self._val)
            log.ass(
                self._val >= self._min,
                "value:",
                self._val,
                "minimum",
                self._min,
            )
        if isinstance(self._max, int):
            self._val = int(self._val)
            log.ass(
                self._val <= self._max,
                "value:",
                self._val,
                "maximum",
                self._max,
            )
        return self._val

    def log(self, indent: bool = False) -> None:
        if self._broken:
            log.warn(
                f"{"\t" if indent else ""}{self.description} (broken):",
                self.val(),
            )
            return
        log.info(f"{"\t" if indent else ""}{self.description}:", self.val())


class FilesOfCode:
    """A files-of-code statistic."""

    def __init__(
        self,
        foc: list[str],
        name: str,
        description: str,
        suffixes: list[str] | None = None,
        prefixes: list[str] | None = None,
        basenames: list[str] | None = None,
        dirnames: list[str] | None = None,
        broken: bool = False,
    ) -> None:
        self.name: str = name
        self.description: str = description
        self.files: list[str] = [
            f
            for f in foc
            if any(map(f.endswith, suffixes or []))
            or any(map(f.startswith, prefixes or []))
            or os.path.basename(f) in (basenames or [])
            or os.path.dirname(f) in (dirnames or [])
        ]
        self._broken: bool = broken

    def foc_stat(self) -> Stat:
        return Stat(
            f"foc_{self.name}",
            self.description,
            len(self.files),
            broken=self._broken,
        )

    def loc_stat(self) -> Stat:
        val: int = sum(len(file.readlines(path)) for path in self.files)
        return Stat(
            f"loc_{self.name}",
            self.description,
            val,
            broken=self._broken,
        )


def _crum_stat(
    sheet: list[dict[str, int | str | float]],
    name: str,
    field: str,
    description: str,
    regex: str | None,
    minimum: int,
    maximum: int,
) -> Stat:
    val: int
    if regex:
        pattern: re.Pattern[str] = re.compile(regex)
        val = sum(len(pattern.findall(str(row[field]))) for row in sheet)
    else:
        val = sum(bool(row[field]) for row in sheet)

    return Stat(f"crum_{name}", description, val, minimum, maximum)


def _plot():
    # Read the TSV file.
    df = pd.read_csv(_TSV_FILE, sep="\t")
    # Perform basic validation on _PLOT_COLUMNS.
    sane.verify_equal_sets(
        df.columns,
        itertools.chain(*_PLOT_COLUMNS.values()),
        "Fields included and excluded from plotting don't add up!",
    )
    for key, columns in _PLOT_COLUMNS.items():
        log.ass(columns, key, "is empty!")

    # Convert the Unix epoch timestamp to a datetime object.
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")

    # Set the timestamp as the index.
    df.set_index("timestamp", inplace=True)

    # Plot each list of column names.
    for title, columns in _PLOT_COLUMNS.items():
        if title is None:
            continue
        plt.figure(figsize=(10, 6))
        for column in columns:
            total_points: int = len(df[column])
            interval: int = max(1, total_points // _TARGET_ANNOTATIONS)
            plt.plot(df.index, df[column], label=column)
            for i, (x, y) in enumerate(zip(df.index, df[column])):
                if not np.isfinite(y):
                    continue
                if i == total_points - 1 or (
                    i % interval == 0 and total_points - i >= interval / 2
                ):
                    plt.text(
                        x,
                        y,
                        str(int(y)),
                        ha="center",
                        va="bottom",
                        fontsize=8,
                        color="black",
                    )

        plt.title(title)
        plt.xlabel("Time")
        plt.ylabel("Values")
        plt.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()


def _check_reminder():
    df = file.read_tsv(_TSV_FILE)
    if time.time() - int(df["timestamp"].iloc[-1]) >= _ONE_DAY:
        log.warn("Reminder: Run ", "make stats")


def _normalize(path: str) -> str:
    return path[2:] if path.startswith("./") else path


def _loc(paths: list[str]) -> int:
    return sum(len(file.readlines(path)) for path in paths)


def _report(commit: bool) -> None:
    if commit:
        log.assass(
            not _run("git status --short"),
            "The repo is dirty. Collecting stats should be done on a clean"
            + " worktree."
            + " Please stash your changes."
            + " Ideally, you should also run it on a commit that has already"
            + " been pushed to the origin.",
        )

    df: pd.DataFrame = file.read_tsv(_TSV_FILE)
    record: dict[str, str | int] = {s.name: s.val() for s in _report_aux()}
    sane.verify_equal_sets(
        set(df.columns),
        set(record.keys()),
        "Collected columns don't match the stats file!",
    )
    if not commit:
        return
    df = pd.concat([df, pd.DataFrame([record])], ignore_index=True)
    file.to_tsv(df, _TSV_FILE)
    _ = _run("git add", _TSV_FILE)
    # We wrap the commit message with single quotes in order to pass it as a
    # message parameter. For this to work, it must not contain any single quotes
    # itself.
    assert "'" not in _COMMIT_MESSAGE
    _ = _run(f"git commit --message '{_COMMIT_MESSAGE}'")


def _report_aux() -> abc.Generator[Stat]:
    yield from _code_stats()
    yield from _crum_stats()
    yield from _misc_stats()


def _code_stats() -> abc.Generator[Stat]:
    # All files of code.
    foc: list[str] = _run("source .env && findexx . -type f").splitlines()
    foc = list(map(_normalize, foc))

    # Total number of lines of code.
    loc: int = _loc(foc)

    foc_stat: Stat = Stat("foc", "Number of files of code", len(foc))
    loc_stat: Stat = Stat("loc", "Number of lines of code", loc)

    yield foc_stat
    yield loc_stat
    yield Stat(
        "loc_inc_archive",
        "Number of lines of code (including Archive)",
        loc,
        broken=True,
    )

    foc_by_lang: list[FilesOfCode] = [
        FilesOfCode(foc, "python", "Python", [".py"]),
        FilesOfCode(foc, "make", "Make", basenames=["Makefile"]),
        FilesOfCode(foc, "css", "CSS", [".css"]),
        FilesOfCode(foc, "sh", "Shell", [".sh"], basenames=[".env"]),
        FilesOfCode(foc, "js", "JavaScript", [".mjs"]),
        FilesOfCode(foc, "md", "Markdown", [".md"]),
        FilesOfCode(
            foc,
            "yaml",
            "YAML",
            [".yaml"],
            basenames=[".yamlfmt", ".yamllint"],
        ),
        FilesOfCode(foc, "toml", "TOML", [".toml"]),
        FilesOfCode(
            foc,
            "dot",
            "dotfiles",
            basenames=[".gitignore", ".npmrc", "pylintrc", ".checkmake"],
        ),
        FilesOfCode(
            foc,
            "keyboard_layout",
            "Keyboard",
            [
                ".keylayout",
                ".plist",
                ".strings",
            ],
        ),
        FilesOfCode(foc, "txt", "TXT", [".txt", ".in"]),
        FilesOfCode(foc, "ts", "TypeScript", [".ts"]),
        FilesOfCode(foc, "json", "JSON", [".json"]),
        FilesOfCode(foc, "html", "HTML", [".html"]),
    ]

    # Verify that the breakdown represents a partitioning.
    sane.verify_equal_sets(
        foc,
        sum([lang.files for lang in foc_by_lang], []),
        "The total doesn't equal the some of the parts!",
    )

    foc_stats: list[Stat] = [lang.foc_stat() for lang in foc_by_lang]
    assert sum(int(stat.val()) for stat in foc_stats) == foc_stat.val()
    foc_stat.log()
    for s in foc_stats:
        s.log(True)
    yield from foc_stats
    del foc_stats

    del foc_stat

    loc_stats: list[Stat] = [lang.loc_stat() for lang in foc_by_lang]
    assert sum(int(stat.val()) for stat in loc_stats) == loc_stat.val()
    loc_stat.log()
    for s in loc_stats:
        s.log(True)
    yield from loc_stats
    del loc_stats

    del foc_by_lang

    foc_by_component: list[FilesOfCode] = [
        FilesOfCode(foc, "archive", "Archive", broken=True),
        FilesOfCode(
            foc,
            "crum",
            "Crum",
            prefixes=["dictionary/marcion_sourceforge_net/"],
        ),
        FilesOfCode(
            foc,
            "andreas",
            "Andreas",
            prefixes=["dictionary/stmacariusmonastery_org/"],
        ),
        FilesOfCode(
            foc,
            "copticsite",
            "Copticsite",
            prefixes=["dictionary/copticsite_com/"],
        ),
        FilesOfCode(
            foc,
            "kellia",
            "Kellia",
            prefixes=["dictionary/kellia_uni_goettingen_de/"],
        ),
        FilesOfCode(foc, "dawoud", "Dawoud"),  # All files deleted!
        FilesOfCode(foc, "bible", "Bible", prefixes=["bible/"]),
        FilesOfCode(foc, "flashcards", "Flashcards", prefixes=["flashcards/"]),
        FilesOfCode(foc, "grammar", "Grammar"),  # No files yet (if ever)!
        FilesOfCode(foc, "keyboard", "Keyboard", prefixes=["keyboard/"]),
        FilesOfCode(foc, "morphology", "Morphology", prefixes=["morphology/"]),
        FilesOfCode(foc, "site", "Site", prefixes=["docs/"]),
        FilesOfCode(
            foc,
            "shared",
            "shared",
            prefixes=["env/", "xooxle/", "utils/", "pre-commit/", "test/"],
            dirnames=[""],
        ),
    ]
    comp_stats: list[Stat] = [comp.loc_stat() for comp in foc_by_component]
    assert sum(int(comp.val()) for comp in comp_stats) == loc
    loc_stat.log()
    for s in comp_stats:
        s.log(True)
    yield from comp_stats
    del foc_by_component, comp_stats, loc_stat
    del foc, loc


def _crum_stats() -> abc.Generator[Stat]:
    crum: list[dict[str, str | int | float]] = (
        tsv.roots_sheet().get_all_records()
    )
    crum_stats: list[Stat] = [
        Stat(
            "crum_img",
            "Number of words with images",
            lambda: len(
                {
                    basename.split("-")[0]
                    for basename in os.listdir(
                        "dictionary/marcion_sourceforge_net/data/img/",
                    )
                },
            ),
            700,
            3357,
        ),
        Stat(
            "crum_img_sum",
            "Total number of images",
            lambda: len(
                os.listdir("dictionary/marcion_sourceforge_net/data/img/"),
            ),
            1200,
            33570,
        ),
        _crum_stat(
            crum,
            "dawoud",
            "dawoud-pages",
            "Number of words with Dawoud pages",
            None,
            2600,
            3357,
        ),
        _crum_stat(
            crum,
            "dawoud_sum",
            "dawoud-pages",
            "Total number of Dawoud pages",
            r"[0-9]+",
            4300,
            5000,
        ),
        _crum_stat(
            crum,
            "notes",
            "notes",
            "Number of editor's notes",
            None,
            4,
            3357,
        ),
        _crum_stat(
            crum,
            "root_senses",
            "senses",
            "Number of roots with senses",
            None,
            70,
            3357,
        ),
        _crum_stat(
            crum,
            "root_senses_sum",
            "senses",
            "Total number of root senses",
            r"[0-9]+",
            160,
            33570,
        ),
        _crum_stat(
            crum,
            "last_page",
            "crum-last-page",
            "Number of Crum last pages overridden",
            None,
            4,
            3357,
        ),
        _crum_stat(
            crum,
            "sisters",
            "sisters",
            "Number of words with sisters",
            None,
            37,
            3357,
        ),
        _crum_stat(
            crum,
            "sisters_sum",
            "sisters",
            "Total number of sisters",
            r"[0-9]+",
            58,
            33570,
        ),
        _crum_stat(
            crum,
            "antonyms",
            "antonyms",
            "Number of words with antonyms",
            None,
            2,
            3357,
        ),
        _crum_stat(
            crum,
            "antonyms_sum",
            "antonyms",
            "Total number of antonyms",
            r"[0-9]+",
            2,
            33570,
        ),
        _crum_stat(
            crum,
            "homonyms",
            "homonyms",
            "Number of words with homonyms",
            None,
            7,
            3357,
        ),
        _crum_stat(
            crum,
            "homonyms_sum",
            "homonyms",
            "Total number of homonyms",
            r"[0-9]+",
            7,
            33570,
        ),
        _crum_stat(
            crum,
            "greek_sisters",
            "greek-sisters",
            "Number of words with Greek sisters",
            None,
            1,
            3357,
        ),
        _crum_stat(
            crum,
            "greek_sisters_sum",
            "greek-sisters",
            "Total number of Greek sisters",
            r"[0-9]+",
            1,
            3357,
        ),
        _crum_stat(
            crum,
            "categories",
            "categories",
            "Number of words with categories",
            None,
            30,
            3357,
        ),
        _crum_stat(
            crum,
            "categories_sum",
            "categories",
            "Total number of categories",
            r"[^,]+",
            30,
            6714,
        ),
        # Since our Crum data source diverged from Marcion, we have no way to
        # track number of typos. In a way, it's irrelevant.
        Stat(
            "crum_type_override",
            "Number of Crum entries with an overridden type",
            0,
            broken=True,
        ),
        Stat(
            "crum_wrd_typos",
            "Number of Crum WRD entries changed (broken)",
            0,
            broken=True,
        ),
        Stat(
            "crum_drv_typos",
            "Number of Crum DRV entries changed (broken)",
            0,
            broken=True,
        ),
        Stat(
            "crum_typos",
            "Total number of Crum lines changed (broken)",
            0,
            broken=True,
        ),
        Stat(
            "crum_pages_changed",
            "Number of Crum pages changed (broken)",
            0,
            broken=True,
        ),
    ]
    log.info("Crum:")
    for s in crum_stats:
        s.log(True)
    yield from crum_stats


def _misc_stats() -> abc.Generator[Stat]:
    misc_stats: list[Stat] = [
        Stat(
            "disk_usage",
            "Disk usage",
            lambda: _run("du --apparent-size --summarize .").split("\t")[0],
            6291456,
            88000000,
        ),
        Stat(
            "disk_usage_human",
            "Disk usage",
            lambda: _run(
                "du --apparent-size --human-readable --summarize .",
            ).split("\t")[0],
        ),
        Stat("date", "Date and Time", lambda: _run("date").strip()),
        Stat(
            "num_commits",
            "Number of commits",
            lambda: _run("git rev-list --count --all"),
            1300,
            10000,
        ),
        Stat(
            "num_contributors",
            "Number of contributors",
            lambda: len(
                _run("git shortlog --summary --group=author").splitlines(),
            ),
            1,
            10,
        ),
        Stat(
            "open_issues",
            "Number of open issues",
            lambda: _run(
                "gh issue list",
                "--state open",
                "--json number",
                "--jq length",
                "--limit 10000",
            ),
            1,
            300,
        ),
        Stat(
            "closed_issues",
            "Number of closed issues",
            lambda: _run(
                "gh issue list",
                "--state closed",
                "--json number",
                "--jq length",
                "--limit 10000",
            ),
            300,
            3000,
        ),
        Stat("timestamp", "Timestamp", lambda: _run("date +%s").strip()),
    ]
    for s in misc_stats:
        s.log()
    yield from misc_stats


def main():
    args: typing.Any = _argparser.parse_args()
    if args.reminder:
        _check_reminder()
    elif args.commit or args.print:
        _report(args.commit)
    else:
        # Default behavior is to simply plot the statistics.
        _plot()


if __name__ == "__main__":
    main()
