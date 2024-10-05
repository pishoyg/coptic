import xooxle

_CRUM_INDEX = xooxle.index(
    "site/data/xooxle/crum.json",
    xooxle.subindex(
        input="flashcards/data/output/web/a_coptic_dictionary__all_dialects/",
        extract=[
            xooxle.htmlSelector({"name": "title"}, force=False),
            xooxle.htmlSelector({"class_": "header"}, force=False),
            xooxle.htmlSelector({"class_": "dictionary"}, force=False),
            xooxle.htmlSelector({"class_": "crum"}, force=False),
            xooxle.htmlSelector({"class_": "crum-page"}, force=False),
            xooxle.htmlSelector({"class_": "crum-page-external"}, force=False),
            xooxle.htmlSelector({"class_": "dawoud"}, force=False),
            xooxle.htmlSelector({"class_": "dawoud-page"}, force=False),
            xooxle.htmlSelector(
                {"class_": "dawoud-page-external"},
                force=False,
            ),
            xooxle.htmlSelector({"class_": "drv-key"}, force=False),
            xooxle.htmlSelector({"class_": "explanatory-key"}, force=False),
            xooxle.htmlSelector({"class_": "nag-hammadi"}, force=False),
        ],
        captures=[
            xooxle.capture(
                "marcion",
                xooxle.htmlSelector({"id": "marcion"}),
                raw=True,
            ),
            xooxle.capture(
                "meaning",
                xooxle.htmlSelector({"id": "meaning"}, force=False),
                raw=False,
            ),
            xooxle.capture(
                "text",
                xooxle.htmlSelector(
                    {"name": "body"},
                ),
                raw=False,
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
            xooxle.htmlSelector({"name": "footer"}, force=False),
            xooxle.htmlSelector({"class_": "bibl"}, force=False),
            xooxle.htmlSelector({"class_": "ref_xr"}, force=False),
            xooxle.htmlSelector({"class_": "ref"}, force=False),
        ],
        captures=[
            xooxle.capture(
                "orths",
                xooxle.htmlSelector({"id": "orths"}),
                raw=True,
            ),
            xooxle.capture(
                "senses",
                xooxle.htmlSelector({"id": "senses"}),
                raw=True,
            ),
            xooxle.capture(
                "text",
                xooxle.htmlSelector(
                    {"name": "body"},
                ),
                raw=False,
            ),
        ],
        result_table_name="kellia",
        view=False,
        path_prefix="https://coptic-dictionary.org/entry.cgi?tla=",
        retain_extension=False,
    ),
)

INDEXES = [
    _CRUM_INDEX,
]
