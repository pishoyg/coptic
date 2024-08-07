import argparse
import glob
import os
import pathlib
import re
import subprocess
import typing

import colorama
import enforcer
import pandas as pd
import pillow_avif
import requests
import requests_oauthlib
import type_enforced
from PIL import Image

TARGET_WIDTH = 300
IMG_300_DIR = "dictionary/marcion.sourceforge.net/data/img-300"
FILE_NAME_RE = re.compile(r"(\d+)-(\d+)-(\d+)\.[^\d]+")
SOURCE_RE = re.compile(r"^source\(([^=]+)\)=(.+)$")


def error(message: str) -> None:
    print(colorama.Fore.RED + message + colorama.Fore.RESET)


def params_str(params: dict) -> str:
    return "?" + "&".join(f"{k}={v}" for k, v in params.items())


# TODO: Reconsider the use of SVG images.
# TODO: Download a higher-quality image instead of just the thumbnail.
EXTENSION = "png"
URL = "https://api.thenounproject.com/v2"
SEARCH_PARAMS = {
    "query": "{query}",
    "include_svg": 0,
    "thumbnail_size": 200,
    "limit": 10,
}
ICON_SEARCH_FMT = URL + "/icon" + params_str(SEARCH_PARAMS)

WIKI_HEADERS = {
    "Api-User-Agent": "Coptic/1.0 (https://github.com/pishoyg/coptic/; pishoybg@gmail.com)",
    "User-Agent": "Coptic/1.0 (https://github.com/pishoyg/coptic/; pishoybg@gmail.com)",
}

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
    "--start_at_key",
    type=int,
    default=0,
    help="Skips keys lower than this value.",
)

argparser.add_argument(
    "--input_tsv",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/output/tsv/roots.tsv",
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
    "--link_col",
    type=str,
    default="key-link",
    help="The name of the link column to open the page in the browser.",
)

argparser.add_argument(
    "--exclude",
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
    "--sources_dir",
    type=str,
    default="dictionary/marcion.sourceforge.net/data/img-sources/",
    help="Path to the sources directory.",
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
    default=200,
    help="The minimum acceptable width of an image. Set to -1 to indicate the"
    " absence of a limit.",
)

argparser.add_argument(
    "--thenounproject_key",
    type=str,
    default="",
    help="Key to the API of thenounproject.",
)

argparser.add_argument(
    "--thenounproject_secret",
    type=str,
    default="",
    help="Secret to the API of thenounproject.",
)

