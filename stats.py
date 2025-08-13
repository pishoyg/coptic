#!/usr/bin/env python3
"""Collect and process statistics."""

import abc
import argparse
import enum
import itertools
import os
import re
import subprocess
import time
import typing
from collections.abc import Generator

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from dictionary.marcion_sourceforge_net import tsv
from utils import file, lazy, log, sane

_ONE_DAY: int = 24 * 60 * 60
_COMMIT_MESSAGE = "[Stats] Run `make stats`."
_TSV_FILE = "data/stats.tsv"
_TARGET_ANNOTATIONS = 15


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
    help="Print current statistics.",
)

_ = _argparser.add_argument(
    "-g",
    "--graph",
    action="store_true",
    default=False,
    help="Graph saved statistics.",
)

_ = _argparser.add_argument(
    "-r",
    "--reminder",
    action="store_true",
    default=False,
    help="Print a reminder if it has been a while since the stats were last"
    + " collected.",
)


class Dash(enum.Enum):
    """Dash is used to group metrics into dashboards to graph together."""

    # Crum fixes are fields that are not expected to be populated for every
    # entry.
    CRUM_FIXES = "Crum Fixes"
    # Crum appendices represent fields that we seek to populated for most
    # entries.
    CRUM_APPENDICES = "Crum Appendices"
    LOC_BY_LANG = "Lines of Code by Language"
    FOC_BY_LANG = "Files of Code by Language"
    LOC_BY_COMP = "Lines of Code by Component"
    NUM_COMMITS = "Number of Commits"
    NUM_ISSUES = "Number of GitHub Issues"
    NUM_CONTRIBUTORS = "Number of Contributors"


class Stat:
    """A single statistic."""

    def __init__(
        self,
        name: str,
        description: str,
        val: typing.Callable[[], int | str],
        minimum: int | None = None,
        maximum: int | None = None,
        dash: Dash | None = None,
        broken: bool = False,
    ) -> None:
        self._name: str = name
        self._description: str = description
        self._dash: Dash | None = dash
        self._val: int | str | typing.Callable[[], int | str] = val
        self._min: int | None = minimum
        self._max: int | None = maximum
        self._broken: bool = broken

    def name(self) -> str:
        return self._name

    def dashboard(self) -> Dash | None:
        return self._dash

    def dash_key(self) -> str:
        """Get a key that can be used to sort / group stats by dashboard.

        NOTE: This assumes that the Dash enum has unique values, and that none
        of the values is empty.

        Returns:
            A key that can be used to sort / group stats by dashboard.
        """
        if not self._dash:
            return ""
        return self._dash.value

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

    def num(self) -> int:
        """Assert that this is a numerical statistic, and return the value.

        If the statistic doesn't have an integer value, raise an exception.

        Returns:
            Value of the statistic, guaranteed as an integer.
        """
        val: int | str = self.val()
        assert isinstance(val, int)
        return val

    def log(self, enabled: bool = True, indent: bool = False) -> None:
        if not enabled:
            return
        prefix: str = "\t" if indent else ""
        del indent
        if self._broken:
            log.warn(
                f"{prefix}{self._description} (broken):",
                self.val(),
            )
            return
        log.info(f"{prefix}{self._description}:", self.val())


def _zero() -> int:
    return 0


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


class Code(abc.ABC):
    """Code tracks a subset of the files of code for statistics purposes."""

    # We store all files of code in a static property.
    @lazy.LazyStaticProperty
    @staticmethod
    def all_foc() -> list[str]:
        # See our shell environment for the definition of the findexx command.
        paths: list[str] = _run(
            "source .env && findexx . -type f",
        ).splitlines()
        # Make sure the paths are normalized.
        paths = list(map(os.path.normpath, paths))
        return paths

    # Statistic for the total number of files of code.
    @lazy.LazyStaticProperty
    @staticmethod
    def all_foc_stat() -> Stat:
        return Stat(
            "foc",
            "Number of files of code",
            lambda: len(Code.all_foc),
        )

    # Statistic for the total number of lines of code.
    @lazy.LazyStaticProperty
    @staticmethod
    def all_loc_stat() -> Stat:
        return Stat(
            "loc",
            "Number of lines of code",
            lambda: Code._loc(Code.all_foc),
        )

    def __init__(
        self,
        name: str,
        description: str,
        suffixes: list[str] | None = None,
        prefixes: list[str] | None = None,
        basenames: list[str] | None = None,
        dirnames: list[str] | None = None,
        broken: bool = False,
    ) -> None:
        self.files: list[str] = [
            f
            for f in Code.all_foc
            if any(map(f.endswith, suffixes or []))
            or any(map(f.startswith, prefixes or []))
            or os.path.basename(f) in (basenames or [])
            or os.path.dirname(f) in (dirnames or [])
        ]
        self._name: str = name
        self._description: str = description
        self._broken: bool = broken

    @abc.abstractmethod
    def loc_dashboard(self) -> Dash:
        raise NotImplementedError

    def loc(self) -> int:
        return Code._loc(self.files)

    def loc_stat(self) -> Stat:
        """Construct a lines-of-code statistic.

        Returns:
            A lines-of-code statistic based on the subset of files of code
            tracked by this object.
        """
        return Stat(
            f"loc_{self._name}",
            self._description,
            self.loc,
            dash=self.loc_dashboard(),
            broken=self._broken,
        )

    @staticmethod
    def _loc(paths: list[str]) -> int:
        """Count the number of lines in the given list of files.

        Args:
            paths: List of file paths.

        Returns:
            Number of lines in the given list of files.
        """
        return sum(map(len, map(file.readlines, paths)))


