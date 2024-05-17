import argparse
import glob
import hashlib
import os
import re
import shutil
import tempfile

import genanki
import numexpr
import pandas as pd
import pillow_avif
import type_enforced
from PIL import Image

# Pillow might be tricky for our requirements generators. You might have to add
# it to requirements.txt manually.

INTEGER_RE = re.compile("[0-9]+")
NUMEXPR_RE = re.compile(r"numexpr\((.*)\)")
MAX_INTEGER_LENGTH = 10
MAX_ID = 1 << 31


@type_enforced.Enforcer
def hash(text: str) -> int:
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest(), 17) % MAX_ID


@type_enforced.Enforcer
def path_sort_key(path: str) -> list[str]:
    path = os.path.basename(path)
    return [x.zfill(MAX_INTEGER_LENGTH) for x in INTEGER_RE.findall(path)] + [path]


MAX_THUMBNAIL_HEIGHT = 100000

argparser = argparse.ArgumentParser(
    formatter_class=argparse.RawTextHelpFormatter,
    description="""
Generate an Anki package collection.

Please read carefully as this defines the format for the flag values.

- TSV::${FILE_PATH}::${COLUMN_NAME}

  Use data from the column named ${COLUMN_NAME} in the TSV found at path
  ${PATH}.

- TXT::${PLAIN_TEXT}

  A plain text entry.

- IMG::${TSV_FILE_PATH}::${KEY_COLUMN_NAME}::${DIR_PATH}::${FILE_NAME_FMT}::${CAPTION_SOURCE}::${WIDTH}

  Images. Retrieve keys from the column named ${KEY_COLUMN_NAME} in the TSV
  found at ${TSV_FILE_PATH}. The images are to be found at:
    ${DIR_PATH}/format(${FILE_NAME_FMT}, key=key)
  The FILE_NAME_FMT can use the "{key}" string for key substitutions. If the
  string numexpr(.*) were to be found inside ${FILE_NAME_FMT}, we perform a
  number expression as well. If this were the case, it's allowed to exist only
  once, with a single pair of parentheses, to allow simple parsing behavior
  that should suffice for most use cases.
  The final format string is allowed to have a glob pattern to fetch multiple
  files.

  For example, consider the following entry:

  - IMG::marcion.tsv::crum-page-number::crum/::numexpr({key}+17).jpg

    This results in the retrieval of a list of keys from the file at
    "marcion.tsv", and for each entry in the "crum-page-number" column, we
    retrieve the image at "crum/numexpr({key}+17).png". For example, for key 1,
    we will retrieve "crum/18.png".

  - IMG::marcion.tsv::key::img/{key}-*.*

    This results in the retrieval of a list of keys from the file at
    "marcion.tsv", and for each key in the "key" column, we retrieve all the
    images that match the pattern "{key}-*.*". For example, for `key=1`, all
    the following will be included if found: 1-1.png, 1-2.png, 1-1-1.jpg, ...

  ${WIDTH} (optionally) gives the image width.

- FIL::${TSV_FILE_PATH}::${KEY_COLUMN_NAME}::${DIR_PATH}::${FILE_NAME_FMT}

  Files that will be imported and embedded. Use this for plain text or HTML
  content.

N.B. The length of the TSV columns must match.

Exporting several decks:
    - Prefix the fields with a deck index.

Fields groups (all-or-nothing group of fields):
    - Prefix the fields with the field group index. This is optional.

Image / file sorting:
  TL;DR: Use integer sections in your file names to control the order.
  For example, "{key}-1-1.txt", "{key}-1-2.txt", "{key}-3-4.txt".

  The files will be sorted in the output based first on the integers contained
  within the name, then lexicographically. For example, the following are
  possible orders produced by our sorting algorithm:
      - ["1.png", "2.png", ..., "11.png"],
      - ["1-1.png", "1-2.png", "2-1.png", "2-2.png"]
      - ["b1.txt", "a2.txt"]
      - ["a.txt", "b.txt"]
  The string "11" is lexicographically smaller than the string "2", but the
  integer 11 is lexicographically larger, which is why it appears later.
  Similarly, even though "b" is lexicographically larger than "a", we
  prioritize the integers, so we bring "b1" before "a2".
  If the string doesn't contain any integers, pure lexicographical ordering
  will be used.
""",
)


