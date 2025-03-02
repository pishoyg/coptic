import xooxle

import utils

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
} | _DIALECTS

_CRUM_RETAIN_ELEMENTS_FOR_CLASSES = {
    "dialect-comma",
    "spelling-comma",
    "dialect-parenthesis",
}

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


_BLOCK_ELEMENTS_DEFAULT = {
    # Each table row goes to a block.
    "table",
    "thead",
    "tbody",
    "tr",
    # Each figure caption goes to a block.
    "figure",
    "figcaption",
    "img",
    # A division creates a new block.
    "div",
    # A horizontal line or line break create a block.
    "hr",
    "br",
}

_RETAIN_TAGS_DEFAULT = {
    "b",
    "i",
    "strong",
    "em",
}


def capture(
    name: str,
    _selector: xooxle.selector,
    retain_classes: set[str] = set(),
    retain_tags: set[str] = _RETAIN_TAGS_DEFAULT,
    retain_elements_for_classes: set[str] = set(),
    block_elements: set[str] = _BLOCK_ELEMENTS_DEFAULT,
    unit_tags: set[str] = set(),
) -> xooxle.capture:
    return xooxle.capture(
        name=name,
        _selector=_selector,
        retain_classes=retain_classes,
        retain_tags=retain_tags,
        retain_elements_for_classes=retain_elements_for_classes,
        block_elements=block_elements,
        unit_tags=unit_tags,
    )


def _is_crum_word(path: str) -> bool:
    return utils.stem(path).isdigit()


_CRUM_INDEX = xooxle.index(
    "site/data/xooxle/crum.json",
    xooxle.subindex(
        input="flashcards/data/output/web/a_coptic_dictionary__all_dialects/",
        include=_is_crum_word,
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
            xooxle.selector({"id": "marcion"}),
            xooxle.selector({"id": "categories"}, force=False),
        ],
        captures=[
            capture(
                "marcion",
                xooxle.selector({"id": "pretty"}),
                # This is the list of classes needed for highlighting. If the
                # highlighting rules change, you might have to add new classes!
                retain_classes=_CRUM_RETAIN_CLASSES,
                retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
            ),
            capture(
                "meaning",
                xooxle.selector({"id": "root-type-meaning"}, force=False),
                retain_classes=_CRUM_RETAIN_CLASSES,
                retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
            ),
            capture(
                "appendix",
                xooxle.selector(
                    {"name": "body"},
                ),
                retain_classes=_CRUM_RETAIN_CLASSES,
                retain_elements_for_classes=_CRUM_RETAIN_ELEMENTS_FOR_CLASSES,
                unit_tags={"tr", "div", "hr"},
                block_elements=_BLOCK_ELEMENTS_DEFAULT | {"td"},
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
            capture(
                "orths",
                xooxle.selector({"id": "orths"}),
                retain_classes=_KELLIA_RETAIN_CLASSES,
            ),
            capture(
                "senses",
                xooxle.selector({"id": "senses"}),
                retain_classes=_KELLIA_RETAIN_CLASSES,
            ),
            capture(
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
            capture(
                "front",
                xooxle.selector({"id": "front"}),
                retain_classes=_COPTICSITE_RETAIN_CLASSES,
            ),
            capture(
                "back",
                xooxle.selector({"id": "back"}),
            ),
        ],
        result_table_name="copticsite",
        href_fmt="",
    ),
)

INDEXES = [_CRUM_INDEX]