class Lang(Code):
    """Lang represents code belonging to a specific language."""

    @typing.override
    def loc_dashboard(self) -> Dash:
        return Dash.LOC_BY_LANG

    def foc(self) -> int:
        return len(self.files)

    # For the code breakdown by language, we provide an additional type of
    # statistic - namely the files-of-code stat.
    def foc_stat(self) -> Stat:
        """Construct a file-of-code statistic.

        Returns:
            A lines-of-code statistic based on the subset of files of code
            tracked by this object.
        """
        return Stat(
            f"foc_{self._name}",
            self._description,
            self.foc,
            dash=Dash.FOC_BY_LANG,
            broken=self._broken,
        )


class Comp(Code):
    @typing.override
    def loc_dashboard(self) -> Dash:
        return Dash.LOC_BY_COMP


class Crum:
    """Crum sheet statistics."""

    @lazy.LazyStaticProperty
    @staticmethod
    def _sheet() -> list[dict[str, str | int | float]]:
        return tsv.roots_sheet().get_all_records()

    def __init__(
        self,
        name: str,
        field: str,
        description: str,
        regex: str | None,
        minimum: int,
        maximum: int,
        dash: Dash | None = None,
    ) -> None:
        """Construct a statistic from Crum's sheet.

        Args:
            name: Name. This will be prefixed by `crum_` to construct the
                statistic name.
            field: Sheet column to base the statistic on. By default, the stat
                value is the number of non-empty cells in the column.
            description: Statistic description.
            regex: An optional regex that can be defined to change the statistic
                behavior. If provided, the stat value will be the total number
                of substrings in all column cells that match the given regex.
            minimum: Minimum valid statistic value.
            maximum: Maximum valid statistic value.
            dash: The dashboard that this statistic belongs to.
        """
        self._field: str = field
        self._regex: str | None = regex
        self.stat: Stat = Stat(
            f"crum_{name}",
            description,
            self.val,
            minimum,
            maximum,
            dash,
        )

    def val(self) -> int:
        if self._regex:
            pattern: re.Pattern[str] = re.compile(self._regex)
            return sum(
                len(pattern.findall(str(row[self._field])))
                for row in Crum._sheet  # pylint: disable=not-an-iterable
            )
        # pylint: disable-next=not-an-iterable
        return sum(bool(row[self._field]) for row in Crum._sheet)