argparser.add_argument(
    "--key",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        "1::TSV::../marcion.sourceforge.net/data/output/roots.tsv::key",
        # 2. The Bible.
        "2::01::TXT::(",
        "2::01::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::book",
        "2::01::TXT:: ",
        "2::01::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::chapter",
        "2::01::TXT:::",
        "2::01::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::verse",
        "2::01::TXT::)",
    ],
    help="This is a critical field. The note keys will be used as database"
    " keys to enable synchronization. It is important for the keys to be (1)"
    " unique, and (2) persistent. Use a different key for each note. And do"
    " not change the names liberally between different version of the code"
    " and the generated package."
    " The note keys must also be unique across decks.",
)

argparser.add_argument(
    "--front",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        "1::1::TSV::../marcion.sourceforge.net/data/output/roots.tsv::dialect-B",
        # 2. The Bible.
        "2::1::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::Bohairic",
    ],
    help="Format of the card fronts. See description for syntax.",
)

argparser.add_argument(
    "--back",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        # Front side.
        '1::01::TXT::<div id="front">',
        "1::01::TSV::../marcion.sourceforge.net/data/output/roots.tsv::dialect-B",
        "1::01::TXT::</div>",
        "1::01::TXT::<hr>",
        # Type.
        "1::02::TXT::(",
        "1::02::TXT::<b>",
        "1::02::TSV::../marcion.sourceforge.net/data/output/roots.tsv::type-parsed",
        "1::02::TXT::</b>",
        "1::02::TXT::)",
        "1::02::TXT::<br>",
        # Meaning.
        "1::03::TSV::../marcion.sourceforge.net/data/output/roots.tsv::en-parsed-no-greek",
        "1::03::TXT::<br>",
        # Image.
        "1::04::IMG::../marcion.sourceforge.net/data/output/roots.tsv::key::../marcion.sourceforge.net/data/img::{key}-*.*::STEM::300",
        # Horizonal line.
        "1::05::TXT::<hr>",
        # Full entry.
        "1::06::TXT::<b>Word:</b>",
        "1::06::TXT::<br>",
        "1::06::TSV::../marcion.sourceforge.net/data/output/roots.tsv::word-parsed-no-ref",
        "1::06::TXT::<hr>",
        # Full meaning.
        "1::07::TXT::<b>Meaning:</b>",
        "1::07::TXT::<br>",
        "1::07::TSV::../marcion.sourceforge.net/data/output/roots.tsv::en-parsed",
        "1::07::TXT::<hr>",
        # Crum's entry.
        "1::08::TXT::<b>Crum: </b>",
        "1::08::TSV::../marcion.sourceforge.net/data/output/roots.tsv::crum",
        "1::08::TXT::<br>",
        "1::08::IMG::../marcion.sourceforge.net/data/output/roots.tsv::crum-pages::../marcion.sourceforge.net/data/crum::numexpr({key}+20).png::KEY",
        "1::08::TXT::<hr>",
        # Marcion's key.
        "1::09::TXT::<b>Key: </b>",
        "1::09::TSV::../marcion.sourceforge.net/data/output/roots.tsv::key",
        # 2. The Bible.
        # Bohairic.
        '2::01::TXT::<div id="front">',
        "2::01::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::Bohairic",
        "2::01::TXT::</div>",
        "2::01::TXT::<hr>",
        # Reference.
        "2::02::TXT::(",
        "2::02::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::book",
        "2::02::TXT:: ",
        "2::02::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::chapter",
        "2::02::TXT:::",
        "2::02::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::verse",
        "2::02::TXT::)",
        "2::02::TXT::<br>",
        "2::02::TXT::<br>",
        # English.
        "2::03::TXT::<b>English:</b>",
        "2::03::TXT::<br>",
        "2::03::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::English",
        "2::03::TXT::<br>",
        "2::03::TXT::<br>",
        # Sahidic.
        "2::04::TXT::<b>Sahidic:</b>",
        "2::04::TXT::<br>",
        "2::04::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::Sahidic",
        "2::04::TXT::<br>",
        "2::04::TXT::<br>",
        # Fayyumic.
        "2::05::TXT::<b>Fayyumic:</b>",
        "2::05::TXT::<br>",
        "2::05::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::Fayyumic",
        "2::05::TXT::<br>",
        "2::05::TXT::<br>",
        # Akhmimic.
        "2::06::TXT::<b>Akhmimic:</b>",
        "2::06::TXT::<br>",
        "2::06::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::Akhmimic",
        "2::06::TXT::<br>",
        "2::06::TXT::<br>",
        # OldBohairic.
        "2::07::TXT::<b>OldBohairic:</b>",
        "2::07::TXT::<br>",
        "2::07::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::OldBohairic",
        "2::07::TXT::<br>",
        "2::07::TXT::<br>",
        # Mesokemic.
        "2::08::TXT::<b>Mesokemic:</b>",
        "2::08::TXT::<br>",
        "2::08::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::Mesokemic",
        "2::08::TXT::<br>",
        "2::08::TXT::<br>",
        # DialectP.
        "2::09::TXT::<b>DialectP:</b>",
        "2::09::TXT::<br>",
        "2::09::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::DialectP",
        "2::09::TXT::<br>",
        "2::09::TXT::<br>",
        # Lycopolitan.
        "2::10::TXT::<b>Lycopolitan:</b>",
        "2::10::TXT::<br>",
        "2::10::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::Lycopolitan",
        "2::10::TXT::<br>",
        "2::10::TXT::<br>",
        # Greek.
        "2::11::TXT::<b>Greek:</b>",
        "2::11::TXT::<br>",
        "2::11::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::Greek",
    ],
    help="Format of the card backs. See description for syntax.",
)

