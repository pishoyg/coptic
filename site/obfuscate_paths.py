import argparse
import os
import random
import re
import shutil
import string

import type_enforced

import utils

SRC_RE = re.compile(r'(href|src)=\s*"([^"]+)"')
TYPE_ENFORCED = True
argparser = argparse.ArgumentParser(
    description="Parse and process the Marcion digital Coptic database,"
    "which is in turn based on the Crum Coptic dictionary."
)
argparser.add_argument(
    "--dir",
    type=str,
    required=True,
    help="Path to the directory to obfuscate.",
)


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def _random_basename():
    return "".join(random.choice(string.ascii_lowercase) for _ in range(24))


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
def _chop(text: str, regex: re.Pattern) -> tuple[str, str, str]:
    s = regex.search(text)
    if not s:
        return text, "", ""
    i, j = s.span()
    return text[:i], text[i:j], text[j:]


@type_enforced.Enforcer(enabled=TYPE_ENFORCED)
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

    def transform(html: str) -> str:
        before, src, after = _chop(html, SRC_RE)
        if not src or not after:
            assert not src and not after
            assert before == html
            return before
        match = SRC_RE.match(src)
        assert match
        original = match.group(2)
        if (
            original.startswith("http")
            or original.startswith("mailto:")
            or original.startswith("#")
            or os.path.dirname(original)
        ):
            return before + src + transform(after)
        return before + f'{match.group(1)}="{map[original]}"' + transform(after)

    for path in paths:
        if utils.ext(path) != ".html":
            continue
        html = utils.read(path)
        utils.write(transform(html), path, log=False, fix_newline=False)


def main():
    obfuscate_paths(argparser.parse_args().dir)


if __name__ == "__main__":
    main()