_CRUM_STATS: list[Stat] = [
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
        Dash.CRUM_APPENDICES,
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
    Crum(
        "dawoud",
        "dawoud-pages",
        "Number of words with Dawoud pages",
        None,
        2600,
        3357,
        Dash.CRUM_APPENDICES,
    ).stat,
    Crum(
        "dawoud_sum",
        "dawoud-pages",
        "Total number of Dawoud pages",
        r"[0-9]+",
        4300,
        5000,
    ).stat,
    Crum(
        "notes",
        "notes",
        "Number of editor's notes",
        None,
        4,
        3357,
        Dash.CRUM_FIXES,
    ).stat,
    Crum(
        "root_senses",
        "senses",
        "Number of roots with senses",
        None,
        70,
        3357,
        Dash.CRUM_APPENDICES,
    ).stat,
    Crum(
        "root_senses_sum",
        "senses",
        "Total number of root senses",
        r"[0-9]+",
        160,
        33570,
    ).stat,
    Crum(
        "last_page",
        "crum-last-page",
        "Number of last pages overridden",
        None,
        4,
        3357,
        Dash.CRUM_FIXES,
    ).stat,
    Crum(
        "sisters",
        "sisters",
        "Number of words with sisters",
        None,
        37,
        3357,
        Dash.CRUM_APPENDICES,
    ).stat,
    Crum(
        "sisters_sum",
        "sisters",
        "Total number of sisters",
        r"[0-9]+",
        58,
        33570,
    ).stat,
    Crum(
        "antonyms",
        "antonyms",
        "Number of words with antonyms",
        None,
        2,
        3357,
        Dash.CRUM_APPENDICES,
    ).stat,
    Crum(
        "antonyms_sum",
        "antonyms",
        "Total number of antonyms",
        r"[0-9]+",
        2,
        33570,
    ).stat,
    Crum(
        "homonyms",
        "homonyms",
        "Number of words with homonyms",
        None,
        7,
        3357,
        Dash.CRUM_APPENDICES,
    ).stat,
    Crum(
        "homonyms_sum",
        "homonyms",
        "Total number of homonyms",
        r"[0-9]+",
        7,
        33570,
    ).stat,
    Crum(
        "greek_sisters",
        "greek-sisters",
        "Number of words with Greek sisters",
        None,
        1,
        3357,
        Dash.CRUM_APPENDICES,
    ).stat,
    Crum(
        "greek_sisters_sum",
        "greek-sisters",
        "Total number of Greek sisters",
        r"[0-9]+",
        1,
        3357,
    ).stat,
    Crum(
        "categories",
        "categories",
        "Number of words with categories",
        None,
        30,
        3357,
        Dash.CRUM_APPENDICES,
    ).stat,
    Crum(
        "categories_sum",
        "categories",
        "Total number of categories",
        r"[^,]+",
        30,
        6714,
    ).stat,
    # Since our Crum data source diverged from Marcion, we have no way to
    # track number of typos. In a way, it's irrelevant.
    Stat(
        "crum_type_override",
        "Number of entries with an overridden type",
        _zero,
        dash=Dash.CRUM_FIXES,
        broken=True,
    ),
    Stat(
        "crum_wrd_typos",
        "Number of WRD entries changed (broken)",
        _zero,
        broken=True,
    ),
    Stat(
        "crum_drv_typos",
        "Number of DRV entries changed (broken)",
        _zero,
        broken=True,
    ),
    Stat(
        "crum_typos",
        "Total number of lines changed (broken)",
        _zero,
        broken=True,
    ),
    Stat(
        "crum_pages_changed",
        "Number of pages changed (broken)",
        _zero,
        broken=True,
    ),
]

_MISC_STATS: list[Stat] = [
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
        Dash.NUM_COMMITS,
    ),
    Stat(
        "num_contributors",
        "Number of contributors",
        lambda: len(
            _run("git shortlog --summary --group=author").splitlines(),
        ),
        1,
        10,
        Dash.NUM_CONTRIBUTORS,
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
        Dash.NUM_ISSUES,
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
        Dash.NUM_ISSUES,
    ),
    Stat("timestamp", "Timestamp", lambda: _run("date +%s").strip()),
]

_CODE_BY_LANG: list[Lang] = [
    Lang("python", "Python", [".py"]),
    Lang("make", "Make", basenames=["Makefile"]),
    Lang("css", "CSS", [".css"]),
    Lang("sh", "Shell", [".sh"], basenames=[".env"]),
    Lang("js", "JavaScript", [".mjs"]),
    Lang("md", "Markdown", [".md"]),
    Lang("yaml", "YAML", [".yaml"], basenames=[".yamlfmt", ".yamllint"]),
    Lang("toml", "TOML", [".toml"]),
    Lang(
        "dot",
        "dotfiles",
        basenames=[".gitignore", ".npmrc", "pylintrc", ".checkmake"],
    ),
    Lang(
        "keyboard_layout",
        "Keyboard",
        [
            ".keylayout",
            ".plist",
            ".strings",
        ],
    ),
    Lang("txt", "TXT", [".txt", ".in"]),
    Lang("ts", "TypeScript", [".ts"]),
    Lang("json", "JSON", [".json"]),
    Lang("html", "HTML", [".html"]),
]

