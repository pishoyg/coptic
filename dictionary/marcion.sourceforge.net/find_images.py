import argparse
import glob
import os
import pathlib
import re
import subprocess

import pandas as pd
import pillow_avif
import type_enforced
from PIL import Image

DIGITS_RE = re.compile(r"\d+")
FILE_NAME_RE = re.compile(r"(\d+)-(\d+)-(\d+)\.[^\d]+")

argparser = argparse.ArgumentParser(
    description="""Find images for the dictionary words.
The tool works as follows:
1. For each word in the dictionary, search for the meaning of the word using a
search engine.
2. Give the user some time to download some images to a given downloads
directory.
3. Once the user comes back and hits the return button on the script, move the
images to the destination directory.
"""
)

argparser.add_argument(
    "--browser",
    type=str,
    default="Google Chrome",
    help="The browser.",
)

argparser.add_argument(
    "--open_images_in_browser",
    type=bool,
    default=True,
    help="Whether to use the browser or the default program to open existing images.",
)

argparser.add_argument(
    "--verify_before_copying",
    type=bool,
    default=True,
    help="Whether to verify the images before copying. Verification is done by"
    " asking the user to input y or n.",
)

argparser.add_argument(
    "--start_at_key",
    type=int,
    default=0,
    help="Skips keys lower than this value.",
)

argparser.add_argument(
    "--input_tsv",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/output/roots.tsv",
    help="Input TSV.",
)

argparser.add_argument(
    "--input_meaning_col",
    type=str,
    default="en-parsed-no-greek-no-html",
    help="Name of the meaning column in the input TSV.",
)

argparser.add_argument(
    "--input_key_col",
    type=str,
    default="key",
    help="Name of the key column in the input TSV.",
)

argparser.add_argument(
    "--input_type_col",
    type=str,
    default="type-parsed",
    help="Name of the type column in the input TSV.",
)

argparser.add_argument(
    "--print_cols",
    type=str,
    nargs="*",
    default=["key", "word-parsed-prettify", "en-parsed-no-greek-no-html"],
    help="A list of columns to print when prompting the user to find images.",
)

argparser.add_argument(
    "--exclude_types",
    type=str,
    nargs="*",
    default=[],
    help="A list of types to exclude.",
)

argparser.add_argument(
    "--search_url",
    type=str,
    default="https://www.google.com/search?q={query}&tbm=isch",
    help="Search format string. We will open the browser at"
    " `search_url.format(query=query)`",
)

argparser.add_argument(
    "--downloads",
    type=str,
    default=os.path.join(os.path.expanduser("~"), "Desktop/"),
    help="Path to the downloads directory.",
)

argparser.add_argument(
    "--destination",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/img/",
    help="Path to the destination directory.",
)

argparser.add_argument(
    "--ignore",
    type=str,
    nargs="*",
    default=[".DS_Store", ".localized"],
    help="List of files in the downloads directory to ignore.",
)

argparser.add_argument(
    "--skip_existing",
    type=bool,
    default=False,
    help="If true, skip word with existing images.",
)

argparser.add_argument(
    "--min_width",
    type=int,
    default=300,
    help="The minimum acceptable width of an image. Set to -1 to indicate the"
    " absence of a limit.",
)

args = argparser.parse_args()


@type_enforced.Enforcer
def get_max_idx(g: list[str], key: int, sense: int) -> int:
    key = str(key)
    sense = str(sense)
    highest = 0
    for path in g:
        match = FILE_NAME_RE.match(os.path.basename(path))
        assert match.group(1) == key
        if match.group(2) != sense:
            continue
        highest = max(highest, int(match.group(3)))
    return highest


@type_enforced.Enforcer
def open_images(images: list[str]):
    if not images:
        return
    subprocess.run(
        ["open"]
        + (["-a", args.browser] if args.open_images_in_browser else [])
        + images
    )


@type_enforced.Enforcer
def get_downloads() -> list[str]:
    files = glob.glob(os.path.join(args.downloads, "*"))
    files = [f for f in files if os.path.basename(f) not in args.ignore]
    return files


@type_enforced.Enforcer
def query(meaning: str) -> str:
    meaning = meaning.replace("&", " and ").replace("\n", " | ")
    meaning = " ".join(meaning.split())
    return args.search_url.format(query=meaning)


@type_enforced.Enforcer
def file_name(key: int, sense: int, idx: int, ext: str):
    assert key
    assert sense
    assert idx
    assert ext
    return f"{key}-{sense}-{idx}{ext}"


@type_enforced.Enforcer
def invalid_size(files: list[str]) -> list[str]:
    if args.min_width == -1:
        return []
    assert args.min_width > 0
    invalid = []
    for f in files:
        image = Image.open(f)
        width, _ = image.size
        if width < args.min_width:
            invalid.append(f)
    return invalid


@type_enforced.Enforcer
def main():
    df = pd.read_csv(args.input_tsv, sep="\t", dtype=str, encoding="utf-8").fillna("")
    df.sort_values(by=args.input_key_col, inplace=True)

    for _, row in df.iterrows():
        key = row[args.input_key_col]
        key = int(key)
        if key < args.start_at_key:
            continue
        if row[args.input_type_col] in args.exclude_types:
            continue

        g = glob.glob(os.path.join(args.destination, f"{key}-*"))
        if args.skip_existing and g:
            continue

        open_images(g)
        q = query(row[args.input_meaning_col])
        subprocess.run(["open", "-a", args.browser, q])
        for col in args.print_cols:
            print("\n{}:\n{}".format(col, row[col]))
        print("\nExisting:\n{}".format(g))

        while True:
            # Force read a valid sense, or no sense at all.
            sense = input("Input sense number. Type 's' to skip.").lower()
            if sense == "s":
                break
            if not sense.isdigit():
                print(f"Unable to parse {sense}")
                continue
            sense = int(sense)
            if sense <= 0:
                print("Sense must be a positive integer.")
                continue

            files = get_downloads()

            invalid = invalid_size(files)
            if invalid:
                print(f"{invalid} are too small, please replace them.")
                continue

            # If there are no files, we assume that the user doesn't want to
            # add pictures for this word. (Unless they typed a sense, in which
            # case it would be weird!)
            if not files:
                print(
                    "You typed a sense, but there are no pictures! This"
                    " doesn't make sense!"
                )
                continue

            # Verify the images.
            if args.verify_before_copying:
                i = "n"
                while True:
                    open_images(files)
                    i = input(f"Sense = {sense}. Looks good? (yes/no/sense)").lower()
                    if i.isdigit():
                        sense = int(i)
                    if i in {"y", "yes"}:
                        break
                    files = get_downloads()

            # Move the files.
            idx = get_max_idx(g, key, sense)
            for file in files:
                idx += 1
                _, ext = os.path.splitext(file)
                pathlib.Path(file).rename(
                    os.path.join(
                        args.destination,
                        file_name(key=key, sense=sense, idx=idx, ext=ext),
                    )
                )


if __name__ == "__main__":
    main()
