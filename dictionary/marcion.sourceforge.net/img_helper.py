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
IMG_DIR = "dictionary/marcion.sourceforge.net/data/img"
IMG_300_DIR = "dictionary/marcion.sourceforge.net/data/img-300"

FILE_NAME_RE = re.compile(r"(\d+)-(\d+)-(\d+)\.[^\d]+")
STEM_RE = re.compile("[0-9]+-[0-9]+-[0-9]+")


INPUT_TSVS: str = "dictionary/marcion.sourceforge.net/data/output/tsvs/roots.tsvs"
MEANING_COL: str = "en-parsed-no-greek"
KEY_COL: str = "key"
LINK_COL: str = "key-link"
SOURCES_DIR: str = "dictionary/marcion.sourceforge.net/data/img-sources/"

# NOTE: SVG conversion is nondeterministic, which is badly disruptive to our
# pipelines, so we ban it.
# PNG conversion is deterministic as long as it's converted to JPG, so we
# accept it but convert it.
EXT_MAP = {
    ".png": ".jpg",
}
VALID_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".JPG", ".png", ".webp"}
VALID_EXTENSIONS_300 = {".avif", ".gif", ".jpeg", ".jpg", ".JPG", ".webp"}


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def params_str(params: dict) -> str:
    return "?" + "&".join(f"{k}={v}" for k, v in params.items())


# TODO: Download a higher-quality image instead of just the thumbnail.
URL = "https://api.thenounproject.com/v2"
SEARCH_PARAMS = {
    "query": "{query}",
    "include_svg": 0,
    "thumbnail_size": 200,
    "limit": 10,
}
ICON_SEARCH_FMT = URL + "/icon" + params_str(SEARCH_PARAMS)

WIKI_HEADERS = {
    "Api-User-Agent": "Coptic/1.0 (https://metremnqymi.com; pishoybg@gmail.com)",
    "User-Agent": "Coptic/1.0 (https://metremnqymi.com; pishoybg@gmail.com)",
}