argparser.add_argument(
    "--model_name",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        "1::TXT::Dictionary",
        # 2. The Bible.
        "2::TXT::Bible",
    ],
    help="Model name in the generated Anki package.",
)

argparser.add_argument(
    "--model_id",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        "1::TXT::1284010383",
        # 2. The Bible.
        "2::TXT::1284010384",
    ],
    help="Deck ID in the generated Anki package.",
)
argparser.add_argument(
    "--css",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        "1::TXT::.card { font-size: 18px; }",
        "1::TXT::#front { text-align: center; }",
        "1::TXT::figure { display: inline-block; border: 1px transparent; margin: 10px; }",
        "1::TXT::figure figcaption { text-align: center; }",
        "1::TXT::figure img { vertical-align: top; }",
        # 2. The Bible.
        "2::TXT::.card { font-size: 18px; }",
    ],
    help="Global CSS. Please notice that the front will be given the id"
    ' "front" and the back will have the id "back". You can use these IDs if'
    " you want to make your CSS format side-specific."
    " Only TXT fields are allowed for this flag.",
)

argparser.add_argument(
    "--deck_name",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        "1::1::TXT::Crum: Bohairic Dictionary",
        # 2. The Bible.
        "2::1::TXT::Bible",
        "2::1::TXT:::",
        "2::1::TXT:::",
        "2::1::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::book",
        "2::1::TXT:::",
        "2::1::TXT:::",
        "2::1::TSV::../../bible/stshenouda.org/data/output/csv/bible.csv::chapter",
    ],
    help="Deck name in the generated Anki package."
    " N.B. If a deck ID is not"
    " given, a hash of this field will be used to key the decks. Thus, it is"
    " important to ensure that the deck names are (1) unique, and"
    " (2) persistent. Use a different deck name for each deck that you want to"
    " support. And do not change the names liberally between different version"
    " of the code and the generated package.",
)

argparser.add_argument(
    "--deck_id",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        "1::TXT::1284010383",
        # 2. The Bible.
        "2::TXT::",
    ],
    help="Deck ID in the generated Anki package.",
)

argparser.add_argument(
    "--deck_description",
    type=str,
    nargs="*",
    default=[
        # 1. The Dictionary.
        """1::TXT::URL: https://github.com/pishoyg/coptic/.
    Contact: pishoybg@gmail.com.""",
        # 2. The Bible.
        """2::TXT::URL: https://github.com/pishoyg/coptic/.
    Contact: pishoybg@gmail.com.""",
    ],
    help="Deck description in the generated Anki package. Only TXT fields are"
    " allowed here.",
)

argparser.add_argument(
    "--output",
    type=str,
    default="data/coptic.apkg",
    help="Path to the output collection.",
)

args = argparser.parse_args()


