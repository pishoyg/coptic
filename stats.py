#!/usr/bin/env python3
"""Plot statistics."""
# TODO: (#183) This script was copied from a Bash script, hence its has no OOP.
# It should be redesigned with good OOP practices. There is a lot of code that
# should be deduplicated.

import argparse
import os
import re
import subprocess
import time

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from dictionary.marcion_sourceforge_net import tsv as crum
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


def _validate(df: pd.DataFrame) -> None:
    available: set[str] = set(df.columns)
    included: set[str] = set(
        sum(
            [
                _PLOT_COLUMNS[key]
                for key, _ in _PLOT_COLUMNS.items()
                if key is not None
            ],
            [],
        ),
    )
    excluded: set[str] = set(_PLOT_COLUMNS[None])
    if available != (included | excluded):
        log.fatal(
            "Absent columns:",
            available - (included | excluded),
            "Extra columns",
            (included | excluded) - available,
        )
    dupe = included & excluded
    if dupe:
        log.fatal(
            "The following elements are marked as excluded although they are"
            " used:",
            dupe,
        )
    del dupe
    for key, columns in _PLOT_COLUMNS.items():
        if not columns:
            log.fatal(key, "is empty!")


def _plot():
    # Read the TSV file.
    df = pd.read_csv(_TSV_FILE, sep="\t")
    _validate(df)

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


def _loc_prefix(foc: list[str], prefix: str) -> int:
    prefix = _normalize(prefix)
    foc = [f for f in foc if f.startswith(prefix)]
    log.ass(foc, "No files of code start with the prefix", prefix)
    return _loc(foc)


def _sheet_nonempty(
    sheet: list[dict[str, str | int | float]],
    col: str,
) -> int:
    return sum(bool(row[col]) for row in sheet)


def _sheet_sum_regex_matches(
    sheet: list[dict[str, str | int | float]],
    col: str,
    regex: str,
) -> int:
    pattern: re.Pattern[str] = re.compile(regex)
    return sum(len(pattern.findall(str(row[col]))) for row in sheet)


