class type:
    _marcion = None
    _coptic_symbol = None
    _description = None

    def __init__(self, marcion, coptic_symbol, description, append=True):
        assert isinstance(marcion, str)
        assert isinstance(coptic_symbol, str)
        assert isinstance(description, str)

        self._marcion = marcion
        self._coptic_symbol = coptic_symbol
        self._description = description
        self._append = append

    def marcion(self):
        return self._marcion

    def coptic_symbol(self):
        return self._coptic_symbol

    def description(self):
        return self._description

    def append(self):
        return self._append


class structured_word:
    _dialects = None
    _spellings = None
    _types = None
    _references = None
    _root_type = None

    def __init__(self, dialects, spellings, types, references, root_type):
        assert isinstance(dialects, list) and all(isinstance(i, str) for i in dialects)
        assert isinstance(spellings, list) and all(
            isinstance(i, str) for i in spellings
        )
        assert isinstance(types, list) and all(isinstance(i, type) for i in types)
        assert isinstance(references, list) and all(
            isinstance(i, str) for i in references
        )
        assert root_type is None or isinstance(root_type, type), root_type

        self._dialects = dialects
        self._spellings = spellings
        self._types = types
        self._references = references
        self._root_type = root_type

    def is_dialect(self, d):
        return d in self._dialects

    def __str__(self):
        return self.str()

    def str(self, include_references=True, append_root_type=False):
        d = "({}) ".format(", ".join(self._dialects)) if self._dialects else ""
        return d + self.undialected_str(include_references, append_root_type)

    # TODO: Appending the root type should be done selectively, based on the
    # type, and not for all types. After all, this is done for aesthetic
    # purposes. And some types are more acceptable than others.
    def undialected_str(self, include_references, append_root_type):
        s = ", ".join(self._spellings)
        t = " ".join(i.coptic_symbol() for i in self._types if i.append())
        if not t and append_root_type and self._root_type.append():
            t = self._root_type.coptic_symbol()
        r = ""
        if include_references:
            r = ", ".join("{" + r + "}" for r in self._references)
        return " ".join(filter(None, [s, t, r]))

    def dialects(self):
        return self._dialects
