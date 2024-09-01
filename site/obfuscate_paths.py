import argparse
import os
import random
import re
import shutil
import string

import utils

SRC_RE = re.compile(r'(href|src)=\s*"([^"]+)"')
argparser = argparse.ArgumentParser(
    description="Parse and process the Marcion digital Coptic database,"
    "which is in turn based on the Crum Coptic dictionary.",
)
argparser.add_argument(
    "--dir",
    type=str,
    required=True,
    help="Path to the directory to obfuscate.",
)


def _random_basename():
    return "".join(random.choice(string.ascii_lowercase) for _ in range(24))


def obfuscate_paths(dir: str) -> None:
    map: dict[str, str] = {}
    paths = utils.paths(dir)
    for path in paths:
        ext = utils.ext(path)
        if ext == ".html":
            continue
        new_basename = _random_basename() + ext
        map[os.path.basename(path)] = new_basename
        shutil.move(path, os.path.join(dir, new_basename))

    for path in paths:
        if utils.ext(path) != ".html":
            continue
        html = utils.read(path)

        def replacer(match: re.Match):
            original = match.group(2)
            if (
                original.startswith("http")
                or original.startswith("mailto:")
                or original.startswith("#")
                or os.path.dirname(original)
            ):
                return match.group(0)
            return f'{match.group(1)}="{map[original]}"'

        utils.write(
            SRC_RE.sub(replacer, html),
            path,
            log=False,
            fix_newline=False,
        )


def main():
    obfuscate_paths(argparser.parse_args().dir)


if __name__ == "__main__":
    main()
