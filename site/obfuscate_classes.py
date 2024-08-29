"""Obsucate HTML.

NOTE: The original source of this file is:
- https://pypi.org/project/html-classes-obfuscator/
- https://github.com/xandermann/html-classes-obfuscator
We expect to change it radically.
"""

# TODO: (#141) Adapt for your own use.

import argparse
import glob
import random
import re
import string

import utils

argparser = argparse.ArgumentParser(
    description="Obfuscate HTML, CSS, and JavaScript Files.",
)

argparser.add_argument(
    "--html",
    type=str,
    help="Glob pattern for HTML files.",
)

argparser.add_argument(
    "--css",
    type=str,
    help="Glob pattern for CSS files.",
)

argparser.add_argument(
    "--js",
    type=str,
    help="Glob pattern for JavaScript files.",
)


def _random_class() -> str:
    return "".join(random.choice(string.ascii_lowercase) for _ in range(24))


def _parse_html_class_names(
    old_html: str,
    equivalents_obfuscated_html_classes: dict[str, str],
) -> tuple[list, list, dict]:
    """Parse HTML class names.

    Args:
        old_html (string): HTML we want to parse
        equivalents_obfuscated_html_classes (Dict):
            Dict<HTMLClasses, ObfuscatedHTMLClasses>

    Returns:
        Tuple: _description_
    """

    # Regex to fetch HTML classes in the file
    html_class_regex = (
        r"class=[\"\']?((?:.(?![\"\']?\s+(?:\S+)=|\s*\/?[>\"\']))+.)[\"\']?"
    )

    # classes_groups can be ['navbar p-5', 'navbar-brand', 'navbar-item',
    # 'title is-4']
    classes_groups = re.findall(html_class_regex, old_html)
    obfuscate_classes_groups = []

    for i, classes in enumerate(classes_groups):
        div_of_classes = classes.split()
        obfuscate_classes_groups.append([])

        for old_class_name in div_of_classes:
            if old_class_name not in equivalents_obfuscated_html_classes:
                equivalents_obfuscated_html_classes[old_class_name] = (
                    _random_class()
                )

            obfuscate_classes_groups[i].append(
                equivalents_obfuscated_html_classes[old_class_name],
            )

    for i, classes in enumerate(obfuscate_classes_groups):
        obfuscate_classes_groups[i] = " ".join(classes)

    return (
        classes_groups,
        obfuscate_classes_groups,
        equivalents_obfuscated_html_classes,
    )


def _generate_html(
    html_content: str,
    classes_groups: list[str],
    obfuscate_classes_groups: list[str],
) -> str:
    """Generate the obfuscated HTML.

    Args:
        html_content (str): HTML content before obfuscation.
        classes_groups (dict): Class groups, like
            `["navbar", "btn btn-primary"]`
        obfuscate_classes_groups (dict): _description_.

    Returns:
        str: Obfuscated HTML
    """

    for i, classes_group in enumerate(classes_groups):
        html_content = html_content.replace(
            f'class="{classes_group}"',
            f'class="{obfuscate_classes_groups[i]}"',
        )

    return html_content


def _generate_css(css_content: str, equivalent_class: dict) -> str:
    """Generate the obfuscated CSS.

    Args:
        css_content (str): CSS before obfuscation.
        equivalent_class (Dict): Dictionary of new class names.

    Returns:
        str: Obfuscated CSS
    """

    # We sort by the key length ; to first replace long classes names and
    # after short one ".navbar-brand", and then ".navbar" avoid
    # "RENAMED_CLASS-brand" and "RENAMED_CLASS" bug
    for old_class_name in sorted(equivalent_class, key=len, reverse=True):
        new_class_name = equivalent_class[old_class_name]

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


def _generate_js(js_content: str, equivalent_class: dict) -> str:
    """Generate the obfuscated JS.

    Args:
        js_content (str): JS before obfuscation.
        equivalent_class (Dict): Dictionary of new class names.

    Returns:
        str: Obfuscated JS
    """

    # We sort by the key length; to first replace long classes names and after
    # short ones. For example, ".navbar-brand", and then ".navbar", to avoid
    # "RENAMED_CLASS-brand" and "RENAMED_CLASS" bug.
    for old_class_name in sorted(equivalent_class, key=len, reverse=True):
        new_class_name = equivalent_class[old_class_name]

        # JS modifications
        js_content = js_content.replace(
            '.querySelector(".' + old_class_name + '")',
            '.querySelector(".' + new_class_name + '")',
        )
        js_content = js_content.replace(
            '.querySelectorAll(".' + old_class_name + '")',
            '.querySelectorAll(".' + new_class_name + '")',
        )
        js_content = js_content.replace(
            '.classList.toggle("' + old_class_name + '")',
            '.classList.toggle("' + new_class_name + '")',
        )

    return js_content


def obfuscate(htmlfiles: list[str], cssfiles: list[str], jsfiles: list[str]):
    """
    Args:
        htmlfiles (list): HTML files path.
        cssfiles (list): CSS files path.
        jsfiles (list): JS files path.
    """

    # Dict<HTMLClasses, ObfuscatedHTMLClasses>
    equivalents_obfuscated_html_classes = {}

    # HTML FILES GENERATION : Fetch HTML classes and rename them
    for path in htmlfiles:

        old_html = utils.read(path)
        (
            classes_groups,
            obfuscate_classes_groups,
            equivalents_obfuscated_html_classes,
        ) = _parse_html_class_names(
            old_html,
            equivalents_obfuscated_html_classes,
        )

        new_html = _generate_html(
            old_html,
            classes_groups,
            obfuscate_classes_groups,
        )

        utils.write(new_html, path)

    for path in cssfiles:
        utils.write(
            _generate_css(
                utils.read(path),
                equivalents_obfuscated_html_classes,
            ),
            path,
        )

    for path in jsfiles:
        utils.write(
            _generate_js(
                utils.read(path),
                equivalents_obfuscated_html_classes,
            ),
            path,
        )


def main() -> None:
    args = argparser.parse_args()

    def g(p):
        return glob.glob(p, recursive=True)

    obfuscate(g(args.html), g(args.css), g(args.js))


if __name__ == "__main__":
    main()
