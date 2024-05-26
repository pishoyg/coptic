import argparse

from bs4 import BeautifulSoup as bs

argparser = argparse.ArgumentParser(description="HTML utilities.")
argparser.add_argument(
    "--prettify", type=bool, help="If true, print a prettified HTML."
)
argparser.add_argument(
    "--text", type=bool, help="If true, print the text contained in the HTML."
)
argparser.add_argument("--input", type=str, help="Path to the input file.")

args = argparser.parse_args()

soup = bs(open(args.input).read(), features="html.parser")

if args.prettify:
    print(soup.prettify())

if args.text:
    text = soup.get_text()
    text = text.split("\n")
    text = [l.strip() for l in text]
    text = [l for l in text if l]
    text = "\n".join(text)
    print(text)