global args


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def get_max_idx(g: list[str], key: int, sense: int) -> int:
    key: str = str(key)
    sense: str = str(sense)
    highest = 0
    for path in g:
        match = FILE_NAME_RE.match(os.path.basename(path))
        assert match
        assert match.group(1) == key
        if match.group(2) != sense:
            continue
        highest = max(highest, int(match.group(3)))
    return highest


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def open_images(images: list[str]):
    if not images:
        return
    subprocess.run(["open"] + images)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def get_downloads() -> list[str]:
    files = os.listdir(args.downloads)
    files = [f for f in files if f not in args.ignore]
    files = [os.path.join(args.downloads, f) for f in files]
    files = [f for f in files if os.path.isfile(f)]
    return files


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def query(meaning: str) -> str:
    meaning = meaning.replace("&", " and ").replace("\n", " | ")
    meaning = " ".join(meaning.split())
    return args.search_url.format(query=meaning)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def file_name(key: int, sense: int, idx: int, ext: str):
    assert key
    assert sense
    assert idx
    assert ext
    return f"{key}-{sense}-{idx}{ext}"


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
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


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def is_wiki(url: str) -> bool:
    return url.startswith("https://upload.wikimedia.org/")


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def main():
    global args
    args = argparser.parse_args()
    df = pd.read_csv(args.input_tsv, sep="\t", dtype=str, encoding="utf-8").fillna("")
    df.sort_values(by=args.input_key_col, inplace=True)

    sources: dict[str, str] = {}

    def retrieve(
        url: str, filename: typing.Optional[str] = None, headers: dict[str, str] = {}
    ) -> None:
        if filename is None:
            filename = os.path.basename(url)
        download = requests.get(url, headers=headers)
        if not download.ok:
            error(download.text)
            return
        filename = os.path.join(args.downloads, filename)
        with open(filename, "wb") as f:
            f.write(download.content)
        sources[filename] = url

    exclude = {}
    for e in args.exclude:
        k, v = e.split(":")
        assert k
        assert k not in exclude
        exclude[k] = v

    for _, row in df.iterrows():
        key = row[args.input_key_col]
        key = int(key)
        if key < args.start_at_key:
            continue
        if any(row[k] == v for k, v in exclude.items()):
            continue

        def existing():
            return glob.glob(os.path.join(args.destination, f"{key}-*"))

        g = existing()
        if args.skip_existing and g:
            continue

        open_images(g)
        q = query(row[args.input_meaning_col])
        subprocess.run(["open", "-a", args.browser, q, row[args.link_col]])
        print("\nExisting:\n{}".format(g))

        while True:
            # Force read a valid sense, or no sense at all.
            sense = input(
                f"Enter sense number, 's' to skip, 'cs' to clear sources, an"
                f" image URL to retrieve said image, a search query to use"
                f" `thenounproject`, '=${{SOURCE}}' to populate the source for"
                f" the only image in {args.downloads} that is missing a"
                f" source, or source(${{PATH}})=${{SOURCE}} to populate the"
                f" source for a given image.\n"
            )
            sense = sense.strip()
            if not sense:
                continue

            if sense.lower() == "s":
                # S for skip!
                files = get_downloads()
                if files:
                    error(
                        f"You can't skip with a dirty downloads directory. Please remove {files}."
                    )
                    continue
                # We clear the sources!
                # It's guaranteed that the downloads directory is clean.
                sources.clear()
                print("Sources cleared!")
                break

            if sense.lower() == "ss":
                # Force skip!
                break

            if sense.lower() == "cs":
                sources.clear()
                print("Sources cleared!")
                continue

            if sense.startswith("="):
                files = get_downloads()
                files = [f for f in files if f not in sources]
                if len(files) != 1:
                    error(
                        f"Can't assign source because the number of new files != 1: {files}"
                    )
                    continue
                sense = sense[1:]
                if not sense:
                    error("No source given!")
                    continue
                sources[files[0]] = sense
                continue

            if sense.startswith("http"):
                url = sense
                headers: dict[str, str] = {}
                if is_wiki(url):
                    headers = WIKI_HEADERS
                retrieve(url, headers=headers)
                continue

            source_search = SOURCE_RE.search(sense)
            if source_search:
                sources[source_search.group(1)] = source_search.group(2)
                continue
            del source_search

            if not sense.isdigit():
                # This is likely a search query.
                auth = requests_oauthlib.OAuth1(
                    args.thenounproject_key, args.thenounproject_secret
                )
                resp = requests.get(ICON_SEARCH_FMT.format(query=sense), auth=auth)
                if not resp.ok:
                    error(resp.text)
                    continue
                resp = resp.json()
                resp = resp["icons"]
                if not resp:
                    error("Nothing found on thenounproject! :/")
                    continue
                for icon in resp:
                    retrieve(icon["thumbnail_url"])
                open_images(get_downloads())
                continue

            assert sense.isdigit()  # Sanity check.
            sense = int(sense)
            if sense <= 0:
                error("Sense must be a positive integer.")
                continue

            files = get_downloads()

            # Force size.
            invalid = invalid_size(files)
            if invalid:
                error(f"{invalid} are too small, please replace them.")
                continue

            # Force sources.
            absent_source = False
            for file in files:
                if file not in sources:
                    error(f"Please populate the source for {file}")
                    absent_source = True
            if absent_source:
                print(f"Known sources: {sources}")
                continue

            # If there are no files, we assume that the user doesn't want to
            # add pictures for this word. (Unless they typed a sense, in which
            # case it would be weird!)
            if not files:
                error(
                    "You typed a sense, but there are no pictures! This"
                    " doesn't make sense!"
                )
                continue

            # Verify the images.
            i = "n"
            while True:
                open_images(files)
                print(f"Sense = {sense}.")
                print(f"Sources = {sources}")
                i = input("Looks good? (yes/no/sense)").lower()
                files = get_downloads()
                if i.isdigit():
                    sense = int(i)
                if i in {"y", "yes"}:
                    break

            # Move the files.
            idx = get_max_idx(existing(), key, sense)
            for file in files:
                idx += 1

                _, ext = os.path.splitext(file)

                def file_name(ext=ext):
                    return f"{key}-{sense}-{idx}{ext}"

                # Write the image.
                new_file = os.path.join(args.destination, file_name())
                pathlib.Path(file).rename(new_file)
                # Write the source.
                with open(
                    os.path.join(args.sources_dir, file_name(ext=".txt")),
                    "w",
                ) as f:
                    f.write(sources[file] + "\n")
                # Write the converted image.
                subprocess.call(
                    [
                        "magick",
                        new_file,
                        "-alpha",
                        "remove",
                        "-alpha",
                        "off",
                        "-background",
                        "white",
                        "-resize",
                        f"{TARGET_WIDTH}x",
                        os.path.join(
                            IMG_300_DIR, file_name(ext=".jpg" if ext == ".png" else ext)
                        ),
                    ]
                )


if __name__ == "__main__":
    main()
