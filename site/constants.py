import xooxle

# Xooxle search will work fine even if we don't retain any HTML tags, because it
# relies entirely on searching the text payloads of the HTML. However, we retain
# the subset of the classes that are needed for highlighting, in order to make
# the Xooxle search results pretty.

_DIALECTS = {
    "S",
    "Sa",
    "Sf",
    "A",
    "sA",
    "B",
    "F",
    "Fb",
    "O",
    # The following dialects are only found in Marcion.
    "NH",
    # The following dialects are only found in TLA / KELLIA.
    "Ak",
    "M",
    "L",
    "P",
    "V",
    "W",
    "U",
    "K",
}

_CRUM_RETAIN_CLASSES = {
    "word",
    "dialect",
    "spelling",
    "type",
    "dialect-comma",
    "spelling-comma",
    "dialect-parenthesis",
} | _DIALECTS

_KELLIA_RETAIN_CLASSES = {
    "word",
    "spelling",
    "dialect",
    "type",
    "lang",
    "geo",
    "gram_grp",
} | _DIALECTS

_COPTICSITE_RETAIN_CLASSES = {
    "word",
    "spelling",
} | _DIALECTS

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
            xooxle.selector({"id": "images"}, force=False),
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
                xooxle.selector({"id": "root-type-meaning"}, force=False),
                retain_classes=_CRUM_RETAIN_CLASSES,
            ),
            xooxle.capture(
                "appendix",
                xooxle.selector(
                    {"name": "body"},
                ),
                retain_classes=_CRUM_RETAIN_CLASSES,
                unit_tags={"tr", "div", "hr"},
                block_elements=xooxle.BLOCK_ELEMENTS_DEFAULT | {"td"},
            ),
        ],
        result_table_name="crum",
        href_fmt="{KEY}.html",
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
        href_fmt="https://coptic-dictionary.org/entry.cgi?tla={KEY}",
    ),
    xooxle.subindex(
        input="flashcards/data/output/web/copticsite.com/",
        extract=[],
        captures=[
            xooxle.capture(
                "front",
                xooxle.selector({"id": "front"}),
                retain_classes=_COPTICSITE_RETAIN_CLASSES,
            ),
            xooxle.capture(
                "back",
                xooxle.selector({"id": "back"}),
            ),
        ],
        result_table_name="copticsite",
        href_fmt="",
    ),
)

INDEXES = [
    _CRUM_INDEX,
]
