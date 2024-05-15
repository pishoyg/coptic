import argparse
import glob
import os
import pathlib
import re
import subprocess

import pandas as pd
import urllib3

DIGITS_RE = re.compile(r"\d+")

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
    default="data/output/roots.tsv",
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
    default=["verb"],
    help="A list of types to exclude.",
)

argparser.add_argument(
    "--reject_extensions",
    type=str,
    nargs="*",
    default=["avif", "svg"],
    help="A list of image extensions to reject.",
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
    default="data/img/",
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

args = argparser.parse_args()


def get_max_idx(g, key, sense):
    highest = 0
    for name in g:
        name = os.path.basename(name)
        assert name.startswith(str(key) + "-")
        cur = DIGITS_RE.match(name).group()
        assert cur
        if sense and cur != sense:
            continue
        if sense:
            cur = DIGITS_RE.match(name[name.find("-") + 1 :]).group()
            assert cur
        highest = max(highest, int(cur))
    return highest


def open_images(images):
    subprocess.run(
        ["open"]
        + (["-a", args.browser] if args.open_images_in_browser else [])
        + images
    )


def get_downloads():
    files = glob.glob(os.path.join(args.downloads, "*"))
    files = [f for f in files if os.path.basename(f) not in args.ignore]
    return files


def query(meaning):
    meaning = " ".join(meaning.split())
    return args.search_url.format(query=meaning)


def file_name(key, sense, idx, ext):
    if not sense:
        return f"{key}-{idx}{ext}"
    return f"{key}-{sense}-{idx}{ext}"


def invalid_extention(files):
    invalid = []
    for f in files:
        _, ext = os.path.splitext(f)
        assert ext.startswith(".")
        ext = ext[1:]
        if ext in args.reject_extensions:
            invalid.append(f)
    return invalid


def main():
    df = pd.read_csv(args.input_tsv, sep="\t", encoding="utf-8").fillna("")
    df.sort_values(by=[args.input_key_col])

    for _, row in df.iterrows():
        key = row[args.input_key_col]
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
            while True:
                sense = input()
                if not sense:
                    break
                try:
                    sense = int(sense)
                    assert sense >= 0
                    break
                except:
                    print("The sense must be a non-negative integer.")

            files = get_downloads()
            invalid = invalid_extention(files)
            if invalid:
                print(
                    "{} have invalid extensions, please replace"
                    " them.".format(invalid)
                )
                continue

            # If there are no files, we assume that the user doesn't want to
            # add pictures for this word. (Unless they typed a sense, in which
            # case it would be weird!)
            if not files:
                if sense:
                    print(
                        "You typed a sense, but there are no pictures! This"
                        " doesn't make sense!"
                    )
                    continue
                break

            # TODO: Make it possible to retype the sense.

            # Verify the images.
            if args.verify_before_copying:
                i = "n"
                while i.lower() != "y":
                    open_images(files)
                    i = input("Looks good? (y/n)")
                    files = get_downloads()

            # Move the files.
            for file in files:
                _, ext = os.path.splitext(file)
                idx = get_max_idx(g, key, sense)
                idx += 1
                pathlib.Path(file).rename(
                    os.path.join(
                        args.destination,
                        file_name(key=key, sense=sense, idx=idx, ext=ext),
                    )
                )

            if not sense:
                break


if __name__ == "__main__":
    main()
