from functools import reduce


def generate_json(
    name_tuple,
    bible_tuple,
    force_consistent_chapter_count=True,
    force_consistent_verse_count=True):
  return [
      generate_book_json(
          name_tuple,
          book_tuple,
          force_consistent_chapter_count=force_consistent_chapter_count,
          force_consistent_verse_count=force_consistent_verse_count)
      for book_tuple in zip(*[bible.books() for bible in bible_tuple])
  ]


def generate_book_json(
    name_tuple,
    book_tuple,
    force_consistent_chapter_count=True,
    force_consistent_verse_count=True):
  validate_chapter_count(book_tuple, force_consistent_chapter_count)
  chapters = []
  for chapter_tuple in zip(*[book.chapters() for book in book_tuple]):
    validate_verse_count(name_tuple, book_tuple, chapter_tuple,
                         force_consistent_verse_count)
    cur_chapter = {
                      "num-" + name: chapter.print_num()
                      for name, chapter in zip(name_tuple, chapter_tuple)
                  } | {
                      "verses": [{
                                     "text-" + name: verse.text()
                                     for name, verse in
                                     zip(name_tuple, verse_tuple)
                                 } | {
                                     "num-" + name: verse.print_num() for
                                     name, verse in
                                     zip(name_tuple, verse_tuple)
                                 }
                                 for verse_tuple in zip(
                              *[chapter.verses() for chapter in chapter_tuple])]
                  }
    chapters.append(cur_chapter)
  cur_book = {
      "chapters": chapters,
  }
  for name, book in zip(name_tuple, book_tuple):
    cur_book.update({
        "name-" + name: book.name(),
    })

  return cur_book


def generate_mmakar_json(
    name_tuple,
    bible_tuple,
    force_consistent_chapter_count=True,
    force_consistent_verse_count=True):
  return [
      generate_mmakar_book_json(
          name_tuple,
          book_tuple,
          force_consistent_chapter_count=force_consistent_chapter_count,
          force_consistent_verse_count=force_consistent_verse_count)
      for book_tuple in zip(*[bible.books() for bible in bible_tuple])
  ]


def generate_mmakar_book_json(
    name_tuple,
    book_tuple,
    force_consistent_chapter_count=True,
    force_consistent_verse_count=True):
  validate_chapter_count(book_tuple, force_consistent_chapter_count)
  chapters = []
  for i, chapter_tuple in enumerate(
      zip(*[book.chapters() for book in book_tuple]), 1):
    validate_verse_count(name_tuple, book_tuple, chapter_tuple,
                         force_consistent_verse_count)
    cur_chapter = {
                      "sectionName" + name: chapter.title() + ' ' +
                                            chapter.print_num()
                      for name, chapter in zip(name_tuple, chapter_tuple)
                  } | {
                      "sectionId": "sec_id_{}".format(str(i).zfill(4)),
                      "data"     : [
                          {
                              "verseNumber": '{}:{}'.format(
                                  chapter_tuple[0].num(),
                                  verse_tuple[0].num())
                          } | {
                              name: "({}) {}".format(
                                  verse.print_num(),
                                  verse.text()) for
                              name, verse in
                              zip(name_tuple, verse_tuple)
                          } | merge_dicts(
                              {
                                  name                : "({}) {}".format(
                                      verse.print_num(), verse.text()),
                                  "verseNumber" + name: '{} {}:{}'.format(
                                      book.name(),
                                      chapter.print_num(),
                                      verse.print_num())
                              }
                              for name, book, chapter, verse in
                              zip(name_tuple, book_tuple, chapter_tuple,
                                  verse_tuple)
                          )
                          for verse_tuple in
                          zip(
                              *[chapter.verses() for chapter in
                                chapter_tuple])
                      ],
                  }
    chapters.append(cur_chapter)
  return chapters


def validate_chapter_count(book_tuple, force_consistent_chapter_count):
  if not all(b.num_chapters() == book_tuple[0].num_chapters()
             for b in book_tuple):
    e = "Inconsistent chapter count for {}: {}".format(
        [b.name() for b in book_tuple],
        [b.num_chapters() for b in book_tuple])
    if force_consistent_chapter_count:
      raise Exception(e)
    else:
      print(e)


def validate_verse_count(name_tuple, book_tuple, chapter_tuple,
                         force_consistent_verse_count):
  if not all(c.num_verses() == chapter_tuple[0].num_verses()
             for c in chapter_tuple):
    e = "Inconsistent verse count for {}: {}: {}: {}".format(
        name_tuple,
        [b.name() for b in book_tuple],
        [c.print_num() for c in chapter_tuple],
        [c.num_verses() for c in chapter_tuple])
    if force_consistent_verse_count:
      raise Exception(e)
    else:
      print(e)


# TODO: Implement.
def generate_csv(
    name_tuple,
    bible_tuple,
    force_consistent_chapter_count=True,
    force_consistent_verse_count=True):
  raise Exception('Not implemented :(')


def merge_dicts(dict_list):
  return reduce(lambda a, b: {**a, **b}, dict_list)
