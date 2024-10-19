#!/usr/bin/env python3

import matplotlib.pyplot as plt
import pandas as pd

import utils

TSV_FILE = "data/stats.tsv"
COLUMNS: dict[str | None, list[str]] = {
    # We ignore the following fields, but we have to include them nevertheless
    # to appease our tests.
    None: [
        "date",
        "timestamp",
        "disk_usage",
        "disk_usage_human",
        "num_contributors",
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
        "crum_antonyms_sum",
        "crum_dawoud",
        "crum_dawoud_sum",
        "crum_greek_sisters",
        "crum_greek_sisters_sum",
        "crum_homonyms",
        "crum_homonyms_sum",
        "crum_img",
        "crum_img_sum",
        "crum_root_senses",
        "crum_root_senses_sum",
        "crum_sisters",
        "crum_sisters_sum",
    ],
    "Files of Code per Language": [
        "foc",
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
        "loc",
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
        "loc",
        "loc_archive",
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
}


def validate(df: pd.DataFrame) -> None:
    available = set(df.columns)
    included = set(sum(COLUMNS.values(), []))
    if available != included:
        utils.fatal(
            "Absent columns:",
            available - included,
            "Extra columns",
            included - available,
        )


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
            plt.plot(df.index, df[column], label=column)

        plt.title(title)
        plt.xlabel("Time")
        plt.ylabel("Values")
        plt.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()


if __name__ == "__main__":
    main()
