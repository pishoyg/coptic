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


def extract_text_from_html(
    html_content: str,
    excluded_classes: list[str],
) -> str:
    # Parse the HTML content.
    soup = BeautifulSoup(html_content, "html.parser")

    # Remove elements with the specified classes.
    for class_name in excluded_classes:
        for element in soup.find_all(class_=class_name):
            element.decompose()  # Removes the element from the tree.

    # Extract the remaining text
    text = soup.get_text()

    # Remove excess space.
    text = " ".join(text.split()).strip()

    return text


def read_html_files(directory: str, exclude: list[str]) -> dict[str, str]:
    html_files_map = {}

    # Recursively search for all HTML files.
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith(".html"):
                continue
            file_path = os.path.join(root, file)

            # Extract text from the HTML content
            text_content = extract_text_from_html(
                utils.read(file_path),
                exclude,
            )

            # Store the relative file path and extracted text in the map
            relative_path = os.path.relpath(file_path, directory)
            html_files_map[relative_path] = text_content
    return html_files_map


def main():
    # Parse the arguments.
    args = parser.parse_args()

    # Read HTML files and extract text.
    html_files_map = read_html_files(args.directory, args.exclude)

    # Write the resulting map to a JSON file.
    utils.write(utils.json_dumps(html_files_map), args.output)


if __name__ == "__main__":
    main()
