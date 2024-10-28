import xooxle

_CRUM_RETAIN_CLASSES = {
    "dialect",
    "spelling",
    "dialect-comma",
    "spelling-comma",
    "dialect-parenthesis",
}

_KELLIA_RETAIN_CLASSES = {
    "spelling",
    "dialect",
    "gram_grp",
    "lang",
    "bibl",
    "ref",
    "xr",
}

_CRUM_INDEX = xooxle.index(
    "site/data/xooxle/crum.json",
    xooxle.subindex(
        input="flashcards/data/output/web/a_coptic_dictionary__all_dialects/",
        extract=[
            xooxle.selector({"name": "title"}, force=False),
            xooxle.selector({"class_": "header"}, force=False),
            xooxle.selector({"class_": "dictionary"}, force=False),
            xooxle.selector({"class_": "crum"}, force=False),
            xooxle.selector({"class_": "crum-page"}, force=False),
            xooxle.selector({"class_": "crum-page-external"}, force=False),
            xooxle.selector({"class_": "dawoud"}, force=False),
            xooxle.selector({"class_": "dawoud-page"}, force=False),
            xooxle.selector(
                {"class_": "dawoud-page-external"},
                force=False,
            ),
            xooxle.selector({"class_": "drv-key"}, force=False),
            xooxle.selector({"class_": "explanatory-key"}, force=False),
            xooxle.selector({"class_": "nag-hammadi"}, force=False),
            xooxle.selector({"class_": "sisters"}, force=False),
            xooxle.selector({"id": "pretty"}),
        ],
        captures=[
            xooxle.capture(
                "marcion",
                xooxle.selector({"id": "marcion"}),
                # This is the list of classes needed for highlighting. If the
                # highlighting rules change, you might have to add new classes!
                retain_classes=_CRUM_RETAIN_CLASSES,
            ),
            xooxle.capture(
                "meaning",
                xooxle.selector({"id": "meaning"}, force=False),
                retain_classes=_CRUM_RETAIN_CLASSES,
            ),
            xooxle.capture(
                "notes",
                xooxle.selector(
                    {"name": "body"},
                ),
                retain_classes=_CRUM_RETAIN_CLASSES,
            ),
        ],
        result_table_name="crum",
        view=True,
        path_prefix="",
        retain_extension=True,
    ),
    xooxle.subindex(
        input="flashcards/data/output/web/kellia__comprehensive/",
        extract=[
            xooxle.selector({"name": "footer"}, force=False),
            xooxle.selector({"class_": "bibl"}, force=False),
            xooxle.selector({"class_": "ref_xr"}, force=False),
            xooxle.selector({"class_": "ref"}, force=False),
        ],
        captures=[
            xooxle.capture(
                "orths",
                xooxle.selector({"id": "orths"}),
                retain_classes=_KELLIA_RETAIN_CLASSES,
            ),
            xooxle.capture(
                "senses",
                xooxle.selector({"id": "senses"}),
                retain_classes=_KELLIA_RETAIN_CLASSES,
            ),
            xooxle.capture(
                "text",
                xooxle.selector(
                    {"name": "body"},
                ),
            ),
        ],
        result_table_name="kellia",
        view=True,
        path_prefix="https://coptic-dictionary.org/entry.cgi?tla=",
        retain_extension=False,
    ),
    xooxle.subindex(
        input="flashcards/data/output/web/copticsite.com/",
        extract=[],
        captures=[
            xooxle.capture(
                "front",
                xooxle.selector({"id": "front"}),
                retain_classes={"spelling"},
            ),
            xooxle.capture(
                "back",
                xooxle.selector({"id": "back"}),
            ),
        ],
        result_table_name="copticsite",
        view=False,
        path_prefix="https://coptic-dictionary.org/entry.cgi?tla=",
        retain_extension=False,
    ),
)

INDEXES = [
    _CRUM_INDEX,
]
