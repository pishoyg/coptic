import json
import re
from types import SimpleNamespace

import numerals
import pandas as pd

import bible


def parse_unbound_biola_book_names(unbound_biola_book_names_path):
    code_to_english = {}
    code_to_coptic = {}
    lines = open(unbound_biola_book_names_path).read().split("\n")
    lines = filter(None, lines)
    for l in lines:
        l = l.split("	")
        assert len(l) == 2 or len(l) == 3, l
        code_to_english[l[0]] = l[1]
        if len(l) == 3:
            code_to_coptic[l[0]] = l[2]
    return code_to_coptic, code_to_english


def parse_unbound_biola_coptic_nt(
    unbound_biola_coptic_nt_tsv_path, code_to_coptic, code_to_english
):
    df = pd.read_csv(
        unbound_biola_coptic_nt_tsv_path, sep="\t", encoding="utf-8"
    ).fillna("")
    data = {}
    for index, row in df.iterrows():
        book_code = row["orig_book_index"]
        chapter_idx = row["orig_chapter"]
        verse_idx = row["orig_verse"]
        text = row["text"].lower()
        if book_code not in data:
            data[book_code] = {}
        if chapter_idx not in data[book_code]:
            data[book_code][chapter_idx] = []
        data[book_code][chapter_idx].append(
            bible.Verse(verse_idx, numerals.to_coptic_num(verse_idx), text)
        )
    for book_code, chapters in data.items():
        data[book_code] = bible.Book(
            code_to_english[book_code],
            code_to_coptic[book_code],
            book_code,
            [
                bible.Chapter(
                    chapter_idx, numerals.to_coptic_num(chapter_idx), "Ⲕⲉⲫⲁⲗⲟⲛ", verses
                )
                for chapter_idx, verses in chapters.items()
            ],
        )
    return bible.Bible("unbound_biola_nt", [book for _, book in data.items()])


def parse_nkjv_json(nkjv_json_path):
    j = json.loads(
        open(nkjv_json_path).read(), object_hook=lambda d: SimpleNamespace(**d)
    )
    return bible.Bible(
        "nkjv",
        [
            bible.Book(
                b.name,
                b.name,
                None,
                [
                    bible.Chapter(
                        c.num,
                        str(c.num),
                        "Chapter",
                        [bible.Verse(v.num, str(v.num), v.text) for v in c.verses],
                    )
                    for c in b.chapters
                ],
            )
            for b in j.books
        ],
    )


def parse_indexed_verses_book(name, print_name, path, want_num_chapters):
    def parse_line(l):
        assert re.match(r"\d+:\d+ ", l), (
            'Error parsing htakla Coptic book {}: line "{}" does '
            'not match the expected regex "{}"'.format(name, l, r"\d+:\d+ ")
        )
        numbers = l[: l.find(" ")]
        assert re.match("\d+:\d+$", numbers)
        numbers = numbers.split(":")
        assert len(numbers) == 2
        return int(numbers[0]), int(numbers[1]), l[l.find(" ") + 1 :]

    lines = None
    with open(path) as f:
        lines = f.readlines()
    lines = map(lambda l: l.strip(), lines)
    lines = filter(None, lines)
    lines = list(lines)
    chapters = []
    i = 0
    while i < len(lines):
        # Parse next chapter.
        chapter_idx, verse_idx, _ = parse_line(lines[i])
        assert verse_idx == 1, (
            "Chapter {} in the Coptic book {} starts with "
            "invalid verse number {}, want 1".format(chapter_idx, name, verse_idx)
        )
        verses = []
        while i < len(lines):
            cur_chapter_idx, cur_verse_idx, v_txt = parse_line(lines[i])
            if cur_chapter_idx != chapter_idx:
                break
            verses.append(
                bible.Verse(cur_verse_idx, numerals.to_coptic_num(cur_verse_idx), v_txt)
            )
            i += 1
        chapters.append(
            bible.Chapter(
                chapter_idx, numerals.to_coptic_num(chapter_idx), "Ⲕⲉⲫⲁⲗⲟⲛ", verses
            )
        )

    assert len(chapters) == want_num_chapters

    return bible.Book(name, print_name, None, chapters)


def parse_delimited_chapters_book(
    name,
    print_name,
    path,
    want_num_chapters,
    chapter_delimiter,
    chapter_starter,
    chapter_idx_suffix,
):
    def parse_chapter(text):
        m = re.match(chapter_starter, text)
        assert m, (
            'Error parsing htakla book {}: line "{}" does not match the '
            'expected regex "{}"'.format(name, text, chapter_starter)
        )
        idx = m.group(0)[:-chapter_idx_suffix]
        idx = int(idx)
        lines = re.compile(r"\d+").split(text)
        lines = map(lambda l: l.strip(), lines)
        lines = list(lines)
        if not lines[0]:
            lines = lines[1:]
        if not lines[-1]:
            lines = lines[:-1]
        return bible.Chapter(
            idx,
            str(idx),
            "Chapter",
            [bible.Verse(i + 1, str(i + 1), t) for i, t in enumerate(lines)],
        )

    text = None
    with open(path) as f:
        text = f.read()
    text = text.split(chapter_delimiter)
    assert (
        len(text) == want_num_chapters
    ), "len(text) = {}, want_num_chapters = {}".format(len(text), want_num_chapters)
    return bible.Book(name, print_name, None, [parse_chapter(c) for c in text])
