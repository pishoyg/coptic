import re

import deck
import enforcer
import field
import type_enforced

CRUM_FMT = '<span class="crum-page">{crum}</span>'
CRUM_EXTERNAL_FMT = '<span class="crum-page-external">{crum}</span>'
PARENT_URL = "https://pishoyg.github.io/crum"
HOME = "https://github.com/pishoyg/coptic/"
EMAIL = "pishoybg@gmail.com"

DICTIONARY_PAGE_RE = re.compile("([0-9]+(a|b))")
COPTIC_WORD_RE = re.compile("([Ⲁ-ⲱϢ-ϯⳈⳉ]+)")
GREEK_WORD_RE = re.compile("([Α-Ωα-ω]+)")

CRUM_JS = """
    // Handle 'crum-page' class.
    var els = document.getElementsByClassName('crum-page');
    Array.prototype.forEach.call(els, function(btn) {
        btn.classList.add('link');
        btn.onclick = () => {
            document.getElementById('crum' + btn.innerHTML.slice(0, -1)).scrollIntoView();
        };
    });

    // Handle 'crum-page-external' class.
    var els = document.getElementsByClassName('crum-page-external');
    Array.prototype.forEach.call(els, function(btn) {
        btn.classList.add('link');
        btn.onclick = () => {
            window.open(
                'https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID='
                + btn.innerHTML, '_blank').focus();
        };
    });

    // Handle 'coptic' class.
    var els = document.getElementsByClassName('coptic');
    Array.prototype.forEach.call(els, function(btn) {
        btn.classList.add('hover-link');
        btn.onclick = () => {
            window.open(
                'https://coptic-dictionary.org/results.cgi?quick_search='
                + btn.innerHTML, '_blank').focus();
        };
    });

    // Handle 'greek' class.
    var els = document.getElementsByClassName('greek');
    Array.prototype.forEach.call(els, function(btn) {
        btn.classList.add('link');
        btn.classList.add('light');
        btn.onclick = () => {
            window.open(
                'https://logeion.uchicago.edu/'
                + btn.innerHTML, '_blank').focus();
        };
    });

    // Handle 'dawoud' class.
    var els = document.getElementsByClassName('dawoud');
    Array.prototype.forEach.call(els, function(btn) {
        btn.classList.add('link');
        btn.onclick = () => {
            document.getElementById('dawoud' + btn.innerHTML.slice(0, -1)).scrollIntoView();
        };
    });

    // Handle the 'dialect' class.
    const dialects = ['S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'];
    const dialectStyle = new Map();
    dialects.forEach((d) => {
        dialectStyle.set(d, 'normal');
    });
    function toggle(d) {
        dialectStyle.set(
            d,
            dialectStyle.get(d) == 'normal' ? 'bold' : 'normal');
    }
    function shouldBold(el) {
        for (var i in dialects) {
            if (dialectStyle.get(dialects[i]) == 'bold' &&
                el.classList.contains(dialects[i])) {
                return true;
            }
        }
        return false;
    }
    function dialected(el) {
        return dialects.some((d) => {
            return el.classList.contains(d);
        });
    }
    var els = document.getElementsByClassName('dialect');
    function dialect(d) {
        toggle(d);
        document.querySelectorAll('.word').forEach((el) => {
            if (!dialected(el)) {
                return;
            }
            if (shouldBold(el)) {
                el.classList.remove('very-light');
                el.classList.add('bold');
            } else {
                el.classList.remove('bold');
                el.classList.add('very-light');
            }
        });
        navigateQuery = "?d=" + dialects.filter((d) => {
            return dialectStyle.get(d) == 'bold';
        }).join(',');
        document.querySelectorAll('.navigate').forEach((el) => {
            const url = new URL(el.getAttribute('href'));
            url.searchParams.delete('d');
            el.setAttribute('href', url.toString() + navigateQuery);
        });
    }
    Array.prototype.forEach.call(els, (btn) => {
        btn.classList.add('hover-link');
        btn.onclick = () => { dialect(btn.innerHTML); };
    });
    (new URLSearchParams(window.location.search)).get('d').split(',').forEach(
        dialect);
"""

