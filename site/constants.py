import xooxle

_CRUM_INDEX = xooxle.index(
    directory="flashcards/data/output/web/a_coptic_dictionary__all_dialects/",
    output="site/data/crum/index.json",
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
    capture=[
        ("title", xooxle.selector({"id": "marcion"})),
        ("text", xooxle.selector({"name": "body"})),
    ],
)

INDEXES = [
    _CRUM_INDEX,
]
