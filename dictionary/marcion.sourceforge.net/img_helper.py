#!/usr/bin/env python3
import argparse
import glob
import json
import os
import pathlib
import re
import shutil
import subprocess
import typing

import colorama
import pandas as pd
import PIL
import pillow_avif  # type: ignore[import-untyped]
import requests
import requests_oauthlib  # type: ignore[import-untyped]

import utils

TARGET_WIDTH = 300
MIN_WIDTH = 200  # Minimum height of the input image.
PREFER_MIN_WIDTH = 300
MIN_RESIZE_HEIGHT = 100  # Minimum allowed height of the resized image. (#240)
PREFER_MIN_RESIZE_HEIGHT = 200
MAX_RESIZE_HEIGHT = 500  # Maximum allowed height of the resized image. (#240)
PREFER_MAX_RESIZE_HEIGHT = 400
IMG_DIR = "dictionary/marcion.sourceforge.net/data/img"
IMG_300_DIR = "dictionary/marcion.sourceforge.net/data/img-300"

FILE_NAME_RE = re.compile(r"(\d+)-(\d+)-(\d+)\.[^\d]+")
STEM_RE = re.compile("[0-9]+-[0-9]+-[0-9]+")
NAME_RE = re.compile("[A-Z][a-zA-Z ]*")
ASSIGN_SOURCE_RE = re.compile(r"^source\(([^=]+)\)=(.+)$")


INPUT_TSVS: str = (
    "dictionary/marcion.sourceforge.net/data/output/tsvs/roots.tsvs"
)
APPENDICES_TSV: str = (
    "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv"
)
MEANING_COL: str = "en-parsed-no-greek"
KEY_COL: str = "key"
LINK_COL: str = "key-link"
SENSES_COL: str = "senses"
SOURCES_DIR: str = "dictionary/marcion.sourceforge.net/data/img-sources/"

# NOTE: SVG conversion is nondeterministic, which is badly disruptive to our
# pipelines, so we ban it.
# PNG conversion is deterministic as long as it's converted to JPG, so we
# accept it but convert it.
EXT_MAP = {
    ".png": ".jpg",
}
IMAGE_EXTENSIONS = {
    ".avif",
    ".gif",
    ".jpeg",
    ".jpg",
    ".JPG",
    ".png",
    ".webp",
    ".svg",
}
VALID_EXTENSIONS = IMAGE_EXTENSIONS.difference({".svg"})
VALID_EXTENSIONS_300 = VALID_EXTENSIONS.difference({".png"})


def params_str(params: dict) -> str:
    return "?" + "&".join(f"{k}={v}" for k, v in params.items())


# TODO: Download a higher-quality image instead of just the thumbnail.
NOUN_URL = "https://thenounproject.com"
NOUN_API = "https://api.thenounproject.com/v2"
SEARCH_PARAMS = {
    "query": "{query}",
    "include_svg": 0,
    "thumbnail_size": 200,
    "limit": 10,
}
ICON_SEARCH_FMT = NOUN_API + "/icon" + params_str(SEARCH_PARAMS)

WIKI_HEADERS = {
    "Api-User-Agent": "Coptic/1.0 (https://remnqymi.com; remnqymi@gmail.com)",
    "User-Agent": "Coptic/1.0 (https://remnqymi.com; remnqymi@gmail.com)",
}

argparser = argparse.ArgumentParser(
    description="""Find and process images for the dictionary words.""",
)

argparser.add_argument(
    "--start_at_key",
    type=int,
    default=0,
    help="Skips keys lower than this value.",
)

argparser.add_argument(
    "--end_at_key",
    type=int,
    default=1000000000,
    help="Terminate after reaching this key.",
)

argparser.add_argument(
    "--exclude",
    type=str,
    nargs="*",
    default=[],
    help="A list of types to exclude.",
)

