#!/usr/bin/env python3
"""Crum images helper."""

import argparse
import glob
import os
import pathlib
import re
import shutil
import subprocess
import urllib
from collections import abc

import colorama
import requests
from PIL import Image

from dictionary.marcion_sourceforge_net import main as crum
from utils import ensure, file, log, paths, semver, text

# TODO: (#5) Prevent users from updating an image without updating its source.
# Somehow!

# TODO: (#399) Move relevant logic to the Crum interface in `main.py`.
_SCRIPT_DIR = pathlib.Path(__file__).parent
_TIMEOUT_S = 5

_TARGET_WIDTH = 300
_MIN_WIDTH = 200  # Minimum height of the input image.
_PREFER_MIN_WIDTH = 300
_MIN_RESIZE_HEIGHT = 100  # Minimum allowed height of the resized image. (#240)
_PREFER_MIN_RESIZE_HEIGHT = 200
_MAX_RESIZE_HEIGHT = 500  # Maximum allowed height of the resized image. (#240)
_PREFER_MAX_RESIZE_HEIGHT = 400

_IMG_DIR = str(_SCRIPT_DIR / "data" / "img")
_IMG_300_DIR = "docs/crum/explanatory/"

_FILE_NAME_RE = re.compile(r"(\d+)-(\d+)-(\d+)\.[^\d]+")
_STEM_RE = re.compile("[0-9]+-[0-9]+-[0-9]+")
_NAME_RE = re.compile("[A-Z][a-zA-Z ]*")

_SOURCES_DIR: str = str(_SCRIPT_DIR / "data" / "img-sources")

_BANNED_TOP_LEVEL_DOMAINS = {
    "gstatic.com",
}

# NOTE: SVG conversion is nondeterministic, which is badly disruptive to our
# pipelines, so we ban it.
# PNG conversion is deterministic as long as it's converted to JPG, so we
# accept it but convert it.
_EXT_MAP = {
    ".png": ".jpg",
}
_IMAGE_EXTENSIONS = {
    ".avif",
    ".gif",
    ".jpeg",
    ".jpg",
    ".JPG",
    ".png",
    ".webp",
    ".svg",
}
_VALID_EXTENSIONS = _IMAGE_EXTENSIONS.difference({".svg"})
_VALID_EXTENSIONS_300 = _VALID_EXTENSIONS.difference({".png"})


