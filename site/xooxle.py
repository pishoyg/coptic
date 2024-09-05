import argparse
import os

from bs4 import BeautifulSoup

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
            soup = BeautifulSoup(utils.read(file_path), "html.parser")

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
            text = soup.get_text()

            # Remove excess space.
            text = " ".join(text.split()).strip()

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