def _report(commit: bool) -> None:
    if commit:
        log.assass(
            not _run("git", "status", "--short"),
            "The repo is dirty. Collecting stats should be done on a clean"
            + " worktree."
            + " Please stash your changes."
            + " Ideally, you should also run it on a commit that has already"
            + " been pushed to the origin.",
        )

    foc: list[str] = _run(
        "source",
        ".env",
        "&&",
        "findexx",
        ".",
        "-type",
        "f",
    ).splitlines()
    foc = list(map(_normalize, foc))

    foc_python = [f for f in foc if f.endswith(".py")]
    foc_make = [f for f in foc if f == "Makefile"]
    foc_css = [f for f in foc if f.endswith(".css")]
    foc_sh = [f for f in foc if f.endswith(".sh") or f == ".env"]
    foc_js = [f for f in foc if file.ext(f) in [".mjs"]]
    foc_md = [f for f in foc if f.endswith(".md")]
    foc_yaml = [
        f for f in foc if f.endswith(".yaml") or f in [".yamlfmt", ".yamllint"]
    ]
    foc_toml = [f for f in foc if f.endswith(".toml")]
    foc_dot = [
        f
        for f in foc
        if f in [".gitignore", ".npmrc", "pylintrc", ".checkmake"]
    ]
    foc_keyboard_layout = [
        f for f in foc if file.ext(f) in [".keylayout", ".plist", ".strings"]
    ]
    foc_txt = [f for f in foc if f.endswith(".txt")]
    foc_ts = [f for f in foc if f.endswith(".ts")]
    foc_json = [f for f in foc if f.endswith(".json")]
    foc_html = [f for f in foc if f.endswith(".html")]

    sane.verify_equal_sets(
        foc,
        (
            foc_python
            + foc_make
            + foc_css
            + foc_sh
            + foc_js
            + foc_md
            + foc_yaml
            + foc_toml
            + foc_dot
            + foc_keyboard_layout
            + foc_txt
            + foc_ts
            + foc_json
            + foc_html
        ),
        "The total doesn't equal the some of the parts!",
    )

    log.info("Number of files of code:", len(foc))
    log.info("Python", len(foc_python))
    log.info("Makefile", len(foc_make))
    log.info("CSS", len(foc_css))
    log.info("Shell", len(foc_sh))
    log.info("JavaScript", len(foc_js))
    log.info("Markdown", len(foc_md))
    log.info("YAML", len(foc_yaml))
    log.info("TOML", len(foc_toml))
    log.info("Dotfiles", len(foc_dot))
    log.info("Keyboard Layout", len(foc_keyboard_layout))
    log.info("Text", len(foc_txt))
    log.info("TypeScript", len(foc_ts))
    log.info("JSON", len(foc_json))
    log.info("HTML", len(foc_html))

    loc_python = _loc(foc_python)
    loc_make = _loc(foc_make)
    loc_css = _loc(foc_css)
    loc_sh = _loc(foc_sh)
    loc_js = _loc(foc_js)
    loc_md = _loc(foc_md)
    loc_yaml = _loc(foc_yaml)
    loc_toml = _loc(foc_toml)
    loc_dot = _loc(foc_dot)
    loc_keyboard_layout = _loc(foc_keyboard_layout)
    loc_txt = _loc(foc_txt)
    loc_ts = _loc(foc_ts)
    loc_json = _loc(foc_json)
    loc_html = _loc(foc_html)

    loc: int = (
        loc_python
        + loc_make
        + loc_css
        + loc_sh
        + loc_js
        + loc_md
        + loc_yaml
        + loc_toml
        + loc_dot
        + loc_keyboard_layout
        + loc_txt
        + loc_ts
        + loc_json
        + loc_html
    )
    assert loc == _loc(foc)

    log.info("Number of lines of code:", loc)
    log.info("Python", loc_python)
    log.info("Makefile", loc_make)
    log.info("CSS", loc_css)
    log.info("Shell", loc_sh)
    log.info("JavaScript", loc_js)
    log.info("Markdown", loc_md)
    log.info("YAML", loc_yaml)
    log.info("TOML", loc_toml)
    log.info("Dotfiles", loc_dot)
    log.info("Keyboard Layout", loc_keyboard_layout)
    log.info("Text", loc_txt)
    log.info("TypeScript", loc_ts)
    log.info("JSON", loc_json)
    log.info("HTML", loc_html)

    loc_archive: int = (
        0  # We're currently unable to track archived code files.
    )
    loc_inc_archive: int = loc + loc_archive
    loc_crum: int = _loc_prefix(foc, "dictionary/marcion_sourceforge_net/")
    loc_andreas: int = _loc_prefix(foc, "dictionary/stmacariusmonastery_org/")
    loc_copticsite: int = _loc_prefix(foc, "dictionary/copticsite_com/")
    loc_kellia: int = _loc_prefix(foc, "dictionary/kellia_uni_goettingen_de/")
    loc_dawoud: int = 0  # Component files have been deleted.
    loc_bible: int = _loc_prefix(foc, "bible/")
    loc_flashcards: int = _loc_prefix(foc, "flashcards/")
    loc_grammar: int = 0  # The component is inactive.
    loc_keyboard: int = _loc_prefix(foc, "keyboard/")
    loc_morphology: int = _loc_prefix(foc, "morphology/")
    loc_site: int = _loc_prefix(foc, "docs/")
    loc_shared = _loc([f for f in foc if not os.path.dirname(f)]) + sum(
        _loc_prefix(foc, prefix)
        for prefix in [
            "env/",
            "xooxle/",
            "utils/",
            "pre-commit/",
            "test/",
        ]
    )

    # Verify the count.
    loc_sum: int = (
        loc_crum
        + loc_andreas
        + loc_copticsite
        + loc_kellia
        + loc_dawoud
        + loc_bible
        + loc_flashcards
        + loc_grammar
        + loc_keyboard
        + loc_morphology
        + loc_site
        + loc_shared
    )
    log.assass(
        loc == loc_sum,
        "The total doesn't equal the sum of the parts!",
        "Number of lines of code:",
        loc,
        "Broken by project:",
        loc_sum,
    )
    del loc_sum

    log.info("Number of lines of code:", loc)
    log.info("Crum:", loc_crum)
    log.info("Andreas:", loc_andreas)
    log.info("copticsite:", loc_copticsite)
    log.info("KELLIA:", loc_kellia)
    log.info("Dawoud:", loc_dawoud)
    log.info("Bible:", loc_bible)
    log.info("Flashcards:", loc_flashcards)
    log.info("Grammar:", loc_grammar)
    log.info("Keyboard:", loc_keyboard)
    log.info("Morphology:", loc_morphology)
    log.info("Site:", loc_site)
    log.info("Shared:", loc_shared)
    log.warn("Archive (broken):", loc_archive)
    log.warn("Total including archive (broken):", loc_inc_archive)

    crum_roots: list[dict[str, str | int | float]] = (
        crum.roots_sheet().get_all_records()
    )
    disk_usage: int = int(
        _run(
            "du",
            "--apparent-size",
            "--summarize",
            ".",
        ).split(
            "\t",
        )[0],
    )
    disk_usage_human: str = _run(
        "du",
        "--apparent-size",
        "--human-readable",
        "--summarize",
        ".",
    ).split("\t")[0]
    log.info("Desk usage:", disk_usage_human)
    log.assass(
        disk_usage >= 6291456 and disk_usage <= 88000000,
        disk_usage,
        "looks suspicious!",
    )
    crum_img: int = len(
        {
            basename.split("-")[0]
            for basename in os.listdir(
                "dictionary/marcion_sourceforge_net/data/img/",
            )
        },
    )
    log.info("Number of words possessing at least one image:", crum_img)
    log.assass(
        crum_img >= 700 and crum_img <= 3357,
        crum_img,
        "looks suspicious!",
    )

    crum_img_sum: int = len(
        os.listdir("dictionary/marcion_sourceforge_net/data/img/"),
    )
    log.info("Total number of images:", crum_img_sum)
    log.assass(
        crum_img_sum >= 1200 and crum_img_sum <= 33570,
        crum_img_sum,
        "looks suspicious!",
    )

    crum_dawoud: int = _sheet_nonempty(crum_roots, "dawoud-pages")
    log.info(
        "Number of words that have at least one page from Dawoud:",
        crum_dawoud,
    )
    log.assass(
        crum_dawoud >= 2600 and crum_dawoud <= 3357,
        crum_dawoud,
        "looks suspicious!",
    )

    crum_dawoud_sum: int = _sheet_sum_regex_matches(
        crum_roots,
        "dawoud-pages",
        r"[0-9]+",
    )
    log.info("Number of Dawoud pages added:", crum_dawoud_sum)
    log.assass(
        4300 <= crum_dawoud_sum <= 5000,
        crum_dawoud_sum,
        "looks suspicious!",
    )

    crum_notes: int = _sheet_nonempty(crum_roots, "notes")
    log.info("Number of editor's note added to Crum:", crum_notes)
    log.assass(4 <= crum_notes <= 3357, crum_notes, "looks suspicious!")

    crum_root_senses: int = _sheet_nonempty(crum_roots, "senses")
    log.info("Number of roots with at least one sense:", crum_root_senses)
    log.assass(
        70 <= crum_root_senses <= 3357,
        crum_root_senses,
        "looks suspicious!",
    )

    crum_root_senses_sum: int = _sheet_sum_regex_matches(
        crum_roots,
        "senses",
        r"[0-9]+",
    )
    log.info("Total number of root senses:", crum_root_senses_sum)
    log.assass(
        160 <= crum_root_senses_sum <= 33570,
        crum_root_senses_sum,
        "looks suspicious!",
    )

    crum_last_page: int = _sheet_nonempty(crum_roots, "crum-last-page")
    log.info("Number of Crum last pages overridden:", crum_last_page)
    log.assass(
        4 <= crum_last_page <= 3357,
        crum_last_page,
        "looks suspicious!",
    )

    crum_type_override: int = (
        0  # We haven't started populating them. See #196.
    )
    log.info("Number of types overridden:", crum_type_override)
    log.assass(
        0 <= crum_type_override <= 3357,
        crum_type_override,
        "looks suspicious!",
    )

    crum_sisters: int = _sheet_nonempty(crum_roots, "sisters")
    log.info("Number of words with sisters:", crum_sisters)
    log.assass(37 <= crum_sisters <= 3357, crum_sisters, "looks suspicious!")

    crum_sisters_sum: int = _sheet_sum_regex_matches(
        crum_roots,
        "sisters",
        r"[0-9]+",
    )
    log.info("Total number of sisters:", crum_sisters_sum)
    log.assass(
        58 <= crum_sisters_sum <= 33570,
        crum_sisters_sum,
        "looks suspicious!",
    )

    crum_antonyms: int = _sheet_nonempty(crum_roots, "antonyms")
    log.info("Number of words with antonyms:", crum_antonyms)
    log.assass(2 <= crum_antonyms <= 3357, crum_antonyms, "looks suspicious!")

    crum_antonyms_sum: int = _sheet_sum_regex_matches(
        crum_roots,
        "antonyms",
        r"[0-9]+",
    )
    log.info("Total number of antonyms:", crum_antonyms_sum)
    log.assass(
        2 <= crum_antonyms_sum <= 33570,
        crum_antonyms_sum,
        "looks suspicious!",
    )

    crum_homonyms: int = _sheet_nonempty(crum_roots, "homonyms")
    log.info("Number of words with homonyms:", crum_homonyms)
    log.assass(7 <= crum_homonyms <= 3357, crum_homonyms, "looks suspicious!")

    crum_homonyms_sum: int = _sheet_sum_regex_matches(
        crum_roots,
        "homonyms",
        r"[0-9]+",
    )
    log.info("Total number of homonyms:", crum_homonyms_sum)
    log.assass(
        7 <= crum_homonyms_sum <= 33570,
        crum_homonyms_sum,
        "looks suspicious!",
    )

    crum_greek_sisters: int = _sheet_nonempty(crum_roots, "greek-sisters")
    log.info("Number of words with Greek sisters:", crum_greek_sisters)
    log.assass(
        1 <= crum_greek_sisters <= 3357,
        crum_greek_sisters,
        "looks suspicious!",
    )

    crum_greek_sisters_sum: int = _sheet_sum_regex_matches(
        crum_roots,
        "greek-sisters",
        r"[0-9]+",
    )
    log.info("Total number of Greek sisters:", crum_greek_sisters_sum)
    log.assass(
        1 <= crum_greek_sisters_sum <= 3357,
        crum_greek_sisters_sum,
        "looks suspicious!",
    )

    crum_categories: int = _sheet_nonempty(crum_roots, "categories")
    log.info("Number of words with categories:", crum_categories)
    log.assass(
        30 <= crum_categories <= 3357,
        crum_categories,
        "looks suspicious!",
    )

    # The regex '[^,]+' counts comma-separated items.
    crum_categories_sum: int = _sheet_sum_regex_matches(
        crum_roots,
        "categories",
        r"[^,]+",
    )
    log.info("Total number of categories:", crum_categories_sum)
    log.assass(
        30 <= crum_categories_sum <= 6714,
        crum_categories_sum,
        "looks suspicious!",
    )

    # Since our Crum data source diverged from Marcion, we have no way to track
    # number of typos. In a way, it's irrelevant.
    crum_wrd_typos: int = 0
    log.warn("Number of Crum WRD entries changed (broken):", crum_wrd_typos)

    crum_drv_typos: int = 0
    log.warn("Number of Crum DRV entries changed (broken):", crum_drv_typos)

    crum_typos: int = 0
    log.warn("Total number of Crum lines changed (broken):", crum_typos)

    crum_pages_changed: int = 0
    log.warn("Number of Crum pages changed (broken):", crum_pages_changed)

    num_commits: int = int(_run("git", "rev-list", "--count", "--all"))
    log.info("Number of commits:", num_commits)
    log.assass(
        num_commits >= 1300 and num_commits <= 10000,
        num_commits,
        "looks suspicious!",
    )

    num_contributors: int = len(
        _run("git", "shortlog", "--summary", "--group=author").splitlines(),
    )
    log.info("Number of contributors:", num_contributors)
    log.assass(
        num_contributors >= 1 and num_contributors <= 10,
        num_contributors,
        "looks suspicious!",
    )

    open_issues: int = int(
        _run(
            "gh",
            "issue",
            "list",
            "--state",
            "open",
            "--json",
            "number",
            "--jq",
            "length",
            "--limit",
            "10000",
        ),
    )
    log.info("Number of open issues:", open_issues)
    log.assass(
        open_issues >= 1 and open_issues <= 300,
        open_issues,
        "looks suspicious!",
    )

    closed_issues: int = int(
        _run(
            "gh",
            "issue",
            "list",
            "--state",
            "closed",
            "--json",
            "number",
            "--jq",
            "length",
            "--limit",
            "10000",
        ),
    )
    log.info("Number of closed issues:", closed_issues)
    log.assass(
        closed_issues >= 300 and closed_issues <= 3000,
        closed_issues,
        "looks suspicious!",
    )

    stats: pd.DataFrame = file.read_tsv(_TSV_FILE)
    record: dict[str, str | int] = {
        "date": _run("date").strip(),
        "timestamp": _run("date", "+%s").strip(),
        "loc": loc,
        "loc_inc_archive": loc_inc_archive,
        "crum_img": crum_img,
        "crum_dawoud": crum_dawoud,
        "loc_crum": loc_crum,
        "loc_copticsite": loc_copticsite,
        "loc_kellia": loc_kellia,
        "loc_bible": loc_bible,
        "loc_flashcards": loc_flashcards,
        "loc_grammar": loc_grammar,
        "loc_keyboard": loc_keyboard,
        "loc_morphology": loc_morphology,
        "loc_site": loc_site,
        "loc_shared": loc_shared,
        "loc_archive": loc_archive,
        "crum_typos": crum_typos,
        "crum_img_sum": crum_img_sum,
        "crum_dawoud_sum": crum_dawoud_sum,
        "num_commits": num_commits,
        "num_contributors": num_contributors,
        "crum_notes": crum_notes,
        "loc_python": loc_python,
        "loc_make": loc_make,
        "loc_css": loc_css,
        "loc_sh": loc_sh,
        "loc_js": loc_js,
        "loc_md": loc_md,
        "loc_yaml": loc_yaml,
        "loc_dot": loc_dot,
        "loc_keyboard_layout": loc_keyboard_layout,
        "loc_txt": loc_txt,
        "crum_wrd_typos": crum_wrd_typos,
        "crum_drv_typos": crum_drv_typos,
        "crum_pages_changed": crum_pages_changed,
        "crum_root_senses": crum_root_senses,
        "crum_root_senses_sum": crum_root_senses_sum,
        "loc_ts": loc_ts,
        "loc_json": loc_json,
        "disk_usage": disk_usage,
        "disk_usage_human": disk_usage_human,
        "loc_toml": loc_toml,
        "foc": len(foc),
        "foc_python": len(foc_python),
        "foc_make": len(foc_make),
        "foc_css": len(foc_css),
        "foc_sh": len(foc_sh),
        "foc_js": len(foc_js),
        "foc_md": len(foc_md),
        "foc_yaml": len(foc_yaml),
        "foc_toml": len(foc_toml),
        "foc_dot": len(foc_dot),
        "foc_keyboard_layout": len(foc_keyboard_layout),
        "foc_txt": len(foc_txt),
        "foc_ts": len(foc_ts),
        "foc_json": len(foc_json),
        "loc_html": loc_html,
        "foc_html": len(foc_html),
        "crum_last_page": crum_last_page,
        "crum_type_override": crum_type_override,
        "crum_sisters": crum_sisters,
        "crum_sisters_sum": crum_sisters_sum,
        "crum_antonyms": crum_antonyms,
        "crum_antonyms_sum": crum_antonyms_sum,
        "crum_homonyms": crum_homonyms,
        "crum_homonyms_sum": crum_homonyms_sum,
        "crum_greek_sisters": crum_greek_sisters,
        "crum_greek_sisters_sum": crum_greek_sisters_sum,
        "open_issues": open_issues,
        "closed_issues": closed_issues,
        "crum_categories": crum_categories,
        "crum_categories_sum": crum_categories_sum,
        "loc_dawoud": loc_dawoud,
        "loc_andreas": loc_andreas,
    }
    sane.verify_equal_sets(
        set(stats.columns),
        set(record.keys()),
        "Collected columns don't match the stats file!",
    )
    if not commit:
        return
    stats = pd.concat([stats, pd.DataFrame([record])], ignore_index=True)
    file.to_tsv(stats, _TSV_FILE)
    _ = _run("git", "add", _TSV_FILE)
    # We wrap the commit message with single quotes in order to pass it as a
    # message parameter. For this to work, it must not contain any single quotes
    # itself.
    assert "'" not in _COMMIT_MESSAGE
    _ = _run("git", "commit", "--message", f"'{_COMMIT_MESSAGE}'")


def main():
    args = _argparser.parse_args()
    if args.reminder:
        _check_reminder()
    elif args.commit or args.print:
        _report(args.commit)
    else:
        # Default behavior is to simply plot the statistics.
        _plot()


if __name__ == "__main__":
    main()
