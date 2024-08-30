"""Obsucate HTML.

NOTE: The original source of this file is:
- https://pypi.org/project/html-classes-obfuscator/
- https://github.com/xandermann/html-classes-obfuscator
We expect to change it radically.
"""

import argparse
import random
import re
import string

import utils

argparser = argparse.ArgumentParser(
    description="Obfuscate HTML, CSS, and JavaScript Files.",
)

argparser.add_argument(
    "--dir",
    type=str,
    help="Path to the directory containing all files."
    " If given, will obfuscate the files in this directory based on extension."
    " If given, --html, --css, and --js, must remain unused.",
)

HTML_CLASS_RE = re.compile(
    r"class=\s*[\"\']?((?:.(?![\"\']?\s+(?:\S+)=|\s*\/?[>\"\']))+.)[\"\']?",
)

JS_CLASS_RE = re.compile(r"const (CLS_[a-zA-Z_]+) = '([a-zA-Z-]+)';")


def _random_class() -> str:
    return "".join(random.choice(string.ascii_lowercase) for _ in range(24))


def _gather_classes(files: list[str]) -> set[str]:
    """Given a list of file paths, return a list of all classes that occur in
    them."""
    # TODO: (#141) Currently, we only look for classes in the HTML and JS
    # files. This is OK. If a class only occurs in CSS, but never in JavaScript
    # or HTML, then it's definitely unused.
    # Nevertheless, for consistency, we should search for classes in CSS as
    # well. It might turn out to be useful at some point in the future.

    classes: set[str] = set()
    # Gather classes from HTML files.
    for f in [f for f in files if f.endswith(".html")]:
        content = utils.read(f)
        for occurrence in HTML_CLASS_RE.findall(content):
            classes.update(occurrence.split())
    # Gather classes from JavaScript files.
    for f in [f for f in files if f.endswith(".js")]:
        content = utils.read(f)
        classes.update(
            match.group(2) for match in JS_CLASS_RE.finditer(content)
        )

    return classes


def _generate_html(
    html_content: str,
    mapping: dict[str, str],
) -> str:
    """Generate the obfuscated HTML.

    Args:
        html_content (str): HTML content before obfuscation.
        mapping (dict): _description_.

    Returns:
        str: Obfuscated HTML
    """

    def replace(match: re.Match) -> str:
        new_class = " ".join(
            map(
                lambda c: mapping[c],
                match.group(1).split(),
            ),
        )
        return f'class="{new_class}"'

    return HTML_CLASS_RE.sub(replace, html_content)


def _generate_css(css_content: str, mapping: dict[str, str]) -> str:
    """Generate the obfuscated CSS.

    Args:
        css_content (str): CSS before obfuscation.
        mapping (Dict): Dictionary of new class names.

    Returns:
        str: Obfuscated CSS
    """

    # We sort by the key length ; to first replace long classes names and
    # after short one ".navbar-brand", and then ".navbar" avoid
    # "RENAMED_CLASS-brand" and "RENAMED_CLASS" bug
    for old_class_name in sorted(mapping, key=len, reverse=True):
        new_class_name = mapping[old_class_name]

        # CSS classes modifications
        # Example: a class like "lg:1/4" should be "lg\:1\/4" in CSS
        list_char_to_escape = {
            "!",
            '"',
            "#",
            "$",
            "&",
            "'",
            "(",
            ")",
            "*",
            "+",
            ".",
            "/",
            ":",
            ";",
            "<",
            "=",
            ">",
            "?",
            "@",
            "[",
            "]",
            "^",
            "`",
            "{",
            "|",
            "}",
            "~",
            "%",
        }

        # No need to escape "-"
        for char in list_char_to_escape:
            old_class_name = old_class_name.replace(char, "\\" + char)

        # Tailwind's way to escape "," :
        old_class_name = old_class_name.replace(",", "\\2c ")

        css_content = css_content.replace(
            "." + old_class_name,
            "." + new_class_name,
        )
    return css_content


def _generate_js(js_content: str, mapping: dict) -> str:
    """Generate the obfuscated JS.

    Args:
        js_content (str): JS before obfuscation.
        equivalent_class (Dict): Dictionary of new class names.

    Returns:
        str: Obfuscated JS
    """

    def replace(match: re.Match) -> str:
        old_class = match.group(2)
        return (
            f"const {match.group(1)} = '{mapping.get(old_class, old_class)}';"
        )

    return JS_CLASS_RE.sub(replace, js_content)


def obfuscate(files: list[str]):
    """
    Args:
        html_files (list): HTML files path.
        css_files (list): CSS files path.
        js_files (list): JS files path.
    """

    # TODO: (#141) This only collects classes from HTML files, maps them,
    # then rewrites everything. Some classes live in CSS and JavaScript, but
    # not in the HTML. Modify the pipeline to account for those.
    mapping = {cls: _random_class() for cls in _gather_classes(files)}

    for path in [f for f in files if f.endswith(".html")]:
        utils.write(_generate_html(utils.read(path), mapping), path)

    for path in [f for f in files if f.endswith(".css")]:
        utils.write(_generate_css(utils.read(path), mapping), path)

    for path in [f for f in files if f.endswith(".js")]:
        utils.write(_generate_js(utils.read(path), mapping), path)


def main() -> None:
    args = argparser.parse_args()

    paths = utils.paths(args.dir)
    obfuscate(paths)


if __name__ == "__main__":
    main()
