import argparse
import os
import typing

import bs4

import utils

# Set up argument parsing.
parser = argparse.ArgumentParser(
    description="Recursively search for HTML files and extract text content.",
)
parser.add_argument(
    "--directory",
    type=str,
    default="",
    help="The directory to search for HTML files.",
)
parser.add_argument(
    "--output",
    type=str,
    default="",
    help="Output JSON file.",
)
parser.add_argument(
    "--exclude",
    type=str,
    nargs="*",
    default=[],
    help="List of HTML classes to exclude.",
)


def get_text(tag: bs4.Tag) -> str:
    # NOTE: This implementation is somewhat hacky. The output may contain
    # superfluous newlines. It may fail to parse HTML special space character
    # entities. This function is expected to be revisited in the future if our
    # HTML output changes.
    # NOTE: We get to decide what is a block element and what is an inline
    # element. There is no canonical list, but the following list includes the
    # tags that are generally agreed to represent inline tags. It works for our
    # current use case.
    _inline_elements = {
        "a",
        "span",
        "em",
        "strong",
        "u",
        "i",
        "font",
        "mark",
        "label",
        "s",
        "sub",
        "sup",
        "tt",
        "bdo",
        "button",
        "cite",
        "del",
        "b",
        "a",
        "font",
        # NOTE: `td` is generally considered a block element, but we treat it
        # as an inline element for our purposes.
        "td",
    }
    _newline_elements = {
        "br",
        "hr",
    }

    def _get_text(tag: bs4.Tag) -> typing.Generator:
        for child in tag.children:
            if isinstance(child, bs4.Tag):
                # If the tag is a block type tag, then yield new lines before
                # and after.
                is_block_element = child.name not in _inline_elements
                if is_block_element:
                    yield "\n"
                yield from (
                    ["\n"]
                    if child.name in _newline_elements
                    else _get_text(child)
                )
                if is_block_element:
                    yield "\n"
            elif isinstance(child, bs4.NavigableString):
                # Join all strings with a space, just like you expect a browser
                # to do.
                s = " ".join(child.strings)
                # Remove excess space, again just like you would expect a
                # browser to do.
                s = " ".join(s.split())
                # Append spaces before and after, if they existed.
                raw = str(child)
                if raw[0].isspace():
                    s = " " + s
                if raw[-1].isspace():
                    s = s + " "
                yield s

    return "".join(_get_text(tag))


def clean_text(text: str) -> str:
    lines: list[str] = text.split("\n")
    lines = [ln.strip() for ln in lines]
    lines = list(filter(None, lines))
    lines = [" ".join(line.split()) for line in lines]
    text = "\n".join(lines)
    return text


def build_index(
    directory: str,
    exclude: list[str],
) -> list[dict[str, str]]:

    index: list[dict[str, str]] = []

    # Recursively search for all HTML files.
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith(".html"):
                continue
            file_path = os.path.join(root, file)

            # Parse the HTML content.
            soup = bs4.BeautifulSoup(utils.read(file_path), "html.parser")

            # Get the page title.
            assert soup.title
            assert soup.title.string
            title: str = soup.title.string

            # Remove the title before extracting text.
            soup.title.decompose()

            # Remove elements with the specified classes.
            for class_name in exclude:
                for element in soup.find_all(class_=class_name):
                    element.decompose()  # Removes the element from the tree.

            # Extract the remaining text
            text = clean_text(get_text(soup))

            # Store the relative file path and extracted text in the index.
            relative_path = os.path.relpath(file_path, directory)
            index.append(
                {
                    "path": relative_path,
                    "title": title,
                    "text": text,
                },
            )

    return index


def main():
    # Parse the arguments.
    args = parser.parse_args()

    # Read HTML files and extract text.
    index = build_index(args.directory, args.exclude)

    # Write the resulting map to a JSON file.
    utils.write(utils.json_dumps(index), args.output)


if __name__ == "__main__":
    main()