class field:

    @type_enforced.Enforcer
    def __init__(self, content: None | list[str], media_files: list[str]):
        self._content = content
        self._counter = 0
        self._media_files = media_files

    @type_enforced.Enforcer
    def media_files(self) -> list[str]:
        return self._media_files

    @type_enforced.Enforcer
    def next(self) -> str:
        ans = self._content[self._counter]
        self._counter += 1
        return ans

    @type_enforced.Enforcer
    def length(self) -> int:
        return len(self._content)

    @type_enforced.Enforcer
    def _use_html_line_breaks(self, text: str) -> str:
        text = str(text)
        return text.replace("\n", "<br>")

    @type_enforced.Enforcer
    def _substitute_key_and_numexpr(self, file_name_fmt: str, key: str) -> str:
        file_name_fmt = file_name_fmt.format(key=key)
        match = NUMEXPR_RE.match(file_name_fmt)
        if not match:
            return file_name_fmt
        expr = numexpr.evaluate(match.group(1)).item()
        return NUMEXPR_RE.sub(str(expr), file_name_fmt)

    @type_enforced.Enforcer
    def _glob(self, dir_path: str, file_name_fmt: str, cs_keys: str) -> list[str]:
        paths = set()
        for key in cs_keys.split(","):
            pattern = self._substitute_key_and_numexpr(file_name_fmt, key)
            pattern = os.path.join(dir_path, pattern)
            paths.update(glob.glob(pattern))
        return list(sorted(paths, key=path_sort_key))

    @type_enforced.Enforcer
    def _read_tsv_column(self, file_path: str, column_name: str) -> list[str]:
        df = pd.read_csv(file_path, sep="\t", encoding="utf-8").fillna("")
        return list(map(str, df[column_name]))


@type_enforced.Enforcer
def new_field(spec: str, work_dir: str):
    field_type = spec[:3]
    assert spec[3:5] == "::", spec
    spec = spec[5:].split("::")
    if field_type == "TXT":
        return txt(spec, work_dir)
    if field_type == "TSV":
        return tsv(spec, work_dir)
    if field_type == "IMG":
        return img(spec, work_dir)
    if field_type == "FIL":
        return fil(spec, work_dir)
    if field_type == "XOR":
        return xor(spec, work_dir)
    raise ValueError("Unknown filed type: {}".format(field_type))


class xor(field):
    @type_enforced.Enforcer
    def __init__(self, spec: list[str], work_dir: str):
        components = "::".join(spec).split("::::")
        components = [new_field(c, work_dir) for c in components]

        length = components[0].length()
        assert all(c.length() == length for c in components)
        assert length != -1

        content = []
        for _ in range(length):
            next = [c.next() for c in components]
            next = list(filter(None, next))
            content.append(next[0])

        media_files = set()
        for c in components:
            media_files.update(c.media_files())
        media_files = list(media_files)

        super().__init__(content, media_files)


class txt(field):
    @type_enforced.Enforcer
    def __init__(self, spec: list[str], _):
        assert len(spec) == 1, spec
        self._text = self._use_html_line_breaks(spec[0])
        super().__init__(None, [])

    @type_enforced.Enforcer
    def next(self) -> str:
        return self._text

    @type_enforced.Enforcer
    def length(self) -> int:
        return -1

    @type_enforced.Enforcer
    def str(self) -> str:
        return self._text


class seq(field):
    @type_enforced.Enforcer
    def __init__(self, spec: list[str], _):
        self._cur = 0
        if spec:
            assert len(spec) == 1, spec
            self._cur = int(spec)
        super().__init__(None, [])

    @type_enforced.Enforcer
    def next(self) -> str:
        ans = self._cur
        self._cur += 1
        return str(ans)

    @type_enforced.Enforcer
    def length(self) -> int:
        return -1


class tsv(field):
    @type_enforced.Enforcer
    def __init__(self, spec: list[str], _):
        file_path, column_name = spec
        content = self._read_tsv_column(file_path, column_name)
        content = map(str, content)
        content = list(map(self._use_html_line_breaks, content))
        super().__init__(content, [])