argparser = argparse.ArgumentParser(
    description="""Find and process images for the dictionary words."""
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
    " N.B. We intentionally refrain from populating absent sources with a"
    " default value, since now we have become stricter with collecting image"
    " sources.",
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
def invalid_size(files: list[str]) -> list[str]:
    if MIN_WIDTH == -1:
        return []
    assert MIN_WIDTH > 0
    invalid = []
    for f in files:
        image = PIL.Image.open(f)
        width, _ = image.size
        if width < MIN_WIDTH:
            invalid.append(f)
    return invalid


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def is_wiki(url: str) -> bool:
    return url.startswith("https://upload.wikimedia.org/")


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def get_target(path: str) -> str:
    assert path.startswith(IMG_DIR)
    stem, ext = utils.splitext(path)
    assert STEM_RE.fullmatch(stem)
    assert ext in VALID_EXTENSIONS
    return os.path.join(IMG_300_DIR, stem + EXT_MAP.get(ext, ext))


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def get_source(path: str) -> str:
    assert path.startswith(IMG_DIR)
    return os.path.join(SOURCES_DIR, utils.stem(path) + ".txt")


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
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
        ]
    )
    utils.wrote(target)


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def main():
    global args
    args = argparser.parse_args()
    if args.validate:
        validate()
        exit()
    if args.batch:
        batch()
        exit()
    prompt()


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def retrieve(
    url: str, filename: typing.Optional[str] = None, headers: dict[str, str] = {}
) -> str:
    if filename is None:
        filename = os.path.basename(url)
        idx = filename.find("?")
        if idx != -1:
            filename = filename[:idx]
    download = requests.get(url, headers=headers)
    if not download.ok:
        utils.error(download.text)
        return ""
    filename = os.path.join(args.downloads, filename)
    with open(filename, "wb") as f:
        f.write(download.content)
        utils.wrote(filename)
    return filename


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def prompt():

    df = utils.read_tsvs(INPUT_TSVS)
    df.sort_values(by=KEY_COL, inplace=True)

    sources: dict[str, str] = {}

    exclude = {}
    for e in args.exclude:
        k, v = e.split(":")
        assert k
        assert k not in exclude
        exclude[k] = v

    key_to_row = {row[KEY_COL]: row for _, row in df.iterrows()}
    for _, row in df.iterrows():
        key = row[KEY_COL]
        key = int(key)
        if key < args.start_at_key:
            continue
        if any(row[k] == v for k, v in exclude.items()):
            continue

        @type_enforced.Enforcer(enabled=enforcer.ENABLED)
        def existing() -> list[str]:
            return glob.glob(os.path.join(IMG_DIR, f"{key}-*"))

        g = existing()
        if args.skip_existing and g:
            continue

        open_images(g)
        subprocess.run(
            [
                "open",
                "-a",
                args.browser,
                str(row[LINK_COL]),
                query(utils.html_text(str(row[MEANING_COL]))),
            ]
        )

        assign_source_re = re.compile(r"^source\(([^=]+)\)=(.+)$")
        while True:
            # Force read a valid sense, or no sense at all.
            g = existing()
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
                        "- 'noun/${QUERY}' to query `thenounproject`,",
                        "- 'wiki/${PAGE}' to open a Wikipedia page,",
                        "- 'key=${KEY}' to change the key",
                        "- 'del=${KEY}' to delete one image and its artifacts",
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

            if sense.startswith("key="):
                key = sense[4:]
                row = key_to_row[key]
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
                sense = sense[7:]
                if not sense:
                    utils.error("No source given!")
                    continue
                sources[files[0]] = sense
                continue

            if sense.startswith("del="):
                sense = sense[4:]
                if not STEM_RE.fullmatch(sense):
                    utils.error(
                        "To delete an image, please provide the stem.",
                    )
                    continue
                # Delete the image.
                path = glob.glob(os.path.join(IMG_DIR, sense + "*"))
                assert len(path) == 1
                path = path[0]

                os.remove(path)
                os.remove(get_source(path))
                os.remove(get_target(path))
                continue

            source_search = assign_source_re.search(sense)
            if source_search:
                sources[source_search.group(1)] = source_search.group(2)
                continue
            del source_search

            if sense.startswith("http"):
                url = sense
                headers: dict[str, str] = {}
                if is_wiki(url):
                    headers = WIKI_HEADERS
                path = retrieve(url, headers=headers)
                if not path:
                    continue
                sources[path] = sense
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
                    path = retrieve(icon["thumbnail_url"])
                    if not path:
                        continue
                    sources[path] = icon["thumbnail_url"]
                open_images(get_downloads())
                continue

            if not sense.isdigit():
                utils.error("Can't make sense of", sense)
                continue

            sense = int(sense)
            if sense <= 0:
                utils.error("Sense must be a positive integer, got:", sense)
                continue

            files = get_downloads()

            # Force valid extension.
            invalid = [e for e in map(utils.ext, files) if e not in VALID_EXTENSIONS]
            if invalid:
                utils.error(
                    "Invalid extensions:",
                    invalid,
                    "Add them to the list if you're sure your script can process them.",
                )
                continue

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
                ext = utils.ext(file)
                new_file = os.path.join(IMG_DIR, f"{key}-{sense}-{idx}{ext}")
                pathlib.Path(file).rename(new_file)
                convert(new_file)
                utils.write(sources[file], get_source(new_file))


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def batch():
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


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def listdir_sorted(dir: str) -> list[str]:
    return utils.sort_semver(utils.paths(dir))


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def validate():
    images = listdir_sorted(IMG_DIR)
    converted_images = listdir_sorted(IMG_300_DIR)
    sources = listdir_sorted(SOURCES_DIR)

    utils.verify_unique(utils.stems(images), "images:")
    utils.verify_unique(utils.stems(converted_images), "converted images:")
    utils.verify_unique(utils.stems(sources), "sources:")

    # Checking that extensions are valid.
    utils.verify_all_belong_to_set(
        utils.exts(images), VALID_EXTENSIONS, "Images: Unknown extension:"
    )
    utils.verify_all_belong_to_set(
        utils.exts(converted_images),
        VALID_EXTENSIONS_300,
        "Converted Images: Unknown extension:",
    )
    utils.verify_all_belong_to_set(
        utils.exts(sources), {".txt"}, "Sources: Unknown extension:"
    )

    # Verify that all three directories have the same set of IDs.
    utils.verify_equal_sets(
        utils.stems(images),
        utils.stems(converted_images),
        "Images and converted images:",
    )
    utils.verify_equal_sets(
        utils.stems(images), utils.stems(sources), "Images and sources:"
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
        utils.fatal("Artifacts may be obsolete:", offending)


if __name__ == "__main__":
    main()
