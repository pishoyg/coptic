import author


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
    author.validate_chapter_count(book_tuple, force_consistent_chapter_count)
    chapters = []
    for i, chapter_tuple in enumerate(
        zip(*[book.chapters() for book in book_tuple]), 1
    ):
        author.validate_verse_count(
            name_tuple, book_tuple, chapter_tuple, force_consistent_verse_count
        )
        chapters.append(
            {
                "sectionName" + name: "{} {}".format(c.title(), c.print_num())
                for name, c in zip(name_tuple, chapter_tuple)
                if name in ["Bohairic", "English"]
            }
            | {
                "sectionId": "sec_id_{}".format(str(i).zfill(4)),
                "data": [
                    {
                        name: "({}) {}".format(v.print_num(), v.text())
                        for name, v in zip(name_tuple, verse_tuple)
                    }
                    | {
                        "Sahidic": "",
                        "verseNumber": "{} {}:{}".format(
                            book_tuple[0].name(),
                            chapter_tuple[0].num(),
                            verse_tuple[0].num(),
                        ),
                    }
                    for verse_tuple in zip(*[c.verses() for c in chapter_tuple])
                ],
            }
        )
    return chapters