argparser.add_argument(
    "--downloads",
    type=str,
    default=os.path.join(os.path.expanduser("~"), "Desktop/"),
    help="Path to the downloads directory.",
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
    help="If true, skip word with existing images."
    " If --batch is given, this flag has a different interpretation."
    " It means don't convert already converted files."
    "You should only use this"
    f" flag if there are no obsolete images in {IMG_300_DIR}/."
    " Images can be obsolete if, for example, an image was modified"
    f" in {IMG_DIR}/, and the generated version of the old image is"
    f" still present in ${IMG_300_DIR}/."
    " If run with --skip_existing, this script (as the flag name suggests)"
    " will generate only the absent images, but (unlike other scripts in"
    " this repo) won't look at the file modification timestamps."
    " It does NOT convert images based on their timestamps, but rather"
    " based on their mere existence or absence."
    " In other words, the script would *generate an absent file*, but"
    " wouldn't *regenerate an outdated file*."
    " In other words, you might have to manually delete the artefacts in"
    " order for this script to generate replacements.",
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

argparser.add_argument(
    "--rm",
    type=str,
    default="",
    help="If given, delete the artifacts for the given stem, and exit.",
)

argparser.add_argument(
    "--mv",
    type=str,
    default=[],
    nargs="*",
    help="If given, rename the artifacts for the given stem, and exit. Exactly"
    " two arguments must be given, the source and destination stems.",
)

argparser.add_argument(
    "--cp",
    type=str,
    default=[],
    nargs="*",
    help="If given, copy the artifacts for the given stem, and exit. Exactly"
    " two arguments must be given, the source and destination stems.",
)

argparser.add_argument(
    "--convert",
    type=str,
    default="",
    help="If given, (re)convert the images with the given stem, and exit.",
)

argparser.add_argument(
    "--validate",
    default=False,
    action="store_true",
    help="If true, just validate the directories and exit.",
)

argparser.add_argument(
    "--batch",
    default=False,
    action="store_true",
    help=f"If true, batch-process images in {IMG_DIR} and exit."
    "Batch-processing includes converting images, and deleting obsolete images"
    " and sources."
    " NOTE: We intentionally refrain from populating absent sources with a"
    " default value, since now we have become stricter with collecting image"
    " sources.",
)

argparser.add_argument(
    "--plot",
    default=None,
    type=int,
    nargs="*",
    help="If given, plot a YES or NO for whether each included picture has an"
    " image. If a number, use as the lower bound for the keys. If two numbers,"
    " use as a lower and upper bound respectively. More than two arguments is"
    " an error.",
)


def get_max_idx(g: list[str], key: str, sense: str) -> int:
    highest = 0
    for path in g:
        match = FILE_NAME_RE.match(os.path.basename(path))
        assert match
        assert match.group(1) == key
        if match.group(2) != sense:
            continue
        highest = max(highest, int(match.group(3)))
    return highest


def open_images(images: list[str]):
    if not images:
        return
    subprocess.run(["open"] + images)


def open_links(row: pd.Series) -> None:
    subprocess.run(
        [
            "open",
            str(row[LINK_COL]),
            query(utils.html_text(str(row[MEANING_COL]))),
        ],
    )


def get_downloads(args) -> list[str]:
    files = os.listdir(args.downloads)
    files = [f for f in files if f not in args.ignore]
    files = [os.path.join(args.downloads, f) for f in files]
    files = [f for f in files if os.path.isfile(f)]
    return files


def query(meaning: str) -> str:
    meaning = meaning.replace("&", " and ").replace("\n", " | ")
    meaning = " ".join(meaning.split())
    return f"https://www.google.com/search?q={meaning}&tbm=isch"


def invalid_size(files: list[str]) -> list[str]:
    assert MIN_WIDTH > 0
    invalid = []
    for f in files:
        image = PIL.Image.open(f)  # type: ignore[attr-defined]
        width, height = image.size
        if width < MIN_WIDTH:
            utils.warn(
                f,
                "has a width of",
                width,
                "; the valid range is",
                MIN_WIDTH,
                "-",
            )
            invalid.append(f)
            continue
        if width < PREFER_MIN_WIDTH:
            utils.warn(
                f,
                "has a width of",
                width,
                "; this is allowed but discouraged, consider fetching an"
                " image with a minimum width of",
                PREFER_MIN_WIDTH,
            )
        height = int(height * 300 / width)
        if height < MIN_RESIZE_HEIGHT or height > MAX_RESIZE_HEIGHT:
            utils.warn(
                f,
                "will have a resized height of",
                height,
                "; the valid range is",
                MIN_RESIZE_HEIGHT,
                "-",
                MAX_RESIZE_HEIGHT,
            )
            invalid.append(f)
            continue
        if (
            height < PREFER_MIN_RESIZE_HEIGHT
            or height > PREFER_MAX_RESIZE_HEIGHT
        ):
            utils.warn(
                f,
                "will have a resized height of",
                height,
                "; this is allowed, but the preferred range is",
                PREFER_MIN_RESIZE_HEIGHT,
                "-",
                PREFER_MAX_RESIZE_HEIGHT,
                "; we prefer images with close-to-square dimensions.",
            )
    return invalid


def is_wiki(url: str) -> bool:
    return url.startswith("https://upload.wikimedia.org/")


def get_target(path: str) -> str:
    assert path.startswith(IMG_DIR)
    stem, ext = utils.splitext(path)
    assert STEM_RE.fullmatch(stem)
    assert ext in VALID_EXTENSIONS
    return os.path.join(IMG_300_DIR, stem + EXT_MAP.get(ext, ext))


def get_source(path: str) -> str:
    assert path.startswith(IMG_DIR)
    return os.path.join(SOURCES_DIR, utils.stem(path) + ".txt")


def convert(path: str, skip_existing: bool = False) -> None:
    assert path.startswith(IMG_DIR)
    target = get_target(path)
    if os.path.exists(target) and skip_existing:
        return
    # Write the converted image.
    subprocess.call(
        [
            "magick",
            path,
            "-alpha",
            "remove",
            "-alpha",
            "off",
            "-background",
            "white",
            "-resize",
            f"{TARGET_WIDTH}x",
            target,
        ],
    )
    utils.wrote(target)


def main():
    args = argparser.parse_args()
    # Preprocess arguments.
    if args.plot is not None and not args.plot:
        # The user has used --plot without providing any bounds. We add a
        # sentinel for our code to work with.
        assert args.plot == []
        args.plot = [0]
    actions: list = list(
        filter(
            None,
            [
                args.plot,
                args.validate,
                args.batch,
                args.rm,
                args.mv,
                args.cp,
                args.convert,
            ],
        ),
    )
    if len(actions) >= 2:
        utils.fatal("Up to one action argument can be given at a time.")

    if args.validate:
        validate()
        exit()
    if args.batch:
        batch(args)
        exit()
    if args.rm:
        rm(args.rm)
        exit()
    if args.mv:
        mv(*args.mv)
        exit()
    if args.cp:
        cp(*args.cp)
        exit()
    if args.convert:
        convert(_stem_to_img_path(args.convert))
        exit()
    prompt(args)


def basename(url: str) -> str:
    filename = os.path.basename(url)
    idx = filename.find("?")
    if idx != -1:
        filename = filename[:idx]
    return filename


def retrieve(
    args,
    url: str,
    filename: typing.Optional[str] = None,
) -> str:
    headers = {}
    if is_wiki(url):
        headers = WIKI_HEADERS
    filename = filename or basename(url)
    download = requests.get(url, headers=headers)
    if not download.ok:
        utils.error(download.text)
        return ""
    filename = os.path.join(args.downloads, filename)
    with open(filename, "wb") as f:
        f.write(download.content)
        utils.wrote(filename)
    return filename


def _stem_to_img_path(stem: str, ext: str = "") -> str:
    if ext:
        return os.path.join(IMG_DIR, stem + ext)
    path = glob.glob(os.path.join(IMG_DIR, stem + ".*"))
    assert len(path) == 1
    return path[0]


def _get_artifacts(stem: str, img_ext: str = "") -> list[str]:
    if not STEM_RE.fullmatch(stem):
        utils.error(
            "To delete an image, please provide the stem.",
        )
        return []
    path = _stem_to_img_path(stem, img_ext)
    return [path, get_target(path), get_source(path)]


def rm(stem: str) -> None:
    if not exists(stem):
        utils.error(stem, "doesn't exist!")
        return
    for art in _get_artifacts(stem):
        os.remove(art)


def exists(stem: str) -> bool:
    return bool(glob.glob(os.path.join(IMG_DIR, stem + ".*")))


def mv(a_stem: str, b_stem: str) -> None:
    if exists(b_stem):
        utils.error(b_stem, "already exists!")
        return
    a_arts = _get_artifacts(a_stem)
    img_ext = utils.ext(a_arts[0])
    b_arts = _get_artifacts(b_stem, img_ext)
    for a, b in zip(a_arts, b_arts):
        pathlib.Path(a).rename(b)


def cp(a_stem: str, b_stem: str) -> None:
    if exists(b_stem):
        utils.error(b_stem, "already exists!")
        return
    a_arts = _get_artifacts(a_stem)
    img_ext = utils.ext(a_arts[0])
    b_arts = _get_artifacts(b_stem, img_ext)
    for a, b in zip(a_arts, b_arts):
        shutil.copyfile(a, b)


def _pretty(json: dict[str, str] | dict[str, list[str]] | list[str]):
    if isinstance(json, list):
        for x in json:
            print(colorama.Fore.CYAN + x + colorama.Fore.RESET)
        return

    assert isinstance(json, dict)
    if all(isinstance(v, str) for v in json.values()):
        for key, value in json.items():
            assert isinstance(value, str)
            print(
                colorama.Fore.CYAN
                + key
                + colorama.Fore.RESET
                + ": "
                + colorama.Fore.MAGENTA
                + value
                + colorama.Fore.RESET,
            )
        return

    assert all(isinstance(v, list) for v in json.values())
    for key, value in json.items():
        assert isinstance(value, list)
        print(
            colorama.Fore.CYAN
            + key
            + colorama.Fore.RESET
            + ": ["
            + ", ".join(
                colorama.Fore.MAGENTA + v + colorama.Fore.RESET for v in value
            )
            + "]",
        )


def is_image_url(url: str) -> bool:
    return any(basename(url).endswith(ext) for ext in IMAGE_EXTENSIONS)


def infer_urls(command) -> tuple[list[str], list[str]]:
    urls: list[str] = list(filter(None, command.split()))

    reference: list[str] = []
    download: list[str] = []
    for url in urls:
        (reference, download)[is_image_url(url)].append(url)
    while not reference or not download:
        utils.warn(
            "We encourage you to provide both reference and download URLs.",
        )
        extras = list(filter(None, input("URLs: (s to skip)").lower().split()))
        if extras == ["s"]:
            break
        valid = True
        for ext in extras:
            if not ext.startswith("http"):
                utils.error(ext, "is not a URL!")
                valid = False
                break
        if not valid:
            continue
        urls.extend(extras)
        reference.clear()
        download.clear()
        for url in urls:
            (reference, download)[is_image_url(url)].append(url)
    return reference, download


def prompt(args):
    plot_yes: int = 0
    plot_no: int = 0
    key_to_senses: dict[str, dict[str, str]] = {
        row[KEY_COL]: json.loads(row[SENSES_COL] or "{}")
        for _, row in utils.read_tsv(APPENDICES_TSV, KEY_COL).iterrows()
    }
    key_to_row: dict[str, pd.Series] = {
        row[KEY_COL]: row
        for _, row in utils.read_tsvs(INPUT_TSVS, KEY_COL).iterrows()
    }

    sources: dict[str, list[str]] = {}

    exclude = {}
    for e in args.exclude:
        k, v = e.split(":")
        assert k
        assert k not in exclude
        exclude[k] = v

    for key in sorted(key_to_row.keys(), key=lambda k: int(k)):
        row = key_to_row[key]
        if int(key) < args.start_at_key:
            continue
        if int(key) > args.end_at_key:
            break
        if any(row[k] == v for k, v in exclude.items()):
            continue

        def existing() -> list[str]:
            return glob.glob(os.path.join(IMG_DIR, f"{key}-*"))

        if args.skip_existing and existing():
            continue

        if args.plot:
            if int(key) < int(args.plot[0]):
                continue
            if len(args.plot) > 1 and int(key) > int(args.plot[1]):
                break
            if existing():
                plot_yes += 1
                message = colorama.Fore.GREEN + "YES"
            else:
                plot_no += 1
                message = colorama.Fore.RED + "NO"
            print(key, message + colorama.Fore.RESET)
            continue
        open_images(existing())
        open_links(row)

        while True:
            # Force read a valid sense, or no sense at all.
            g = existing()
            # TODO: Prettify the output a little bit. Maybe use JSON
            # indentations.
            utils.info("Key:", key)
            utils.info("Link:", row[LINK_COL])
            utils.info("Existing:")
            _pretty(g)
            utils.info("Downloads:")
            _pretty(get_downloads(args))
            utils.info("Senses:")
            _pretty(key_to_senses[key])
            utils.info("Sources:")
            _pretty(sources)
            print()
            utils.info("Enter:")
            utils.info(
                "-",
                "${URL}",
                "to download an image and store the URL as the source.",
            )
            utils.info(
                "-",
                "noun ${QUERY}",
                "to query",
                "thenounproject",
                "API.",
            )
            utils.info("-", "wiki ${PAGE}", "to open a", "Wikipedia", "page.")
            utils.info("-", "key ${KEY}", "to point to a different key.")
            utils.info(
                "-",
                "rm ${KEY}",
                "to delete an image and its artifacts.",
            )
            utils.info(
                "-",
                "mv ${KEY_1} ${KEY_2}",
                "to move an image and its artefacts.",
            )
            utils.info(
                "-",
                "cp ${KEY_1} ${KEY_2}",
                "to copy an image and its artefacts.",
            )
            utils.info(
                "-",
                "convert ${KEY}",
                "to (re)convert one image.",
            )
            utils.info(
                "-",
                "source ${SOURCE}",
                "to populate the source for the only image in",
                args.downloads,
                "that is missing a source.",
            )
            utils.info(
                "-",
                "source ${PATH} ${SOURCE}",
                "to populate the source for a given image.",
            )
            utils.info("-", "s", "to skip.")
            utils.info("-", "ss", "to force-skip.")
            utils.info("-", "cs", "to clear sources.")
            utils.info("-", "sense number to initiate transfer.")
            print()
            command = input()
            command = command.strip()
            if not command:
                continue

            if command.lower() == "s":
                # S for skip!
                files = get_downloads(args)
                if files:
                    utils.error(
                        "You can't skip with a dirty downloads directory:",
                        files,
                    )
                    continue
                # We clear the sources!
                # It's guaranteed that the downloads directory is clean.
                sources.clear()
                utils.info("Sources cleared!")
                break

            if command.lower() == "ss":
                # Force skip!
                break

            if command.lower() == "cs":
                sources.clear()
                utils.info("Sources cleared!")
                continue

            if command.startswith("key "):
                key = command[4:]
                row = key_to_row[key]
                open_images(existing())
                open_links(row)
                continue

            if command.startswith("convert "):
                key = command[8:]
                convert(_stem_to_img_path(key))
                continue

            if command.startswith("source "):
                files = get_downloads(args)
                files = [f for f in files if f not in sources]
                if len(files) != 1:
                    utils.error(
                        "Can't assign source because the number of new files"
                        " != 1:",
                        files,
                    )
                    continue
                command = command[7:]
                if not command:
                    utils.error("No source given!")
                    continue
                sources[files[0]] = sum(infer_urls(command), [])
                continue

            if command.startswith("rm "):
                try:
                    rm(command[3:])
                except Exception as e:
                    utils.error(e)
                continue

            if command.startswith("cp "):
                try:
                    command = command[3:]
                    cp(*command.split())
                except Exception as e:
                    utils.error(e)
                continue

            if command.startswith("mv "):
                try:
                    command = command[3:]
                    mv(*command.split())
                except Exception as e:
                    utils.error(e)
                continue

            source_search = ASSIGN_SOURCE_RE.search(command)
            if source_search:
                sources[
                    source_search.group(
                        1,
                    )
                ] = sum(infer_urls(source_search.group(2)), [])
                continue
            del source_search

            if command.startswith("http"):
                reference, download = infer_urls(command)
                for url in download:
                    path = retrieve(args, url)
                    if not path:
                        continue
                    sources[path] = reference + [url]
                continue

            if command.lower().startswith("wiki "):
                subprocess.call(
                    ["open", f"https://en.wikipedia.org/wiki/{command[5:]}"],
                )
                continue

            if command.lower().startswith("noun "):
                # This is likely a search query.
                command = command[5:]
                auth = requests_oauthlib.OAuth1(
                    args.thenounproject_key,
                    args.thenounproject_secret,
                )
                resp = requests.get(
                    ICON_SEARCH_FMT.format(query=command),
                    auth=auth,
                )
                if not resp.ok:
                    utils.error("", resp.text)
                    continue
                icons = resp.json()["icons"]
                del resp
                if not icons:
                    utils.error(
                        "Nothing found on thenounproject for:",
                        command,
                    )
                    continue
                for icon in icons:
                    path = retrieve(args, icon["thumbnail_url"])
                    if not path:
                        continue
                    sources[path] = [
                        NOUN_URL + icon["permalink"],
                        icon["thumbnail_url"],
                    ]
                continue

            if not command.isdigit():
                utils.error("Can't make sense of", command)
                continue

            sense = int(command)
            if sense <= 0:
                utils.error("Sense must be a positive integer, got:", sense)
                continue

            files = get_downloads(args)

            # Force valid extension.
            invalid = [
                e for e in map(utils.ext, files) if e not in VALID_EXTENSIONS
            ]
            if invalid:
                utils.error(
                    "Invalid extensions:",
                    invalid,
                    "Add them to the list if you're sure your script can"
                    " process them.",
                )
                continue

            # Force size.
            invalid = invalid_size(files)
            if invalid:
                utils.error("Images have an invalid size:", invalid)
                continue

            # Force sources.
            absent_source = False
            for file in files:
                if file not in sources:
                    utils.error("Please populate the source for:", file)
                    absent_source = True
            if absent_source:
                continue

            # If there are no files, we assume that the user doesn't want to
            # add pictures for this word. (Unless they typed a sense, in which
            # case it would be weird!)
            if not files:
                utils.error(
                    "You typed a sense, but there are no pictures! This"
                    " doesn't make sense!",
                )
                continue

            # Verify the images.
            i = ""
            move = False
            while True:
                open_images(files)
                i = input("Looks good? (y/n)").lower()
                files = get_downloads(args)
                if i in ["y", "yes"]:
                    move = True
                    break
                if i in ["n", "no"]:
                    move = False
                    break

            if not move:
                continue

            # Move the files.
            idx = get_max_idx(existing(), str(key), str(sense))
            for file in files:
                idx += 1
                ext = utils.ext(file)
                new_file = os.path.join(IMG_DIR, f"{key}-{sense}-{idx}{ext}")
                pathlib.Path(file).rename(new_file)
                convert(new_file)
                utils.write("\n".join(sources[file]), get_source(new_file))
    if plot_yes or plot_no:
        print(
            colorama.Fore.GREEN + str(plot_yes) + colorama.Fore.RESET,
            colorama.Fore.RED + str(plot_no) + colorama.Fore.RESET,
        )


def batch(args):
    images = utils.paths(IMG_DIR)
    for path in images:
        convert(path, args.skip_existing)
    targets = {get_target(p) for p in images}
    for converted in utils.paths(IMG_300_DIR):
        if converted not in targets:
            os.remove(converted)
    sources = {get_source(path) for path in images}
    for src in utils.paths(SOURCES_DIR):
        if src not in sources:
            os.remove(src)


def listdir_sorted(dir: str) -> list[str]:
    return utils.sort_semver(utils.paths(dir))


def validate():
    images = listdir_sorted(IMG_DIR)
    converted_images = listdir_sorted(IMG_300_DIR)
    sources = listdir_sorted(SOURCES_DIR)

    utils.verify_unique(utils.stems(images), "images:")
    utils.verify_unique(utils.stems(converted_images), "converted images:")
    utils.verify_unique(utils.stems(sources), "sources:")

    # Checking that extensions are valid.
    utils.verify_all_belong_to_set(
        utils.exts(images),
        VALID_EXTENSIONS,
        "Images: Unknown extension:",
    )
    utils.verify_all_belong_to_set(
        utils.exts(converted_images),
        VALID_EXTENSIONS_300,
        "Converted Images: Unknown extension:",
    )
    utils.verify_all_belong_to_set(
        utils.exts(sources),
        {".txt"},
        "Sources: Unknown extension:",
    )

    # Verify that all three directories have the same set of IDs.
    utils.verify_equal_sets(
        utils.stems(images),
        utils.stems(converted_images),
        "Images and converted images:",
    )
    utils.verify_equal_sets(
        utils.stems(images),
        utils.stems(sources),
        "Images and sources:",
    )

    # Check that all images have valid IDs.
    for stem in utils.stems(images):
        match = STEM_RE.fullmatch(stem)
        if match:
            continue
        utils.fatal("Invalid stem:", stem)

    # Check that the sources and converted images are more recent than the
    # original ones.
    offending: list[str] = []
    for image, converted, source in zip(images, converted_images, sources):
        # Sanity check!
        assert utils.stem(image) == utils.stem(converted) == utils.stem(source)
        mtime = os.stat(image).st_mtime
        if mtime > os.stat(converted).st_mtime:
            offending.append(converted)
        if mtime > os.stat(source).st_mtime:
            offending.append(source)
    if offending:
        utils.fatal("Artifacts may be obsolete:", "\n".join(offending))

    # Validate content of the source files.
    for path in sources:
        content: str = utils.read(path)
        if not content:
            # TODO: (#258) Ban empty sources.
            continue
        lines: list[str] = list(
            filter(None, [line.strip() for line in content.split("\n")]),
        )
        del content
        if not lines:
            utils.fatal("Source file is not empty, but has empty lines:", path)
        for line in lines:
            if line.startswith("http"):
                continue
            # TODO: (#258) Stop using city names. Always have a URL.
            if NAME_RE.fullmatch(line):
                continue
            utils.fatal(
                "Can't make sense of this source:",
                line,
                "in file",
                path,
            )


if __name__ == "__main__":
    main()
