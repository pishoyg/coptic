#!/usr/bin/env python3
"""Crum images helper."""
import argparse
import glob
import json
import os
import pathlib
import re
import shutil
import subprocess
import typing
import urllib

import colorama
import pandas as pd
import requests
from PIL import Image

from dictionary.marcion_sourceforge_net import tsv
from utils import file, log, sane, semver, text

# TODO: (#5) Prevent users from updating an image without updating its source.
# Somehow!

_SCRIPT_DIR = pathlib.Path(__file__).parent
_TIMEOUT_S = 5

TARGET_WIDTH = 300
MIN_WIDTH = 200  # Minimum height of the input image.
PREFER_MIN_WIDTH = 300
MIN_RESIZE_HEIGHT = 100  # Minimum allowed height of the resized image. (#240)
PREFER_MIN_RESIZE_HEIGHT = 200
MAX_RESIZE_HEIGHT = 500  # Maximum allowed height of the resized image. (#240)
PREFER_MAX_RESIZE_HEIGHT = 400

IMG_DIR = str(_SCRIPT_DIR / "data" / "img")
IMG_300_DIR = "docs/crum/explanatory/"

FILE_NAME_RE = re.compile(r"(\d+)-(\d+)-(\d+)\.[^\d]+")
STEM_RE = re.compile("[0-9]+-[0-9]+-[0-9]+")
NAME_RE = re.compile("[A-Z][a-zA-Z ]*")

DOMAIN = "remnqymi.com"
CRUM = f"{DOMAIN}/crum"

KEY_COL: str = "key"
SENSES_COL: str = "senses"
SOURCES_DIR: str = str(_SCRIPT_DIR / "data" / "img-sources")

BANNED_TOP_LEVEL_DOMAINS = {
    "gstatic.com",
}

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


QUERIERS_FMT: dict[str, list[str]] = {
    "g": ["https://www.google.com/search?q={query}&tbm=isch"],
    "b": ["https://www.bing.com/images/search?q={query}"],
    "free": [
        "https://www.freepik.com/search?format=search&type=icon&query={query}",
    ],
    "flat": ["https://www.flaticon.com/search?word={query}"],
    "wing": ["https://uxwing.com/?s={query}"],
    "vec": ["https://www.vecteezy.com/free-png/{query}?license-free=true"],
    "wiki": ["https://en.wikipedia.org/wiki/{query}"],
    # Search Google, restricting the results to a given site.
    "gfree": [
        "https://www.google.com/search?q=site:freepik.com {query}&tbm=isch",
    ],
    "gflat": [
        "https://www.google.com/search?q=site:flaticon.com {query}&tbm=isch",
    ],
    "gwing": [
        "https://www.google.com/search?q=site:uxwing.com {query}&tbm=isch",
    ],
    "gvec": [
        "https://www.google.com/search?q=site:vecteezy.com {query}&tbm=isch",
    ],
    "gwiki": [
        "https://www.google.com/search?q=site:wikipedia.org {query}&tbm=isch",
    ],
    "gicon": [
        # pylint: disable-next=line-too-long
        "https://www.google.com/search?q=(site:freepik.com OR site:flaticon.com OR site:uxwing.com OR site:vecteezy.com) {query} icon&tbm=isch",
    ],
    # Search Bing, restricting the results to a given site.
    "bfree": ["https://www.bing.com/images/search?q=site:freepik.com {query}"],
    "bflat": [
        "https://www.bing.com/images/search?q=site:flaticon.com {query}",
    ],
    "bwing": [
        "https://www.bing.com/images/search?q=site:uxwing.com {query}",
    ],
    "bvec": ["https://www.bing.com/images/search?q=site:vecteezy.com {query}"],
    "bwiki": [
        "https://www.bing.com/images/search?q=site:wikipedia.org {query}",
    ],
    "bicon": [
        # pylint: disable-next=line-too-long
        "https://www.bing.com/images/search?q=(site:freepik.com OR site:flaticon.com OR site:uxwing.com OR site:vecteezy.com) {query} icon",
    ],
}

