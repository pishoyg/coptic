class Bible:
    _name = None
    _books = None

    def __init__(self, name, books):
        self._name = name
        self._books = books

    def name(self):
        return self._name

    def book_names(self):
        return [b.name() for b in self._books]

    def unbound_biola_codes(self):
        return [b.unbound_biola_code() for b in self._books]

    def books(self):
        return self._books

    def num_books(self):
        return len(self.books())

    def get_book(self, name):
        for b in self._books:
            if b.name() == name:
                return b

    def __str__(self):
        return "\n\n\n\n".join(str(b) for b in self.books())


class Book:
    _name = None
    _unbound_biola_code = None
    _chapters = None

    def __init__(self, name, print_name, unbound_biola_code, chapters):
        assert isinstance(name, str)
        assert unbound_biola_code is None or isinstance(unbound_biola_code, str)
        assert isinstance(print_name, str)
        assert isinstance(chapters, list)
        assert all(isinstance(c, Chapter) for c in chapters)
        assert all(c.num() == i + 1 for i, c in enumerate(chapters))
        self._name = name
        self._print_name = print_name
        self._unbound_biola_code = unbound_biola_code
        self._chapters = chapters

    def name(self):
        return self._name

    def print_name(self):
        return self._print_name

    def unbound_biola_code(self):
        return self._unbound_biola_code

    def num_chapters(self):
        return len(self.chapters())

    def chapters(self):
        return self._chapters

    def get_chapter(self, i):
        return self._chapters[i]

    def __str__(self):
        header = "{}\n({})".format(self.name(), self.unbound_biola_code())
        chapters = "\n\n".join(str(c) for c in self.chapters())
        return header + "\n\n" + chapters


class Chapter:
    _num = None
    _verses = None
    _title = None
    _print_num = None

    def __init__(self, num, print_num, title, verses):
        assert isinstance(num, int)
        assert isinstance(print_num, str)
        assert isinstance(title, str)
        assert isinstance(verses, list)
        assert all(isinstance(v, Verse) for v in verses)
        assert all(v.num() == i + 1 for i, v in enumerate(verses))
        self._num = num
        self._verses = verses
        self._title = title
        self._print_num = print_num

    def num(self):
        return self._num

    def print_num(self):
        return self._print_num

    def title(self):
        return self._title

    def verses(self):
        return self._verses

    def num_verses(self):
        return len(self.verses())

    def get_verse(self, i):
        return self._verses[i]

    def __str__(self):
        return "{} {}\n{}".format(
            self.title(), self.print_num(), "\n".join(str(v) for v in self.verses())
        )


class Verse:
    _num = None
    _text = None
    _print_num = None

    def __init__(self, num, print_num, text):
        assert isinstance(num, int)
        assert isinstance(print_num, str)
        assert isinstance(text, str)
        self._num = num
        self._print_num = print_num
        self._text = text

    def num(self):
        return self._num

    def print_num(self):
        return self._print_num

    def text(self):
        return self._text

    def __str__(self):
        return "{}: {}".format(self.print_num(), self.text())