class img(field):

    @type_enforced.Enforcer
    def __init__(self, spec: list[str], work_dir: str):
        """
        The "src" field of the <img> HTML tag must bear basenames. Directories
        are not allowed. This implies that all basenames must be unique.
        See github.com/kerrickstaley/genanki?tab=readme-ov-file#media-files.

        We have images from multiple source directories, and their basenames
        could be conflicting.
        We solve this problem by doing the following:
        We copy all files to a temporary working, assigning them unique
        basenames. We use the new basenames in our HTML. We pass the files in
        the temporary directory to the package generator in order for the
        basenames to match, and we forget about the original paths and names.
        """

        assert len(spec) == 5 or len(spec) == 6
        file_path, column_name, dir_path, file_name_fmt, caption_source = spec[:5]
        html_fmt = '<img src="{basename}"><br>'
        width = None
        if len(spec) == 6:
            width = int(spec[5])
            html_fmt = '<img src="{{basename}}" width="{width}"><br>'
            html_fmt = html_fmt.format(width=width)
        html_fmt = (
            "<figure>"
            + html_fmt
            + "<figcaption> {caption} </figcaption> </figure> <br>"
        )

        # Each entry in the keys column is not a single key, but a
        # comma-separated list of key patterns.
        keys = self._read_tsv_column(file_path, column_name)

        content = []
        media_files = set()
        for cs_keys in keys:
            cur = ""
            for key in cs_keys.split(","):
                paths = self._glob(dir_path, file_name_fmt, key)
                for path in paths:
                    caption = self._get_caption(caption_source, key, path)
                    basename = path.replace("/", "_")
                    cur += html_fmt.format(basename=basename, caption=caption)
                    new_location = os.path.join(work_dir, basename)
                    media_files.add(new_location)
                    if width:
                        image = Image.open(path)
                        cur_width, _ = image.size
                        if cur_width > width:
                            image.thumbnail((width, MAX_THUMBNAIL_HEIGHT))
                        image.save(new_location)
                    else:
                        shutil.copyfile(path, new_location)
            content.append(cur)

        # Eliminate duplicate media file paths.
        media_files = list(media_files)
        super().__init__(content, media_files)

    @type_enforced.Enforcer
    def _get_caption(self, caption_source: str, key: str, path: str) -> str:
        if caption_source == "KEY":
            return key
        if caption_source == "STEM":
            stem, _ = os.path.splitext(os.path.basename(path))
            return stem
        raise ValueError(f"Unknown caption source: {caption_source}")


class fil(field):
    @type_enforced.Enforcer
    def __init__(self, spec: list[str], _):
        file_path, column_name, dir_path, file_name_fmt = spec
        keys = self._read_tsv_column(file_path, column_name)

        content = []
        for cs_keys in keys:
            paths = self._glob(dir_path, file_name_fmt, cs_keys)
            cur = ""
            for path in paths:
                with open(path) as f:
                    cur += f.read()
            cur = self._use_html_line_breaks(cur)
            content.append(cur)

        super().__init__(content, [])


@type_enforced.Enforcer
def num_entries(fields: list) -> int:
    cur = -1
    for f in fields:
        l = f.length()
        if l == -1:
            continue
        if cur == -1:
            cur = l
        assert cur == l
    return cur


@type_enforced.Enforcer
def chop_first_parameter(text: str):
    idx = text.find("::")
    return text[:idx], text[idx + 2 :]


@type_enforced.Enforcer
def group_by_index(
    side: list[str], allow_no_index: bool = False, use_pairs: bool = False
) -> dict | list:
    """
    N.B. The first parameter should consist of digits, but it will be returned
    as a string without conversion to an int.
    Given a list of strings that represent parameters, return a dictionary
    mapping the index to the list of parameters.
    For example:
        Input:
            [
                    "1:hello world",
                    "2:good morning",
                    "1:goodbye!",
            ]
        Output:
            {
                    1: ["hello world", "goodbye!"],
                    2: ["good morning"]
             }

    Args:

        side: List of strings that are made of delimiter-separated parameters,
        the delimiter being a pair of colons.

        allow_no_index: If the first parameter doesn't consist of digits (i.e.
        is not an id), should you throw an exception, or just use the empty
        string as an id for this entry?

        use_pairs: Whether the output should be a dictionary or a list of
        pairs.
    """

    pairs = []
    for spec in side:
        first, rem = chop_first_parameter(spec)
        if not first.isdigit():
            # No index found!
            assert allow_no_index
            first, rem = "", spec
        pairs.append((first, rem))
    if use_pairs:
        return pairs
    d = {pair[0]: [] for pair in pairs}
    for pair in pairs:
        d[pair[0]].append(pair[1])
    return d


