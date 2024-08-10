import argparse
import glob
import os
import pathlib
import re
import subprocess
import typing

import enforcer
import PIL
import pillow_avif
import requests
import requests_oauthlib
import type_enforced

import utils

TARGET_WIDTH = 300
MIN_WIDTH = 200
IMG_300_DIR = "dictionary/marcion.sourceforge.net/data/img-300"
FILE_NAME_RE = re.compile(r"(\d+)-(\d+)-(\d+)\.[^\d]+")
SOURCE_RE = re.compile(r"^source\(([^=]+)\)=(.+)$")


INPUT_TSVS = "dictionary/marcion.sourceforge.net/data/output/tsvs/roots.tsvs"
MEANING_COL = "en-parsed-no-greek-no-html"
KEY_COL = "key"
LINK_COL = "key-link"
SOURCES_DIR = "dictionary/marcion.sourceforge.net/data/img-sources/"


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
    if MIN_WIDTH == -1:
        return []
    assert MIN_WIDTH > 0
    invalid = []
    for f in files:
        try:
            image = PIL.Image.open(f)
        except PIL.UnidentifiedImageError:
            utils.warn(
                "Unable to verify the size for", f, "so relying on manual verification."
            )
            continue
        width, _ = image.size
        if width < MIN_WIDTH:
            invalid.append(f)
    return invalid


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def is_wiki(url: str) -> bool:
    return url.startswith("https://upload.wikimedia.org/")


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def main():
    global args
    args = argparser.parse_args()
    df = utils.read_tsvs(INPUT_TSVS)
    df.sort_values(by=KEY_COL, inplace=True)

    sources: dict[str, str] = {}

    def retrieve(
        url: str, filename: typing.Optional[str] = None, headers: dict[str, str] = {}
    ) -> None:
        if filename is None:
            filename = os.path.basename(url)
            idx = filename.find("?")
            if idx != -1:
                filename = filename[:idx]
        download = requests.get(url, headers=headers)
        if not download.ok:
            utils.error(download.text)
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
        key = row[KEY_COL]
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
        q = query(row[MEANING_COL])
        subprocess.run(["open", "-a", args.browser, q, row[LINK_COL]])

        while True:
            # Force read a valid sense, or no sense at all.
            utils.info("Key:", row[KEY_COL])
            utils.info("Link:", row[LINK_COL])
            utils.info("Existing:", g)
            utils.info("Downloads:", get_downloads())
            utils.info("Sources:", sources)
            sense = input(
                "\n".join(
                    [
                        "Enter,",
                        "- an image URL to retrieve said image,",
                        "- 'nount/${QUERY}' to query `thenounproject`,",
                        "- 'wiki/${PAGE}' to open a Wikipedia page,",
                        "- 'source=${SOURCE}' to populate the source for the only"
                        f" image in {args.downloads} that is missing a source,",
                        "- source(${PATH})=${SOURCE} to populate the source for a given image:",
                        "- 's' to skip,",
                        "- 'ss' to force-skip,",
                        "- 'cs' to clear sources, or",
                        "- sense number to initiate transfer",
                        "",
                    ]
                )
            )
            sense = sense.strip()
            if not sense:
                continue

            if sense.lower() == "s":
                # S for skip!
                files = get_downloads()
                if files:
                    utils.error(
                        "You can't skip with a dirty downloads directory:", files
                    )
                    continue
                # We clear the sources!
                # It's guaranteed that the downloads directory is clean.
                sources.clear()
                utils.info("Sources cleared!")
                break

            if sense.lower() == "ss":
                # Force skip!
                break

            if sense.lower() == "cs":
                sources.clear()
                utils.info("Sources cleared!")
                continue

            if sense.startswith("source="):
                files = get_downloads()
                files = [f for f in files if f not in sources]
                if len(files) != 1:
                    utils.error(
                        "Can't assign source because the number of new files != 1:",
                        files,
                    )
                    continue
                sense = sense[1:]
                if not sense:
                    utils.error("No source given!")
                    continue
                sources[files[0]] = sense
                continue

            source_search = SOURCE_RE.search(sense)
            if source_search:
                sources[source_search.group(1)] = source_search.group(2)
                continue
            del source_search

            if sense.startswith("http"):
                url = sense
                headers: dict[str, str] = {}
                if is_wiki(url):
                    headers = WIKI_HEADERS
                retrieve(url, headers=headers)
                continue

            if sense.lower().startswith("wiki/"):
                subprocess.call(["open", "https://en.wikipedia.org/" + sense])
                continue

            if sense.lower().startswith("noun/"):
                # This is likely a search query.
                sense = sense[5:]
                auth = requests_oauthlib.OAuth1(
                    args.thenounproject_key, args.thenounproject_secret
                )
                resp = requests.get(ICON_SEARCH_FMT.format(query=sense), auth=auth)
                if not resp.ok:
                    utils.error("", resp.text)
                    continue
                resp = resp.json()
                resp = resp["icons"]
                if not resp:
                    utils.error("Nothing found on thenounproject for:", sense)
                    continue
                for icon in resp:
                    retrieve(icon["thumbnail_url"])
                open_images(get_downloads())
                continue

            if not sense.isdigit():
                utils.error("Can't make sense of", sense)
                continue

            assert sense.isdigit()  # Sanity check.
            sense = int(sense)
            if sense <= 0:
                utils.error("Sense must be a positive integer, got:", sense)
                continue

            files = get_downloads()

            # Force size.
            invalid = invalid_size(files)
            if invalid:
                utils.error("Images are too small:", invalid)
                continue

            # Force sources.
            absent_source = False
            for file in files:
                if file not in sources:
                    utils.error("Please populate the source for:", file)
                    absent_source = True
            if absent_source:
                utils.info("Known sources:", sources)
                continue

            # If there are no files, we assume that the user doesn't want to
            # add pictures for this word. (Unless they typed a sense, in which
            # case it would be weird!)
            if not files:
                utils.error(
                    "You typed a sense, but there are no pictures! This"
                    " doesn't make sense!"
                )
                continue

            # Verify the images.
            i = ""
            move = False
            while True:
                open_images(files)
                i = input("Looks good? (y/n)").lower()
                files = get_downloads()
                if i in ["y", "yes"]:
                    move = True
                    break
                if i in ["n", "no"]:
                    move = False
                    break

            if not move:
                continue

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
                    os.path.join(SOURCES_DIR, file_name(ext=".txt")),
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
