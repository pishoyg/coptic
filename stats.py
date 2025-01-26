#!/usr/bin/env python3

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

import utils

TSV_FILE = "data/stats.tsv"
COLUMNS: dict[str | None, list[str]] = {
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
    ],
    "Crum Fixes": [
        # The following Crum fields are not expected to be populated for every
        # entry.
        "crum_drv_typos",
        "crum_last_page",
        "crum_notes",
        "crum_pages_changed",
        "crum_type_override",
        "crum_typos",
        "crum_wrd_typos",
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
        "loc_flashcards",
        "loc_grammar",
        "loc_kellia",
        "loc_keyboard",
        "loc_morphology",
        "loc_shared",
        "loc_site",
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
TARGET_ANNOTATIONS = 15


def validate(df: pd.DataFrame) -> None:
    available: set[str] = set(df.columns)
    included: set[str] = set(
        sum([COLUMNS[key] for key in COLUMNS if key is not None], []),
    )
    excluded: set[str] = set(COLUMNS[None])
    if available != (included | excluded):
        utils.fatal(
            "Absent columns:",
            available - (included | excluded),
            "Extra columns",
            (included | excluded) - available,
        )
    dupe = included & excluded
    if dupe:
        utils.fatal(
            "The following elements are marked as excluded although they are used:",
            dupe,
        )
    del dupe
    for key, columns in COLUMNS.items():
        if not columns:
            utils.fatal(key, "is empty!")


def main():
    # Read the TSV file.
    df = pd.read_csv(TSV_FILE, sep="\t")
    validate(df)

    # Convert the Unix epoch timestamp to a datetime object.
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")

    # Set the timestamp as the index.
    df.set_index("timestamp", inplace=True)

    # Plot each list of column names.
    for title, columns in COLUMNS.items():
        if title is None:
            continue
        plt.figure(figsize=(10, 6))
        for column in columns:
            total_points: int = len(df[column])
            interval: int = max(1, total_points // TARGET_ANNOTATIONS)
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


if __name__ == "__main__":
    main()