@type_enforced.Enforcer
def weave_yarn(
    fields: list[str], work_dir: str, restrict_filed_types: list | None = None
):
    assert fields
    fields = group_by_index(fields, allow_no_index=True, use_pairs=True)
    assert all(len(pair) == 2 for pair in fields)
    # Each entry in `fields` consists of a field group key and a field object.
    fields = [(pair[0], new_field(pair[1], work_dir)) for pair in fields]
    if restrict_filed_types:
        for pair in fields:
            assert type(pair[1]) in restrict_filed_types

    num_notes = num_entries([pair[1] for pair in fields])

    content = []
    media_files = set()
    not_purged_at_least_once = set()
    for _ in range(num_notes if num_notes != -1 else 1):
        next = [(pair[0], pair[1].next()) for pair in fields]
        purged = set()
        for pair in next:
            # The empty string is special. It's never purged.
            if (not pair[0]) or pair[1]:
                not_purged_at_least_once.add(pair[0])
            else:
                purged.add(pair[0])
        next = [pair[1] for pair in next if pair[0] not in purged]
        next = "".join(next)
        content.append(next)

    for pair in fields:
        if pair[0] in not_purged_at_least_once:
            media_files.update(pair[1].media_files())

    if num_notes == -1:
        assert not media_files
        return txt(content, work_dir)
    return field(content, list(media_files))


class Note(genanki.Note):
    @property
    @type_enforced.Enforcer
    def guid(self):
        # Only use the key field to generate a GUID.
        return genanki.guid_for(self.fields[0])


@type_enforced.Enforcer
def build_decks(
    work_dir: str,
    key: list[str],
    front: list[str],
    back: list[str],
    model_name: list[str],
    model_id: list[str],
    css: list[str],
    deck_name: list[str],
    deck_id: list[str],
    deck_description: list[str],
):

    model_name = weave_yarn(model_name, work_dir, [txt]).str()
    model_id = weave_yarn(model_id, work_dir, [txt]).str()
    model_id = int(model_id)
    css = weave_yarn(css, work_dir, [txt]).str()

    model = genanki.Model(
        model_id=model_id,
        name=model_name,
        fields=[
            {"name": "Key"},
            {"name": "Front"},
            {"name": "Back"},
        ],
        templates=[
            {
                "name": "template 1",
                "qfmt": '<div id="front"> {{Front}} </div>',
                "afmt": '<div id="back"> {{Back}} </div>',
            },
        ],
        css=css,
    )

    key = weave_yarn(key, work_dir)
    front = weave_yarn(front, work_dir)
    back = weave_yarn(back, work_dir)
    deck_name = weave_yarn(deck_name, work_dir)

    deck_description = weave_yarn(deck_description, work_dir, [txt]).str()
    deck_id = weave_yarn(deck_id, work_dir, [txt]).str()
    if deck_id:
        deck_id = int(deck_id)
    else:
        # A flexible deck ID can only be used with a flexible deck name.
        assert not isinstance(deck_name, txt)

    decks = {}

    for _ in range(num_entries([deck_name, key, front, back])):
        d = deck_name.next()
        k = key.next()
        f = front.next()
        b = back.next()
        assert d
        # TODO: Consider parameterizing leniency. Some decks have better data
        # sources, so your code is allowed to be more strict.
        if not k:
            continue
        if not f:
            continue
        if not b:
            # Notice that we don't drop the card for simply missing a back.
            pass
        if d not in decks:
            decks[d] = genanki.Deck(
                deck_id=deck_id or hash(d),
                name=d,
                description=deck_description,
            )
        note = Note(model=model, fields=[k, f, b])
        decks[d].add_note(note)

    # Eliminate duplicate media file paths.
    media_files = set()
    for f in [key, front, back, deck_name]:
        media_files.update(f.media_files())
    return decks.values(), media_files


@type_enforced.Enforcer
def main():

    work_dir = tempfile.TemporaryDirectory()

    arguments_by_deck_index = {
        "key": group_by_index(args.key),
        "front": group_by_index(args.front),
        "back": group_by_index(args.back),
        "model_name": group_by_index(args.model_name),
        "model_id": group_by_index(args.model_id),
        "css": group_by_index(args.css),
        "deck_name": group_by_index(args.deck_name),
        "deck_id": group_by_index(args.deck_id),
        "deck_description": group_by_index(args.deck_description),
    }

    media_files = set()
    decks = []

    deck_indices = arguments_by_deck_index["key"].keys()
    # Verify that all deck indexes are represented in all arguments.
    assert all(
        argument.keys() == deck_indices for argument in arguments_by_deck_index.values()
    )

    for deck_index in deck_indices:
        deck_arguments = {k: v[deck_index] for k, v in arguments_by_deck_index.items()}
        cur_decks, cur_media_files = build_decks(work_dir.name, **deck_arguments)

        decks.extend(cur_decks)
        media_files.update(cur_media_files)

    media_files = list(media_files)
    package = genanki.Package(decks, media_files=media_files)
    package.write_to_file(args.output)

    work_dir.cleanup()


if __name__ == "__main__":
    main()
