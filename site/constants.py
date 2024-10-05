import xooxle

_CRUM_INDEX = xooxle.index(
    "site/data/xooxle/crum.json",
    xooxle.subindex(
        directory="flashcards/data/output/web/a_coptic_dictionary__all_dialects/",
        extract=[
            xooxle.selector({"name": "title"}),
            xooxle.selector({"class_": "header"}),
            xooxle.selector({"class_": "dictionary"}, force=False),
            xooxle.selector({"class_": "crum"}, force=False),
            xooxle.selector({"class_": "crum-page"}, force=False),
            xooxle.selector({"class_": "crum-page-external"}, force=False),
            xooxle.selector({"class_": "dawoud"}, force=False),
            xooxle.selector({"class_": "dawoud-page"}, force=False),
            xooxle.selector({"class_": "dawoud-page-external"}, force=False),
            xooxle.selector({"class_": "drv-key"}, force=False),
            xooxle.selector({"class_": "explanatory-key"}, force=False),
            xooxle.selector({"class_": "nag-hammadi"}, force=False),
        ],
        captures=[
            xooxle.capture(
                "marcion",
                xooxle.selector({"id": "marcion"}),
                raw=True,
            ),
            xooxle.capture(
                "meaning",
                xooxle.selector({"id": "meaning"}, force=False),
                raw=False,
            ),
            xooxle.capture(
                "text",
                xooxle.selector(
                    {"name": "body"},
                ),
                raw=False,
            ),
        ],
        result_table_name="crum",
        path_prefix="",
        retain_extension=True,
    ),
    xooxle.subindex(
        directory="flashcards/data/output/web/kellia__comprehensive/",
        extract=[
            xooxle.selector({"name": "footer"}),
        ],
        captures=[
            xooxle.capture(
                "orths",
                xooxle.selector({"id": "orths"}),
                raw=True,
            ),
            xooxle.capture(
                "senses",
                xooxle.selector({"id": "senses"}),
                raw=True,
            ),
            xooxle.capture(
                "text",
                xooxle.selector(
                    {"name": "body"},
                ),
                raw=False,
            ),
        ],
        result_table_name="kellia",
        path_prefix="https://coptic-dictionary.org/entry.cgi?tla=",
        retain_extension=False,
    ),
)

INDEXES = [
    _CRUM_INDEX,
]