_CODE_BY_COMPONENT: list[Comp] = [
    Comp("crum", "Crum", prefixes=["dictionary/marcion_sourceforge_net/"]),
    Comp(
        "andreas",
        "Andreas",
        prefixes=["dictionary/stmacariusmonastery_org/"],
    ),
    Comp(
        "copticsite",
        "Copticsite",
        prefixes=["dictionary/copticsite_com/"],
    ),
    Comp(
        "kellia",
        "Kellia",
        prefixes=["dictionary/kellia_uni_goettingen_de/"],
    ),
    Comp("dawoud", "Dawoud"),  # All files deleted!
    Comp("bible", "Bible", prefixes=["bible/"]),
    Comp("flashcards", "Flashcards", prefixes=["flashcards/"]),
    Comp("grammar", "Grammar"),  # No files yet (if ever)!
    Comp("keyboard", "Keyboard", prefixes=["keyboard/"]),
    Comp("morphology", "Morphology", prefixes=["morphology/"]),
    Comp("site", "Site", prefixes=["docs/"]),
    Comp(
        "shared",
        "shared",
        prefixes=["env/", "xooxle/", "utils/", "pre-commit/", "test/"],
        dirnames=[""],
    ),
]


def _graph():
    # Read the TSV file.
    df: pd.DataFrame = pd.read_csv(_TSV_FILE, sep="\t")

    # Convert the Unix epoch timestamp to a datetime object.
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")

    # Set the timestamp as the index.
    df.set_index("timestamp", inplace=True)

    for dashboard, stats in itertools.groupby(
        sorted(_stats(), key=Stat.dash_key),
        Stat.dashboard,
    ):
        if dashboard is None:
            continue
        names: list[str] = list(map(Stat.name, stats))
        del stats
        plt.figure(figsize=(10, 6))
        for name in names:
            total_points: int = len(df[name])
            interval: int = max(1, total_points // _TARGET_ANNOTATIONS)
            plt.plot(df.index, df[name], label=name)
            for i, (x, y) in enumerate(zip(df.index, df[name])):
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

        plt.title(dashboard.value)
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


def _report(commit: bool, verbose: bool) -> list[Stat]:
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
    stats: list[Stat] = list(_stats(verbose))
    record: dict[str, str | int] = {stat.name(): stat.val() for stat in stats}
    sane.verify_equal_sets(
        set(df.columns),
        set(record.keys()),
        "Collected columns don't match the stats file!",
    )
    if not commit:
        return stats
    df = pd.concat([df, pd.DataFrame([record])], ignore_index=True)
    del record
    file.to_tsv(df, _TSV_FILE)
    _ = _run("git add", _TSV_FILE)
    # We wrap the commit message with single quotes in order to pass it as a
    # message parameter. For this to work, it must not contain any single quotes
    # itself.
    assert "'" not in _COMMIT_MESSAGE
    _ = _run(f"git commit --message '{_COMMIT_MESSAGE}'")
    return stats


def _stats(verbose: bool = False) -> Generator[Stat]:
    yield Code.all_foc_stat
    yield Code.all_loc_stat

    # Verify that the files-of-code breakdown represents a partitioning.
    sane.verify_equal_sets(
        Code.all_foc,
        sum([lang.files for lang in _CODE_BY_LANG], []),
        "The total doesn't equal the some of the parts!",
    )

    # FOC statistics, by language.
    Code.all_foc_stat.log(verbose)
    acc: int = 0
    for stat in map(Lang.foc_stat, _CODE_BY_LANG):
        stat.log(verbose, True)
        acc += stat.num()
        yield stat
    assert acc == Code.all_foc_stat.val()
    del acc

    # LOC statistics, by language.
    Code.all_loc_stat.log(verbose)
    acc = 0
    for stat in map(Lang.loc_stat, _CODE_BY_LANG):
        stat.log(verbose, True)
        acc += stat.num()
        yield stat
    assert acc == Code.all_loc_stat.val()
    del acc

    # LOC statistics, by component.
    acc = 0
    Code.all_loc_stat.log(verbose)
    for stat in map(Comp.loc_stat, _CODE_BY_COMPONENT):
        stat.log(verbose, True)
        acc += stat.num()
        yield stat
    assert acc == Code.all_loc_stat.val()
    del acc

    # Crum statistics.
    log.info("Crum:")
    for stat in _CRUM_STATS:
        stat.log(verbose, True)
        yield stat

    # Miscellaneous statistics.
    for stat in _MISC_STATS:
        stat.log(verbose)
        yield stat

    # Our archived-code tracking is currently broken! It's unlikely to be fixed,
    # because it's not important!
    yield Stat("loc_archive", "Archived Lines of Code", _zero, broken=True)
    yield Stat(
        "loc_inc_archive",
        "Number of lines of code (including Archive)",
        Code.all_loc_stat.val,
        broken=True,
    )


def main():
    args: typing.Any = _argparser.parse_args()
    if args.reminder:
        _check_reminder()
    if args.commit or args.print:
        _report(args.commit, args.print)
    if args.graph:
        _graph()


if __name__ == "__main__":
    main()