CRUM_CSS = """
 .bordered {
     border:1px solid black;
}
 .card {
     font-size: 18px;
}
 .center {
     text-align: center;
}
 .front {
     text-align: center;
}
 .hover-link:hover {
     color: blue;
     cursor: pointer;
     text-decoration: underline;
}
 .left {
     float: left;
}
 .light {
     opacity:0.7;
}
 .link {
     color: blue;
     cursor: pointer;
     text-decoration: underline;
}
 .nightMode .bordered {
     border:1px solid white;
}
 .right {
     float:right;
}
 .very-light {
     opacity:0.3;
}
 figure figcaption {
     text-align: center;
}
 figure img {
     vertical-align: top;
}
 figure {
     border: 1px transparent;
     display: inline-block;
     margin: 10px;
}
"""


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def crum(
    deck_name: str, deck_id: int, dialect_cols: list[str], force_front: bool = True
) -> deck.deck:

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def roots_col(
        col_name: str, line_br: bool = False, force: bool = True
    ) -> field.tsvs:
        return field.tsvs(
            "dictionary/marcion.sourceforge.net/data/output/tsvs/roots.tsvs",
            col_name,
            line_br=line_br,
            force=force,
        )

    def dawoud_col(
        col_name: str, line_br: bool = False, force: bool = True
    ) -> field.tsv:
        return field.tsv(
            "dictionary/marcion.sourceforge.net/data/marcion-dawoud/marcion_dawoud.tsv",
            col_name,
            line_br=line_br,
            force=force,
        )

    # TODO: This replaces all Coptic words, regardless of whether they
    # represent plain text. Coptic text that occurs inside a tag (for example
    # as a tag property) would still get wrapped inside this <span> tag.
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def cdo(text: str) -> str:
        return COPTIC_WORD_RE.sub(
            r'<span class="coptic">\1</span>',
            text,
        )

    # TODO: This replaces all Greek words, regardless of whether they
    # represent plain text. Greek text that occurs inside a tag (for example
    # as a tag property) would still acquire this tag.
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def greek(text: str) -> str:
        return GREEK_WORD_RE.sub(
            r'<span class="greek">\1</span>',
            text,
        )

    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def create_front() -> field.Field:
        if len(dialect_cols) == 1:
            return roots_col(dialect_cols[0], line_br=True, force=False)

        def dialect(col: str) -> field.Field:
            return field.aon(
                '<span class="left">',
                "(",
                "<b>",
                col[col.find("-") + 1 :],
                "</b>",
                ")",
                "</span>",
                "<br/>",
                roots_col(col, line_br=True, force=False),
            )

        return field.jne("<br/>", *[dialect(col) for col in dialect_cols])

    explanatory_images = field.dir_lister(
        "dictionary/marcion.sourceforge.net/data/img-300",
        lambda file: file[: file.find("-")],
    )
    pronunciations = {
        col: field.dir_lister(
            f"dictionary/marcion.sourceforge.net/data/snd-pishoy/{col}/",
            lambda file: file[: file.find(".")],
        )
        for col in dialect_cols
    }
    return deck.deck(
        # N.B. The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=f"{HOME}.\n{EMAIL}.",
        css=CRUM_CSS,
        javascript=CRUM_JS,
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=roots_col("key", force=True),
        front=field.apl(cdo, create_front()),
        back=field.apl(
            cdo,
            field.cat(
                # Type and Crum page.
                field.cat(
                    field.fmt(
                        "(<b>{type_parsed}</b>)",
                        {"type_parsed": roots_col("type-parsed", force=True)},
                    ),
                    field.fmt(
                        f'<span class="right"><b>Crum: </b>{CRUM_FMT}</span>',
                        {
                            "crum": roots_col("crum", force=True),
                        },
                    ),
                    "<br/>",
                ),
                # Meaning.
                field.aon(
                    field.apl(greek, roots_col("en-parsed", line_br=True, force=False)),
                    "<br/>",
                ),
                # Image.
                field.img(
                    keys=field.tsvs(
                        tsvs="dictionary/marcion.sourceforge.net/data/output/tsvs/roots.tsvs",
                        column_name="key",
                    ),
                    # Although the same result can be obtained using
                    # glob.glob(f"dictionary/marcion.sourceforge.net/data/img-300/{key}-*")
                    # we use this method in order to avoid using the computationally expensive
                    # glob.glob.
                    get_paths=explanatory_images.get,
                    sort_paths=field.sort_semver,
                    fmt_args=lambda path: {
                        "caption": field.stem(path),
                        "id": "explanatory" + field.stem(path),
                        "alt": field.stem(path),
                    },
                    caption=True,
                    id=True,
                    force=False,
                ),
                # Editor's notes.
                field.aon(
                    "<i>Editor's Note: </i>",
                    field.tsv(
                        file_path="dictionary/marcion.sourceforge.net/data/notes/notes.tsv",
                        column_name="notes",
                        line_br=True,
                        force=False,
                    ),
                    "<br/>",
                ),
                # Horizontal line.
                "<hr/>",
                # Full entry.
                roots_col("word-parsed-no-ref", line_br=True, force=True),
                # Derivations.
                field.apl(
                    greek, roots_col("derivations-table", line_br=True, force=False)
                ),
                # Crum's pages.
                field.cat(
                    "<hr/>",
                    field.img(
                        keys=field.tsvs(
                            tsvs="dictionary/marcion.sourceforge.net/data/output/tsvs/roots.tsvs",
                            column_name="crum-pages",
                            force=False,  # TODO: Why is this not enforced? Is it the Nag Hammadi words?
                        ),
                        get_paths=lambda page_ranges: [
                            f"dictionary/marcion.sourceforge.net/data/crum/{k+20}.png"
                            for k in field.page_numbers(page_ranges=page_ranges)
                        ],
                        sort_paths=field.sort_semver,
                        fmt_args=lambda path: {
                            "caption": CRUM_EXTERNAL_FMT.format(
                                crum=int(field.stem(path)) - 20
                            ),
                            "id": f"crum{int(field.stem(path)) - 20}",
                            "alt": int(field.stem(path)) - 20,
                        },
                        caption=True,
                        id=True,
                        force=False,
                    ),
                ),
                # Dawoud's pages.
                field.aon(
                    "<hr/>",
                    '<span class="right">',
                    "<b>Dawoud: </b>",
                    field.apl(
                        lambda pages: DICTIONARY_PAGE_RE.sub(
                            r'<span class="dawoud">\1</span>', pages
                        ),
                        field.grp(
                            keys=roots_col("key", force=True),
                            group_by=dawoud_col("key", force=True),
                            selected=field.xor(
                                dawoud_col("dawoud-pages-redone", force=False),
                                dawoud_col("dawoud-pages", force=False),
                            ),
                            force=False,
                            unique=True,
                        ),
                    ),
                    "</span>",
                    "<br/>",
                    field.img(
                        field.grp(
                            keys=roots_col("key", force=True),
                            group_by=dawoud_col("key", force=True),
                            selected=field.xor(
                                dawoud_col("dawoud-pages-redone", force=False),
                                dawoud_col("dawoud-pages", force=False),
                            ),
                            force=False,
                            unique=True,
                        ),
                        get_paths=lambda page_ranges: [
                            f"dictionary/copticocc.org/dawoud-D100/{k+16}.jpg"
                            for k in field.page_numbers(page_ranges=page_ranges)
                        ],
                        fmt_args=lambda path: {
                            "caption": int(field.stem(path)) - 16,
                            "id": f"dawoud{int(field.stem(path)) - 16}",
                            "alt": int(field.stem(path)) - 16,
                        },
                        caption=True,
                        id=True,
                        force=False,
                    ),
                ),
                # Audio.
                # TODO: Label the per-dialect audios, like you did for the front.
                # If this deck contains multiple dialects, it won't be clear for
                # the user which audios belong to which dialect!
                # Note: The use of nested all-or-nothing and concatenate fields
                # here is intentional. It may not be obvious now, but this
                # structure will be necessary if we want to include more audio
                # authors.
                field.aon(
                    "<hr/>",
                    field.cat(
                        # Pishoy's pronunciation.
                        field.aon(
                            "Pishoy: ",
                            field.cat(
                                *[
                                    field.snd(
                                        keys=field.tsvs(
                                            tsvs="dictionary/marcion.sourceforge.net/data/output/tsvs/roots.tsvs",
                                            column_name="key",
                                        ),
                                        get_paths=pronunciations[col].get,
                                        sort_paths=sorted,
                                        force=False,
                                    )
                                    for col in dialect_cols
                                ],
                            ),
                        ),
                    ),
                ),
                # Footer.
                field.cat(
                    # TODO: Update the home page, it will no longer be the repo.
                    f"""<table class="bordered" style="width: 100%; table-layout: fixed;"> <tr> <td><a href="{HOME}">Home</a></td> <td>""",
                    field.aon(
                        f'<a class="navigate" href="{PARENT_URL}/',
                        roots_col("key-prev", force=False),
                        '.html">prev</a>',
                    ),
                    field.fmt(
                        """ </td> <td><b>Key: </b><a href="{key_link}">{key}</a></td> <td>""",
                        {
                            "key": roots_col("key", force=True),
                            "key_link": roots_col("key-link", force=True),
                        },
                    ),
                    field.aon(
                        f'<a class="navigate" href="{PARENT_URL}/',
                        roots_col("key-next", force=False),
                        '.html">next</a>',
                    ),
                    f"""</td> <td><a href="mailto:{EMAIL}">Contact</a></td> </tr> </table>""",
                ),
            ),
        ),
        title=roots_col("word-title"),
        force_front=force_front,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def copticsite_com(deck_name: str, deck_id: int) -> deck.deck:
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def col(col_name: str, line_br: bool = False, force: bool = True) -> field.tsvs:
        return field.tsvs(
            "dictionary/copticsite.com/data/output/tsvs/output.tsvs",
            col_name,
            line_br=line_br,
            force=force,
        )

    return deck.deck(
        # N.B. The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=f"{HOME}\n{EMAIL}",
        css=".card { text-align: center; font-size: 18px; }",
        javascript="",
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=field.seq(),
        front=col("prettify", force=False),
        back=field.cat(
            field.aon(
                "(",
                "<b>",
                field.jne(
                    " - ",
                    col("Word Kind", force=False),
                    col("Word Gender", force=False),
                    col("Origin", force=False),
                ),
                "</b>",
                ")",
                "<br/>",
            ),
            col("Meaning", line_br=True, force=False),
        ),
        title=field.txt("", force=False),
        force_front=False,
        force_back=False,
        force_title=False,
        key_for_title=True,
    )


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def kellia(deck_name: str, deck_id: int, basename: str) -> deck.deck:
    @type_enforced.Enforcer(enabled=enforcer.ENABLED)
    def col(col_name: str, line_br: bool = False, force: bool = True) -> field.tsvs:
        return field.tsvs(
            f"dictionary/kellia.uni-goettingen.de/data/output/tsvs/{basename}.tsvs",
            col_name,
            line_br=line_br,
            force=force,
        )

    return deck.deck(
        # N.B. The deck name is a protected field.
        deck_name=deck_name,
        deck_id=deck_id,
        deck_description=f"{HOME}\n{EMAIL}",
        css=".card { font-size: 18px; }"
        ".table { display: block; width: 100%; text-align: center; }"
        ".orth { min-width: 120px; }"
        ".geo { text-align: center; color: darkred; min-width: 40px; }"
        ".gram_grp { color: gray; font-style: italic; }"
        ".sense_n { display: none; }"
        ".sense_id { display: none; }"
        ".quote { }"
        ".definition { }"
        ".bibl { color: gray; float: right; text-align: right; min-width: 100px; }"
        ".ref { color: gray; }"
        ".meaning { min-width: 220px; }"
        ".ref_xr { }"
        ".xr { color: gray; }"
        ".lang { color: gray }",
        javascript="",
        # N.B. The key is a protected field. Do not change unless you know what
        # you're doing.
        key=col("entry_xml_id"),
        front=col("orthstring-pishoy", line_br=True),
        back=field.cat(
            field.cat(
                col("merged-pishoy", line_br=True),
                col("etym_string-processed", line_br=True, force=False),
                "<hr/>",
            ),
            field.aon(
                "Coptic Dictionary Online: ",
                '<a href="',
                col("cdo"),
                '">',
                col("entry_xml_id"),
                "</a>",
            ),
        ),
        title=field.txt("", force=False),
        force_title=False,
        key_for_title=True,
    )


# N.B. The deck IDs are protected fields. They are used as database keys for the
# decks. Do NOT change them!
#
# The deck names are protected fields. Do NOT change them. They are used for:
# 1. Display in the Anki UI, including nesting.
# 2. Prefixes for the note keys, to prevent collisions between notes in
#    different decks.
# 3. Model names (largely irrelevant).
#
# N.B. If the `name` argument is provided, it overrides the first use case
# (display), but the deck names continue to be used for prefixing and model
# names.
# It's for the second reason, and to a lesser extend the first as well, that
# the names should NOT change. If the DB keys diverge, synchronization will
# mess up the data! Importing a new deck will result in the notes being
# duplicated rather than replaced or updated.

# N.B. Besides the constants hardcoded below, the "name" and "key" fields in
# the deck generation logic are also protected.
# The "name" argument is used to generate deck names for datasets that generate
# multiple decks.
# The "key" field is used to key the notes.

CRUM_BOHAIRIC = "A Coptic Dictionary::Bohairic"
CRUM_SAHIDIC = "A Coptic Dictionary::Sahidic"
CRUM_BOHAIRIC_SAHIDIC = "A Coptic Dictionary::Bohairic / Sahidic"
CRUM_ALL = "A Coptic Dictionary::All Dialects"
COPTICSITE_NAME = "copticsite.com"
KELLIA_COMPREHENSIVE = "KELLIA::Comprehensive"
KELLIA_EGYPTIAN = "KELLIA::Egyptian"
KELLIA_GREEK = "KELLIA::Greek"


@type_enforced.Enforcer(enabled=enforcer.ENABLED)
def file_name(deck_name: str) -> str:
    """
    Given a deck name, return a string that is valid as a file name. Remove
    invalid characters, and make it filename-like.
    """
    return deck_name.lower().replace(" ", "_").replace(":", "_").replace("/", "-")


LAMBDAS: dict[str, enforcer.Callable] = {
    CRUM_ALL: lambda deck_name: crum(
        deck_name,
        1284010387,
        ["word-parsed-prettify"],
    ),
    CRUM_BOHAIRIC: lambda deck_name: crum(
        deck_name, 1284010383, ["dialect-B"], force_front=False
    ),
    CRUM_SAHIDIC: lambda deck_name: crum(
        deck_name, 1284010386, ["dialect-S"], force_front=False
    ),
    CRUM_BOHAIRIC_SAHIDIC: lambda deck_name: crum(
        deck_name,
        1284010390,
        ["dialect-B", "dialect-S"],
        force_front=False,
    ),
    COPTICSITE_NAME: lambda deck_name: copticsite_com(deck_name, 1284010385),
    KELLIA_COMPREHENSIVE: lambda deck_name: kellia(
        deck_name, 1284010391, "comprehensive"
    ),
    KELLIA_EGYPTIAN: lambda deck_name: kellia(deck_name, 1284010392, "egyptian"),
    KELLIA_GREEK: lambda deck_name: kellia(deck_name, 1284010393, "greek"),
}
