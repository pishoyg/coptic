from functools import reduce


def generate_json(
    name_tuple,
    bible_tuple,
    force_consistent_chapter_count=True,
    force_consistent_verse_count=True,
):
    return [
        generate_book_json(
            name_tuple,
            book_tuple,
            force_consistent_chapter_count=force_consistent_chapter_count,
            force_consistent_verse_count=force_consistent_verse_count,
        )
        for book_tuple in zip(*[bible.books() for bible in bible_tuple])
    ]


def generate_book_json(
    name_tuple,
    book_tuple,
    force_consistent_chapter_count=True,
    force_consistent_verse_count=True,
):
    validate_chapter_count(book_tuple, force_consistent_chapter_count)
    chapters = []
    for chapter_tuple in zip(*[b.chapters() for b in book_tuple]):
        validate_verse_count(
            name_tuple, book_tuple, chapter_tuple, force_consistent_verse_count
        )
        chapters.append(
            {"num-" + name: c.print_num() for name, c in zip(name_tuple, chapter_tuple)}
            | {
                "verses": [
                    merge_dicts(
                        {"num-" + name: v.print_num(), "text-" + name: v.text()}
                        for name, v in zip(name_tuple, verse_tuple)
                    )
                    for verse_tuple in zip(*[c.verses() for c in chapter_tuple])
                ]
            }
        )
    return {"chapters": chapters} | {
        "name-" + name: book.print_name() for name, book in zip(name_tuple, book_tuple)
    }


def validate_chapter_count(book_tuple, force_consistent_chapter_count):
    if not all(b.num_chapters() == book_tuple[0].num_chapters() for b in book_tuple):
        e = "Inconsistent chapter count for {}: {}".format(
            [b.print_name() for b in book_tuple], [b.num_chapters() for b in book_tuple]
        )
        if force_consistent_chapter_count:
            raise Exception(e)
        else:
            print(e)


def validate_verse_count(
    name_tuple, book_tuple, chapter_tuple, force_consistent_verse_count
):
    if not all(c.num_verses() == chapter_tuple[0].num_verses() for c in chapter_tuple):
        e = "Inconsistent verse count for {}: {}: {}: {}".format(
            name_tuple,
            [b.print_name() for b in book_tuple],
            [c.print_num() for c in chapter_tuple],
            [c.num_verses() for c in chapter_tuple],
        )
        if force_consistent_verse_count:
            raise Exception(e)
        else:
            print(e)


# TODO: Implement.
def generate_csv(
    name_tuple,
    bible_tuple,
    force_consistent_chapter_count=True,
    force_consistent_verse_count=True,
):
    raise Exception("Not implemented :(")


def merge_dicts(dict_list):
    return reduce(lambda a, b: {**a, **b}, dict_list)