_QUERIERS_FMT: dict[str, list[str]] = {
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

_WIKI_HEADERS = {
    "Api-User-Agent": f"Coptic/1.0 ({paths.URL})",
    "User-Agent": f"Coptic/1.0 ({paths.URL})",
}

_argparser = argparse.ArgumentParser(
    description="Find and process images for the dictionary words.",
)

_ = _argparser.add_argument(
    "-s",
    "--start",
    type=int,
    default=0,
    help="Skips keys lower than this value.",
)

_ = _argparser.add_argument(
    "-e",
    "--end",
    type=int,
    default=1000000000,
    help="Terminate after reaching this key.",
)

_ = _argparser.add_argument(
    "-x",
    "--exclude",
    type=str,
    nargs="*",
    default=[],
    help="A list of types to exclude.",
)

_ = _argparser.add_argument(
    "-d",
    "--downloads",
    type=str,
    default=os.path.join(os.path.expanduser("~"), "Desktop/"),
    help="Path to the downloads directory.",
)

_ = _argparser.add_argument(
    "-i",
    "--ignore",
    type=str,
    nargs="*",
    default=[".DS_Store", ".localized"],
    help="List of files in the downloads directory to ignore.",
)

_ = _argparser.add_argument(
    "-k",
    "--skip_existing",
    action="store_true",
    default=False,
    help="If true, skip word with existing images."
    " If --batch is given, this flag has a different interpretation."
    " It means don't convert already converted files."
    "You should only use this"
    f" flag if there are no obsolete images in {_IMG_300_DIR}/."
    " Images can be obsolete if, for example, an image was modified"
    f" in {_IMG_DIR}/, and the generated version of the old image is"
    f" still present in ${_IMG_300_DIR}/."
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

_ = _argparser.add_argument(
    "-r",
    "--rm",
    type=str,
    default=[],
    nargs="*",
    help="If given, delete the artifacts for the given stem(s), and exit.",
)

_ = _argparser.add_argument(
    "-z",
    "--mv",
    type=str,
    default=[],
    nargs="*",
    help="If given, rename the artifacts for the given stem, and exit. Exactly"
    " two arguments must be given, the source and destination stems.",
)

_ = _argparser.add_argument(
    "-c",
    "--cp",
    type=str,
    default=[],
    nargs="*",
    help="If given, copy the artifacts for the given stem, and exit. Exactly"
    " two arguments must be given, the source and destination stems.",
)

_ = _argparser.add_argument(
    "-n",
    "--convert",
    type=str,
    default=[],
    nargs="*",
    help="If given, (re)convert the image(s) with the given stem, and exit.",
)

_ = _argparser.add_argument(
    "-v",
    "--validate",
    default=False,
    action="store_true",
    help="If true, just validate the directories and exit.",
)

_ = _argparser.add_argument(
    "-b",
    "--batch",
    default=False,
    action="store_true",
    help=f"If true, batch-process images in {_IMG_DIR} and exit."
    "Batch-processing includes converting images, and deleting obsolete images"
    " and sources."
    " NOTE: We intentionally refrain from populating absent sources with a"
    " default value, since now we have become stricter with collecting image"
    " sources.",
)

_ = _argparser.add_argument(
    "-p",
    "--plot",
    default=False,
    action="store_true",
    help="If given, plot a YES or NO for whether each included picture has an"
    " image.",
)


def _get_max_idx(g: list[str], key: str, sense: str) -> int:
    highest = 0
    for path in g:
        match: re.Match[str] | None = _FILE_NAME_RE.fullmatch(
            os.path.basename(path),
        )
        assert match
        assert match.group(1) == key
        if match.group(2) != sense:
            continue
        highest = max(highest, int(match.group(3)))
    return highest


# TODO: (#0) This helper doesn't belong here.
def _os_open(*args: str):
    if not args:
        return
    _ = subprocess.run(["open"] + list(args), check=True)


def _get_downloads(args: argparse.Namespace) -> list[str]:
    files: list[str] = os.listdir(args.downloads)
    files = [f for f in files if f not in args.ignore]
    files = [os.path.join(args.downloads, f) for f in files]
    files = [f for f in files if os.path.isfile(f)]
    return files


def _invalid_size(files: list[str]) -> abc.Generator[str]:
    assert _MIN_WIDTH > 0
    for f in files:
        image = Image.open(f)  # type: ignore[attr-defined]
        width, height = image.size
        if width < _MIN_WIDTH:
            log.warn(
                f,
                "has a width of",
                width,
                "; the valid range is",
                _MIN_WIDTH,
                "-",
            )
            yield f
            continue
        if width < _PREFER_MIN_WIDTH:
            log.warn(
                f,
                "has a width of",
                width,
                "; this is allowed but discouraged, consider fetching an"
                " image with a minimum width of",
                _PREFER_MIN_WIDTH,
            )
        height = int(height * 300 / width)
        if height < _MIN_RESIZE_HEIGHT or height > _MAX_RESIZE_HEIGHT:
            log.warn(
                f,
                "will have a resized height of",
                height,
                "; the valid range is",
                _MIN_RESIZE_HEIGHT,
                "-",
                _MAX_RESIZE_HEIGHT,
            )
            yield f
            continue
        if (
            height < _PREFER_MIN_RESIZE_HEIGHT
            or height > _PREFER_MAX_RESIZE_HEIGHT
        ):
            log.warn(
                f,
                "will have a resized height of",
                height,
                "; this is allowed, but the preferred range is",
                _PREFER_MIN_RESIZE_HEIGHT,
                "-",
                _PREFER_MAX_RESIZE_HEIGHT,
                "; we prefer images with close-to-square dimensions.",
            )


def _is_wiki(url: str) -> bool:
    return url.startswith("https://upload.wikimedia.org/")


def _get_target(path: str) -> str:
    assert path.startswith(_IMG_DIR)
    stem, ext = file.splitext(path)
    assert _STEM_RE.fullmatch(stem)
    ensure.ensure(ext in _VALID_EXTENSIONS, ext, "is not a valid extension")
    return os.path.join(_IMG_300_DIR, stem + _EXT_MAP.get(ext, ext))


def _get_source(path: str) -> str:
    assert path.startswith(_IMG_DIR)
    return os.path.join(_SOURCES_DIR, file.stem(path) + ".txt")


def _convert(path: str, skip_existing: bool = False) -> None:
    assert path.startswith(_IMG_DIR)
    target = _get_target(path)
    if os.path.exists(target) and skip_existing:
        return
    # Write the converted image.
    _ = subprocess.call(
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
            f"{_TARGET_WIDTH}x",
            target,
        ],
    )
    log.wrote(target)


def main():
    args = _argparser.parse_args()
    # Preprocess arguments.
    actions: list[object] = list(
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
    ensure.ensure(
        len(actions) <= 1,
        "Up to one action argument can be given at a time.",
    )
    del actions

    if args.validate:
        validate()
        exit()
    if args.batch:
        _batch(args)
        exit()
    if args.rm:
        for stem in args.rm:
            _rm(stem)
        exit()
    if args.mv:
        _mv(*args.mv)
        exit()
    if args.cp:
        _cp(*args.cp)
        exit()
    if args.convert:
        for stem in args.convert:
            _convert(_stem_to_img_path(stem))
        exit()
    _Prompter(args).prompt()


def _basename(url: str) -> str:
    filename = os.path.basename(url)
    idx = filename.find("?")
    if idx != -1:
        filename = filename[:idx]
    return filename


def _retrieve(
    args: argparse.Namespace,
    url: str,
    filename: str | None = None,
) -> str:
    headers = {}
    if _is_wiki(url):
        headers = _WIKI_HEADERS
    filename = filename or _basename(url)
    download = requests.get(url, headers=headers, timeout=_TIMEOUT_S)
    ensure.ensure(download.ok, download.text)
    filename = os.path.join(args.downloads, filename)
    with open(filename, "wb") as f:
        _ = f.write(download.content)
        log.wrote(filename)
    return filename


def _stem_to_img_path(stem: str, ext: str = "") -> str:
    if ext:
        return os.path.join(_IMG_DIR, stem + ext)
    path = glob.glob(os.path.join(_IMG_DIR, stem + ".*"))
    assert len(path) == 1
    return path[0]


def _get_artifacts(stem: str, img_ext: str = "") -> list[str]:
    assert _STEM_RE.fullmatch(stem)
    path = _stem_to_img_path(stem, img_ext)
    return [path, _get_target(path), _get_source(path)]


def _rm(stem: str) -> None:
    ensure.ensure(_exists(stem), stem, "doesn't exist!")
    for art in _get_artifacts(stem):
        os.remove(art)


def _exists(stem: str) -> bool:
    return bool(glob.glob(os.path.join(_IMG_DIR, stem + ".*")))


def _mv(a_stem: str, b_stem: str) -> None:
    ensure.ensure(not _exists(b_stem), b_stem, "already exists!")
    a_arts = _get_artifacts(a_stem)
    img_ext = file.ext(a_arts[0])
    b_arts = _get_artifacts(b_stem, img_ext)
    for a, b in zip(a_arts, b_arts):
        _ = pathlib.Path(a).rename(b)


def _cp(a_stem: str, b_stem: str) -> None:
    ensure.ensure(not _exists(b_stem), b_stem, "already exists!")
    a_arts = _get_artifacts(a_stem)
    img_ext = file.ext(a_arts[0])
    b_arts = _get_artifacts(b_stem, img_ext)
    for a, b in zip(a_arts, b_arts):
        _ = shutil.copyfile(a, b)


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


def _is_image_url(url: str) -> bool:
    return any(_basename(url).endswith(ext) for ext in _IMAGE_EXTENSIONS)


def _is_invalid_url(url: str) -> list[str]:
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
    if top_level_domain in _BANNED_TOP_LEVEL_DOMAINS:
        return ["Banned domain:", top_level_domain]
    return []


def _infer_urls(*urls: str) -> tuple[list[str], list[str]]:
    reference: list[str] = []
    download: list[str] = []
    for url in urls:
        err = _is_invalid_url(url)
        ensure.ensure(not err, *err)
    for url in urls:
        (reference, download)[_is_image_url(url)].append(url)
    while not reference or not download:
        log.warn(
            "We encourage you to provide both reference and download URLs.",
        )
        extras = text.ssplit(input("URLs: (s to skip)").lower())
        if extras == ["s"]:
            break
        valid = True
        for ext in extras:
            err = _is_invalid_url(ext)
            if err:
                log.error(*err)
                valid = False
                break
        if not valid:
            continue
        reference.clear()
        download.clear()
        for url in list(urls) + extras:
            (reference, download)[_is_image_url(url)].append(url)
    return reference, download


def _existing(key: str) -> list[str]:
    assert key.isdigit()
    return glob.glob(os.path.join(_IMG_DIR, f"{key}-*"))


def _clear(key: str) -> None:
    ensure.ensure(key.isdigit(), key, "is not a valid word key.")
    for path in _existing(key):
        stem = file.stem(path)
        _rm(stem)
        log.info("cleared", stem)


class _Prompter:
    """Prompt user for commands."""

    def __init__(self, args: argparse.Namespace):
        self.args: argparse.Namespace = args
        self.plot_yes: int = 0
        self.plot_no: int = 0

        self.sources: dict[str, list[str]] = {}

        self.exclude: dict[str, str] = {}
        for e in args.exclude:
            k, v = e.split(":")
            assert k
            assert k not in self.exclude
            self.exclude[k] = v

        self.row: crum.Root

    def print_info(self):
        print()
        log.info("Data:")
        log.info("- Key:", self.row.key)
        log.info("- Link:", paths.crum_url(self.row.key))
        log.info("- Existing:")
        _pretty(_existing(self.row.key))
        log.info("- Downloads:")
        _pretty(_get_downloads(self.args))
        log.info("- Senses:")
        _pretty(
            {
                str(k): v
                for k, v in crum.Crum.roots[self.row.key].senses.items()
            },
        )
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
        for key in sorted(crum.Crum.roots.keys(), key=int):
            self.row = crum.Crum.roots[key]
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
        if int(self.row.key) < self.args.start:
            return True
        if int(self.row.key) > self.args.end:
            return False
        if any(self.row.row[k] == v for k, v in self.exclude.items()):
            return True
        if self.args.skip_existing and _existing(self.row.key):
            return True

        if self.args.plot:
            if int(self.row.key) < int(self.args.start):
                return True
            if int(self.row.key) > int(self.args.end):
                return False
            if _existing(self.row.key):
                self.plot_yes += 1
                message = colorama.Fore.GREEN + "YES"
            else:
                self.plot_no += 1
                message = colorama.Fore.RED + "NO"
            print(self.row.key, message + colorama.Fore.RESET)
            return True

        _os_open(*_existing(self.row.key), paths.crum_url(self.row.key))

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

        command: str = input().strip()
        if not command:
            return True
        split: list[str] = command.split()
        command, params = split[0].lower(), split[1:]
        del split

        if command == "s":
            # S for skip!
            files = _get_downloads(self.args)
            ensure.ensure(
                not files,
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
                self.row = crum.Crum.roots[key]
                _os_open(*_existing(key), paths.crum_url(key))
            return True

        if command == "convert":
            for stem in params:
                _convert(_stem_to_img_path(stem))
            return True

        if command == "source":
            files = [p for p in params if not p.startswith("http")] or [
                f for f in _get_downloads(self.args) if f not in self.sources
            ]
            ensure.ensure(
                len(files) == 1,
                "We can only assign sources to 1 file, got:",
                files,
            )
            params = [p for p in params if p.startswith("http")]
            ensure.ensure(params, "No source given!")
            self.sources[files[0]] = sum(_infer_urls(*params), [])
            return True

        if command in _QUERIERS_FMT:
            query = " ".join(params)
            for fmt in _QUERIERS_FMT[command]:
                _os_open(fmt.format(query=query))
            return True

        if command == "rm":
            _rm(*params)
            return True

        if command == "cp":
            _cp(*params)
            return True

        if command == "mv":
            _mv(*params)
            return True

        if command == "clear":
            if params:
                for p in params:
                    _clear(p)
            else:
                _clear(self.row.key)
            return True

        if command.startswith("http"):
            reference, download = _infer_urls(command, *params)
            for url in download:
                path = _retrieve(self.args, url)
                if not path:
                    continue
                self.sources[path] = reference + [url]
            return True

        ensure.ensure(command.isdigit(), "can't make sense of", command)
        sense: int = int(command)
        ensure.ensure(sense >= 1, "sense must be a positive integer")

        files = _get_downloads(self.args)

        # Force valid extension.
        ensure.members(
            map(file.ext, files),
            _VALID_EXTENSIONS,
            "Invalid file extensions! Remove the images, or add the"
            + " extensions to the list if you're sure your script can"
            + " process them.",
        )

        # Force size.
        invalid = list(_invalid_size(files))
        ensure.ensure(not invalid, "Images have an invalid size:", invalid)
        del invalid

        # Force sources.
        ensure.members(files, self.sources, "some sources are missing")

        # If there are no files, we assume that the user doesn't want to
        # add pictures for this word. (Unless they typed a sense, in which
        # case it would be weird!)
        ensure.ensure(
            files,
            "You typed a sense, but there are no pictures! This"
            " doesn't make sense!",
        )

        # Verify the images.
        i = ""
        move = False
        while True:
            _os_open(*files)
            i = input("Looks good? (y/n)").lower()
            files = _get_downloads(self.args)
            if i in ["y", "yes"]:
                move = True
                break
            if i in ["n", "no"]:
                move = False
                break

        if not move:
            return True

        # Move the files.
        idx = _get_max_idx(_existing(self.row.key), self.row.key, str(sense))
        for f in files:
            idx += 1
            ext = file.ext(f)
            new_file = os.path.join(
                _IMG_DIR,
                f"{self.row.key}-{sense}-{idx}{ext}",
            )
            _ = pathlib.Path(f).rename(new_file)
            _convert(new_file)
            file.write("\n".join(self.sources[f]), _get_source(new_file))

        return True


def _batch(args: argparse.Namespace):
    def key(path: str):
        return int(file.stem(path).split("-")[0])

    images = file.paths(_IMG_DIR)
    images = sorted(images, key=key)
    for path in images:
        _convert(path, args.skip_existing)
    targets = {_get_target(p) for p in images}
    for converted in file.paths(_IMG_300_DIR):
        if converted not in targets:
            os.remove(converted)
    sources = {_get_source(path) for path in images}
    for src in file.paths(_SOURCES_DIR):
        if src not in sources:
            os.remove(src)


def _listdir_sorted(directory: str) -> list[str]:
    return semver.sort_semver(file.paths(directory))


# TODO: (#399) Perform validation during image retrieval as part of the Crum
# interface in `main.py`.
def validate():
    images = _listdir_sorted(_IMG_DIR)
    converted_images = _listdir_sorted(_IMG_300_DIR)
    sources = _listdir_sorted(_SOURCES_DIR)

    ensure.unique(file.stems(images), "images:")
    ensure.unique(file.stems(converted_images), "converted images:")
    ensure.unique(file.stems(sources), "sources:")

    # Checking that extensions are valid.
    ensure.members(
        file.exts(images),
        _VALID_EXTENSIONS,
        "Images: Unknown extension:",
    )
    ensure.members(
        file.exts(converted_images),
        _VALID_EXTENSIONS_300,
        "Converted Images: Unknown extension:",
    )
    ensure.members(file.exts(sources), {".txt"}, "Sources: Unknown extension:")

    # Verify that all three directories have the same set of IDs.
    ensure.equal_sets(
        file.stems(images),
        file.stems(converted_images),
        "Images and converted images:",
    )
    ensure.equal_sets(
        file.stems(images),
        file.stems(sources),
        "Images and sources:",
    )

    # Check that all images have valid IDs.
    for stem in file.stems(images):
        ensure.ensure(_STEM_RE.fullmatch(stem), "invalid stem:", stem)

    # Validate content of the source files.
    for path in sources:
        content: str = file.read(path)
        if not content:
            # TODO: (#258) Ban empty sources.
            continue
        lines: list[str] = content.splitlines()
        del content
        ensure.ensure(
            lines,
            "Source file is not empty, but has empty lines:",
            path,
        )
        for line in lines:
            if line.startswith("http"):
                continue
            # TODO: (#258) Stop using city names. Always have a URL.
            if _NAME_RE.fullmatch(line):
                continue
            log.fatal(
                "Can't make sense of this source:",
                line,
                "in file",
                path,
            )


if __name__ == "__main__":
    main()
