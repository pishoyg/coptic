# TODO: Read this file for inspiration:
# https://github.com/KELLIA/dictionary/blob/master/utils/dictionary_reader.py.
import argparse

import bs4
import type_enforced

argparser = argparse.ArgumentParser(description="Process the Coptic Lexicon.")

argparser.add_argument(
    "--input",
    type=str,
    default="dictionary/kellia.uni-goettingen.de/data/v1.2/Comprehensive_Coptic_Lexicon-v1.2-2020.xml",
    help="Path to the input XML file.",
)

args = argparser.parse_args()


@type_enforced.Enforcer
def main():
    with open(args.input) as f:
        soup = bs4.BeautifulSoup(f, "lxml-xml")
    # We only care about the body.
    soup = soup.body
    assert soup
    for child in soup.children:
        if isinstance(child, bs4.NavigableString):
            assert not str(child).strip()
            continue
        assert isinstance(child, bs4.Tag)
        assert child.name in ["entry", "superEntry"], child


if __name__ == "__main__":
    main()
