import argparse
import json
import parser

import author
import mmakar
import stats

import bible

PARSERS = {
    "coptic_book": parser.parse_indexed_verses_book,
    "greek_book": lambda *args: parser.parse_delimited_chapters_book(
        *args, "\n\n", r"\d+1[^\d]", 2
    ),
    "english_book": lambda *args: parser.parse_delimited_chapters_book(
        *args, "\n\n", r"\d+\s[A-Z]", 2
    ),
}

AUTHORS = {
    "mmakar_book_json": lambda *args: json_dumps(mmakar.generate_book_json(*args)),
    "book_json": lambda *args: json_dumps(author.generate_book_json(*args)),
}

argparser = argparse.ArgumentParser(
    description="Parse and process unbound.biola.edu's Coptic NT, and align it with NKJV."
)

############################################################
# Arguments for parsing the New Testament.
############################################################

argparser.add_argument(
    "--unbound_biola_coptic_nt_tsv",
    type=str,
    help="Path to the input TSV file containing the Coptic NT.",
)
argparser.add_argument(
    "--nkjv_json", type=str, help="Path to the input JSON file containing NKJV."
)
argparser.add_argument(
    "--unbound_biola_book_names",
    type=str,
    help="Path of the input tsv file containing book names and codes from "
    "unbound biola.",
)
argparser.add_argument(
    "--stats",
    type=bool,
    default=False,
    help="Whether the purpose is to only print statistics for the Coptic NT.",
)

############################################################
# Arguments for parsing books.
############################################################

argparser.add_argument(
    "--num_chapters", type=int, help="Number of chapters in the book."
)
argparser.add_argument(
    "--books",
    type=str,
    nargs="+",
    help="Each item in the list is a colon-separated string representing four "
    "items: "
    "<parser_code>:<language>:<book_name>:<book_file_path>",
)
argparser.add_argument("--name", type=str, help="Book name.")
argparser.add_argument(
    "--author", type=str, help="Author name. Must be defined in `AUTHORS` above"
)

args = argparser.parse_args()


def _parse_coptic_nt():
    return parser.parse_unbound_biola_coptic_nt(
        args.unbound_biola_coptic_nt_tsv,
        *parser.parse_unbound_biola_book_names(args.unbound_biola_book_names)
    )


def print_stats():
    stats.count_pairs(_parse_coptic_nt())


def process_nt():
    coptic_nt = _parse_coptic_nt()
    nkjv = parser.parse_nkjv_json(args.nkjv_json)
    assert nkjv.num_books() == 66
    nkjv = bible.Bible("nkjn", nkjv.books()[39:])
    assert nkjv.num_books() == 27
    assert coptic_nt.num_books() == 27
    j = (
        json.dumps(
            author.generate_json(["Coptic", "English"], [coptic_nt, nkjv]),
            ensure_ascii=False,
            indent=1,
            sort_keys=False,
        )
        .encode("utf8")
        .decode()
    )
    print(j)


def process_books():
    language_tuple, book_tuple = [], []
    for s in args.books:
        parse, language, print_name, path = s.split(":")
        parse = PARSERS[parse]
        language_tuple.append(language)
        book_tuple.append(parse(args.name, print_name, path, args.num_chapters))

    print(AUTHORS[args.author](language_tuple, book_tuple))


def json_dumps(j):
    return (
        json.dumps(j, ensure_ascii=False, indent=1, sort_keys=False)
        .encode("utf8")
        .decode()
    )


def main():
    if args.books:
        process_books()
    elif args.unbound_biola_coptic_nt_tsv:
        if args.stats:
            print_stats()
        else:
            process_nt()
    else:
        raise ValueError("Unknown purpose; please make sure flags are properly set.")


if __name__ == "__main__":
    main()