WIKI_HEADERS = {
    "Api-User-Agent": "Coptic/1.0 (https://remnqymi.com; remnqymi@gmail.com)",
    "User-Agent": "Coptic/1.0 (https://remnqymi.com; remnqymi@gmail.com)",
}

argparser = argparse.ArgumentParser(
    description="Find and process images for the dictionary words.",
)

_ = argparser.add_argument(
    "-s",
    "--start",
    type=int,
    default=0,
    help="Skips keys lower than this value.",
)

_ = argparser.add_argument(
    "-e",
    "--end",
    type=int,
    default=1000000000,
    help="Terminate after reaching this key.",
)

_ = argparser.add_argument(
    "-x",
    "--exclude",
    type=str,
    nargs="*",
    default=[],
    help="A list of types to exclude.",
)

_ = argparser.add_argument(
    "-d",
    "--downloads",
    type=str,
    default=os.path.join(os.path.expanduser("~"), "Desktop/"),
    help="Path to the downloads directory.",
)

_ = argparser.add_argument(
    "-i",
    "--ignore",
    type=str,
    nargs="*",
    default=[".DS_Store", ".localized"],
    help="List of files in the downloads directory to ignore.",
)

_ = argparser.add_argument(
    "-k",
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

_ = argparser.add_argument(
    "-r",
    "--rm",
    type=str,
    default=[],
    nargs="*",
    help="If given, delete the artifacts for the given stem(s), and exit.",
)

_ = argparser.add_argument(
    "-z",
    "--mv",
    type=str,
    default=[],
    nargs="*",
    help="If given, rename the artifacts for the given stem, and exit. Exactly"
    " two arguments must be given, the source and destination stems.",
)

_ = argparser.add_argument(
    "-c",
    "--cp",
    type=str,
    default=[],
    nargs="*",
    help="If given, copy the artifacts for the given stem, and exit. Exactly"
    " two arguments must be given, the source and destination stems.",
)

_ = argparser.add_argument(
    "-n",
    "--convert",
    type=str,
    default=[],
    nargs="*",
    help="If given, (re)convert the image(s) with the given stem, and exit.",
)

_ = argparser.add_argument(
    "-v",
    "--validate",
    default=False,
    action="store_true",
    help="If true, just validate the directories and exit.",
)

_ = argparser.add_argument(
    "-b",
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

_ = argparser.add_argument(
    "-p",
    "--plot",
    default=False,
    action="store_true",
    help="If given, plot a YES or NO for whether each included picture has an"
    " image.",
)


def link(key: str) -> str:
    return f"https://{CRUM}/{key}.html"


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


def os_open(*args: str):
    if not args:
        return
    _ = subprocess.run(["open"] + list(args), check=True)


def get_downloads(args) -> list[str]:
    files = os.listdir(args.downloads)
    files = [f for f in files if f not in args.ignore]
    files = [os.path.join(args.downloads, f) for f in files]
    files = [f for f in files if os.path.isfile(f)]
    return files


def invalid_size(files: list[str]) -> list[str]:
    assert MIN_WIDTH > 0
    invalid = []
    for f in files:
        image = Image.open(f)  # type: ignore[attr-defined]
        width, height = image.size
        if width < MIN_WIDTH:
            log.warn(
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
            log.warn(
                f,
                "has a width of",
                width,
                "; this is allowed but discouraged, consider fetching an"
                " image with a minimum width of",
                PREFER_MIN_WIDTH,
            )
        height = int(height * 300 / width)
        if height < MIN_RESIZE_HEIGHT or height > MAX_RESIZE_HEIGHT:
            log.warn(
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
            log.warn(
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
    stem, ext = file.splitext(path)
    assert STEM_RE.fullmatch(stem)
    log.ass(ext in VALID_EXTENSIONS, ext, "is not a valid extension")
    return os.path.join(IMG_300_DIR, stem + EXT_MAP.get(ext, ext))


def get_source(path: str) -> str:
    assert path.startswith(IMG_DIR)
    return os.path.join(SOURCES_DIR, file.stem(path) + ".txt")


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
    log.wrote(target)


def main():
    args = argparser.parse_args()
    # Preprocess arguments.
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
        log.fatal("Up to one action argument can be given at a time.")

    if args.validate:
        validate()
        exit()
    if args.batch:
        batch(args)
        exit()
    if args.rm:
        for stem in args.rm:
            rm(stem)
        exit()
    if args.mv:
        mv(*args.mv)
        exit()
    if args.cp:
        cp(*args.cp)
        exit()
    if args.convert:
        for stem in args.convert:
            convert(_stem_to_img_path(stem))
        exit()
    Prompter(args).prompt()


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
    download = requests.get(url, headers=headers, timeout=_TIMEOUT_S)
    if not download.ok:
        log.throw(download.text)
    filename = os.path.join(args.downloads, filename)
    with open(filename, "wb") as f:
        f.write(download.content)
        log.wrote(filename)
    return filename


def _stem_to_img_path(stem: str, ext: str = "") -> str:
    if ext:
        return os.path.join(IMG_DIR, stem + ext)
    path = glob.glob(os.path.join(IMG_DIR, stem + ".*"))
    assert len(path) == 1
    return path[0]


def _get_artifacts(stem: str, img_ext: str = "") -> list[str]:
    assert STEM_RE.fullmatch(stem)
    path = _stem_to_img_path(stem, img_ext)
    return [path, get_target(path), get_source(path)]


def rm(stem: str) -> None:
    if not exists(stem):
        log.throw(stem, "doesn't exist!")
    for art in _get_artifacts(stem):
        os.remove(art)


def exists(stem: str) -> bool:
    return bool(glob.glob(os.path.join(IMG_DIR, stem + ".*")))


def mv(a_stem: str, b_stem: str) -> None:
    if exists(b_stem):
        log.throw(b_stem, "already exists!")
    a_arts = _get_artifacts(a_stem)
    img_ext = file.ext(a_arts[0])
    b_arts = _get_artifacts(b_stem, img_ext)
    for a, b in zip(a_arts, b_arts):
        pathlib.Path(a).rename(b)


def cp(a_stem: str, b_stem: str) -> None:
    if exists(b_stem):
        log.throw(b_stem, "already exists!")
    a_arts = _get_artifacts(a_stem)
    img_ext = file.ext(a_arts[0])
    b_arts = _get_artifacts(b_stem, img_ext)
    for a, b in zip(a_arts, b_arts):
        shutil.copyfile(a, b)


def _pretty(j: dict[str, str] | dict[str, list[str]] | list[str]):
    if isinstance(j, list):
        for x in j:
            print(colorama.Fore.CYAN + x + colorama.Fore.RESET)
        return

    assert isinstance(j, dict)
    if all(isinstance(v, str) for v in j.values()):
        for key, value in j.items():
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

    assert all(isinstance(v, list) for v in j.values())
    for key, value in j.items():
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


def is_invalid_url(url: str) -> list[str]:
    """Test URL validity.

    Args:
        url: The URL to test.

    Returns:
        A list representing the error message if the URL is invalid; the empty
        list if valid.
    """
    if not url.startswith("http"):
        return ["Invalid URL!"]
    top_level_domain = ".".join(
        urllib.parse.urlparse(url).netloc.split(".")[-2:],
    )
    if top_level_domain in BANNED_TOP_LEVEL_DOMAINS:
        return ["Banned domain:", top_level_domain]
    return []


def infer_urls(*urls: str) -> tuple[list[str], list[str]]:
    reference: list[str] = []
    download: list[str] = []
    for url in urls:
        err = is_invalid_url(url)
        if err:
            log.throw(*err)
    for url in urls:
        (reference, download)[is_image_url(url)].append(url)
    while not reference or not download:
        log.warn(
            "We encourage you to provide both reference and download URLs.",
        )
        extras = text.ssplit(input("URLs: (s to skip)").lower())
        if extras == ["s"]:
            break
        valid = True
        for ext in extras:
            err = is_invalid_url(ext)
            if err:
                log.error(*err)
                valid = False
                break
        if not valid:
            continue
        reference.clear()
        download.clear()
        for url in list(urls) + extras:
            (reference, download)[is_image_url(url)].append(url)
    return reference, download


def existing(key: str) -> list[str]:
    assert key.isdigit()
    return glob.glob(os.path.join(IMG_DIR, f"{key}-*"))


def clear(key: str) -> None:
    if not key.isdigit():
        log.throw(key, "is not a valid word key.")
    for path in existing(key):
        stem = file.stem(path)
        rm(stem)
        log.info("cleared", stem)


class Prompter:
    """Prompt user for commands."""

    def __init__(self, args):
        self.args = args
        self.plot_yes: int = 0
        self.plot_no: int = 0
        self.key_to_row: dict[str, pd.Series] = {
            row[KEY_COL]: row for _, row in tsv.roots().iterrows()
        }

        self.sources: dict[str, list[str]] = {}

        self.exclude: dict[str, str] = {}
        for e in args.exclude:
            k, v = e.split(":")
            assert k
            assert k not in self.exclude
            self.exclude[k] = v

        self.key: str = ""
        self.row: pd.Series = pd.Series()

    def print_info(self):
        print()
        log.info("Data:")
        log.info("- Key:", self.key)
        log.info("- Link:", link(self.row[KEY_COL]))
        log.info("- Existing:")
        _pretty(existing(self.key))
        log.info("- Downloads:")
        _pretty(get_downloads(self.args))
        log.info("- Senses:")
        _pretty(json.loads(self.key_to_row[self.key][SENSES_COL]))
        log.info("- Sources:")
        _pretty(self.sources)
        print()
        log.info("Commands:")
        log.info(
            "-",
            "${URL}*",
            "to download an image and store the URL as the source."
            "The URLs will be categorized into image-URLs and non-image"
            " URLs. The former will be retrieved, and the latter will"
            " simply be stored as sources.",
        )
        log.info("-", "key ${KEY}", "to point to a different key.")
        log.info(
            "-",
            "rm ${KEY}",
            "to delete an image and its artifacts.",
        )
        log.info(
            "-",
            "mv ${KEY_1} ${KEY_2}",
            "to move an image and its artefacts.",
        )
        log.info(
            "-",
            "cp ${KEY_1} ${KEY_2}",
            "to copy an image and its artefacts.",
        )
        log.info(
            "-",
            "clear [${KEY}]",
            "to delete all images and artifacts belonging to the given"
            " key, or the current key if none is specified.",
        )

        log.info(
            "-",
            "convert ${KEY}",
            "to (re)convert one image.",
        )
        log.info(
            "-",
            "source ${SOURCE}",
            "to populate the source for the only image in",
            self.args.downloads,
            "that is missing a source. Multiple URLs are allowed, in which"
            " case all are recorded as sources for the said image.",
        )
        log.info(
            "-",
            "source ${PATH} ${SOURCE}",
            "to populate the source for a given image. Multiple URLs are"
            " allowed, in which case all are recorded as sources for the"
            " said image.",
        )
        log.info("-", "s", "to skip.")
        log.info("-", "ss", "to force-skip.")
        log.info("-", "cs", "to clear sources.")
        log.info(
            "-",
            "${SENSE}",
            "to assign a sense ID and initiate transfer.",
        )
        print()
        log.info("Queries:")
        log.info(
            "-",
            "[g|b|free|flat|wing|vec|wiki] ${QUERY}",
            "to search",
            "Google, Bing, Freepik, UXWing, Flaticon, Vecteezy, Wikipedia",
            "for the given query.",
        )
        log.info(
            "-",
            "[gfree|gflat|gwing|gvec|gwiki] ${QUERY}",
            "to search",
            "Google",
            "for the given query, restricting results to the given site.",
        )
        log.info(
            "-",
            "[bfree|bflat|bwing|bvec|bwiki] ${QUERY}",
            "to search",
            "Bing",
            "for the given query, restricting results to the given site.",
        )
        log.info(
            "-",
            "[gicon|bicon] ${QUERY}",
            "to search",
            "Google/Bing",
            "for the given query, restricting results to known icon-providing "
            "sites.",
        )
        print()

    def prompt(self):
        for key in sorted(self.key_to_row.keys(), key=int):
            self.key = key
            self.row = self.key_to_row[self.key]
            if not self.prompt_for_word():
                break
        if self.args.plot:
            print(
                colorama.Fore.GREEN + str(self.plot_yes) + colorama.Fore.RESET,
                colorama.Fore.RED + str(self.plot_no) + colorama.Fore.RESET,
            )

    def prompt_for_word(self) -> bool:
        """
        Returns:
            True if you should continue, False if you should stop.

        Raises:
            AssertionError: If an invariant is broken.
        """
        if int(self.key) < self.args.start:
            return True
        if int(self.key) > self.args.end:
            return False
        if any(self.row[k] == v for k, v in self.exclude.items()):
            return True
        if self.args.skip_existing and existing(self.key):
            return True

        if self.args.plot:
            if int(self.key) < int(self.args.start):
                return True
            if int(self.key) > int(self.args.end):
                return False
            if existing(self.key):
                self.plot_yes += 1
                message = colorama.Fore.GREEN + "YES"
            else:
                self.plot_no += 1
                message = colorama.Fore.RED + "NO"
            print(self.key, message + colorama.Fore.RESET)
            return True

        os_open(*existing(self.key), link(self.row[KEY_COL]))

        while True:
            try:
                if not self.prompt_for_command():
                    return True
            # Rethrowing assertion errors is desirable. Assertions have a
            # different use case than other types of exceptions, as they are
            # meant to flag errors that never happen, rather than errors that
            # happen occasionally. We use assertions for sanity checks or code
            # invariants, while we use exceptions for user input errors and the
            # like. The former (assertion) category isn't expected!
            # Another point is that most assertions don't have error messages
            # associated with them, so they aren't informative when caught.
            # Exiting the program upon encountering an assertion is a way to
            # flag their presence to us so we will replace them with exceptions
            # that have meaningful error messages.
            except AssertionError as e:
                raise e
            except Exception as e:  # pylint: disable=broad-exception-caught
                log.error(e)

    def prompt_for_command(self) -> bool:
        """
        Returns:
            True if you should continue, False if you should stop.
        """
        self.print_info()

        command = input()
        command = command.strip()
        if not command:
            return True
        split = text.split(command)
        command, params = split[0].lower(), split[1:]
        del split

        if command == "s":
            # S for skip!
            files = get_downloads(self.args)
            if files:
                log.throw(
                    "You can't skip with a dirty downloads directory:",
                    files,
                )
            # We clear the sources!
            # It's guaranteed that the downloads directory is clean.
            self.sources.clear()
            log.info("Sources cleared!")
            return False

        if command == "ss":
            # Force skip!
            return False

        if command == "cs":
            self.sources.clear()
            log.info("Sources cleared!")
            return True

        if command == "key":
            for key in params:
                self.key = key
                self.row = self.key_to_row[self.key]
                os_open(*existing(self.key), link(self.row[KEY_COL]))
            return True

        if command == "convert":
            for stem in params:
                convert(_stem_to_img_path(stem))
            return True

        if command == "source":
            files = [p for p in params if not p.startswith("http")] or [
                f for f in get_downloads(self.args) if f not in self.sources
            ]
            if len(files) != 1:
                log.throw(
                    "We can only assign sources to 1 file, got:",
                    files,
                )
            params = [p for p in params if p.startswith("http")]
            if not params:
                log.throw("No source given!")
            self.sources[files[0]] = sum(infer_urls(*params), [])
            return True

        if command in QUERIERS_FMT:
            query = " ".join(params)
            for fmt in QUERIERS_FMT[command]:
                os_open(fmt.format(query=query))
            return True

        if command == "rm":
            rm(*params)
            return True

        if command == "cp":
            cp(*params)
            return True

        if command == "mv":
            mv(*params)
            return True

        if command == "clear":
            if params:
                for p in params:
                    clear(p)
            else:
                clear(self.key)
            return True

        if command.startswith("http"):
            reference, download = infer_urls(command, *params)
            for url in download:
                path = retrieve(self.args, url)
                if not path:
                    continue
                self.sources[path] = reference + [url]
            return True

        if not command.isdigit():
            log.throw("Can't make sense of", command)

        sense = int(command)
        if sense <= 0:
            log.throw("Sense must be a positive integer, got:", sense)

        files = get_downloads(self.args)

        # Force valid extension.
        invalid = [
            e for e in map(file.ext, files) if e not in VALID_EXTENSIONS
        ]
        if invalid:
            log.throw(
                "Invalid extensions:",
                invalid,
                "Add them to the list if you're sure your script can"
                " process them.",
            )

        # Force size.
        invalid = invalid_size(files)
        if invalid:
            log.throw("Images have an invalid size:", invalid)

        # Force sources.
        for f in files:
            if f not in self.sources:
                log.throw("Please populate the source for:", f)

        # If there are no files, we assume that the user doesn't want to
        # add pictures for this word. (Unless they typed a sense, in which
        # case it would be weird!)
        if not files:
            log.throw(
                "You typed a sense, but there are no pictures! This"
                " doesn't make sense!",
            )

        # Verify the images.
        i = ""
        move = False
        while True:
            os_open(*files)
            i = input("Looks good? (y/n)").lower()
            files = get_downloads(self.args)
            if i in ["y", "yes"]:
                move = True
                break
            if i in ["n", "no"]:
                move = False
                break

        if not move:
            return True

        # Move the files.
        idx = get_max_idx(existing(self.key), str(self.key), str(sense))
        for f in files:
            idx += 1
            ext = file.ext(f)
            new_file = os.path.join(IMG_DIR, f"{self.key}-{sense}-{idx}{ext}")
            pathlib.Path(f).rename(new_file)
            convert(new_file)
            file.write("\n".join(self.sources[f]), get_source(new_file))

        return True


def batch(args):
    def key(path):
        return int(file.stem(path).split("-")[0])

    images = file.paths(IMG_DIR)
    images = sorted(images, key=key)
    for path in images:
        convert(path, args.skip_existing)
    targets = {get_target(p) for p in images}
    for converted in file.paths(IMG_300_DIR):
        if converted not in targets:
            os.remove(converted)
    sources = {get_source(path) for path in images}
    for src in file.paths(SOURCES_DIR):
        if src not in sources:
            os.remove(src)


def listdir_sorted(directory: str) -> list[str]:
    return semver.sort_semver(file.paths(directory))


def validate():
    images = listdir_sorted(IMG_DIR)
    converted_images = listdir_sorted(IMG_300_DIR)
    sources = listdir_sorted(SOURCES_DIR)

    sane.verify_unique(file.stems(images), "images:")
    sane.verify_unique(file.stems(converted_images), "converted images:")
    sane.verify_unique(file.stems(sources), "sources:")

    # Checking that extensions are valid.
    sane.verify_all_belong_to_set(
        file.exts(images),
        VALID_EXTENSIONS,
        "Images: Unknown extension:",
    )
    sane.verify_all_belong_to_set(
        file.exts(converted_images),
        VALID_EXTENSIONS_300,
        "Converted Images: Unknown extension:",
    )
    sane.verify_all_belong_to_set(
        file.exts(sources),
        {".txt"},
        "Sources: Unknown extension:",
    )

    # Verify that all three directories have the same set of IDs.
    sane.verify_equal_sets(
        file.stems(images),
        file.stems(converted_images),
        "Images and converted images:",
    )
    sane.verify_equal_sets(
        file.stems(images),
        file.stems(sources),
        "Images and sources:",
    )

    # Check that all images have valid IDs.
    for stem in file.stems(images):
        match = STEM_RE.fullmatch(stem)
        if match:
            continue
        log.fatal("Invalid stem:", stem)

    # Validate content of the source files.
    for path in sources:
        content: str = file.read(path)
        if not content:
            # TODO: (#258) Ban empty sources.
            continue
        lines: list[str] = text.split(content, "\n")
        del content
        if not lines:
            log.fatal("Source file is not empty, but has empty lines:", path)
        for line in lines:
            if line.startswith("http"):
                continue
            # TODO: (#258) Stop using city names. Always have a URL.
            if NAME_RE.fullmatch(line):
                continue
            log.fatal(
                "Can't make sense of this source:",
                line,
                "in file",
                path,
            )


if __name__ == "__main__":
    main()
