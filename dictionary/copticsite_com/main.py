#!/usr/bin/env python3
"""Process the copticsite dictionary."""


import pathlib
import re

import pandas as pd

from utils import ensure

_SCRIPT_DIR = pathlib.Path(__file__).parent
_INPUT_XLSX: str = str(
    _SCRIPT_DIR
    / "data"
    / "raw"
    / "coptic dictionary northern dialect unicode complete.xlsx",
)

_UNNAMED_PREFIX: str = "Unnamed: "
_MEANING_COL: str = "Meaning"
_ORIGIN_COL: str = "Origin"
_COPTIC_COL: str = "Coptic Unicode Alphabet"
_KIND_COL: str = "Word Kind"
_GENDER_COL: str = "Word Gender"
_SUFFIX_COL: str = "suffix"
_PRETTIFY_COL: str = "prettify"

# SUFFIX maps the word kinds to a map of word genders to suffixes.
_SUFFIX: dict[str, dict[str, str]] = {
    "": {
        "": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مصدرية  للفعل يأتي بعدها  أداة المفعول ثم المفعول": "",
        "مؤنث": "",
    },
    "adv.": {
        "": "(adv.)",
    },
    "prefix بادئة": {
        "": "",
        "صيغة مركبة": "",
    },
    "prefix زائدة": {
        "": "",
    },
    "suffix لاحقة": {
        "": "",
    },
    "νϩν": {
        "νϧν": "",
    },
    "ϧα`τϩη": {
        "": "",
    },
    "أداة": {
        "": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مركبة": "",
    },
    "أداة أستفهام": {
        "": "",
    },
    "أداة أشارة": {
        "": "",
    },
    "أداة إشارة": {
        "": "",
    },
    "أداة استفهام": {
        "": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
    },
    "أداة تأكيد": {
        "": "",
    },
    "أداة تعجب": {
        "": "",
    },
    "أداة تعريف": {
        "": "",
        "مذكر": "",
    },
    "أداة تمني": {
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مركبة": "",
    },
    "أداة تنبيه": {
        "": "",
    },
    "أداة تنكير": {
        "": "",
    },
    "أداة ربط": {
        "": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
    },
    "أداة شرط": {
        "": "",
    },
    "أداة عطف": {
        "": "",
    },
    "أداة مفعول": {
        "": "",
    },
    "أداة مقارنة": {
        "": "",
    },
    "أداة ملكية": {
        "": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مركبة": "",
    },
    "أداة نداء": {
        "": "",
    },
    "أداة نفي": {
        "": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مركبة": "",
    },
    "أداة وصل": {
        "": "",
    },
    "اسم": {
        "": "",
        "جمع": "(ⲛ)",
        "جمع ، مذكر": "(ⲛ/ⲡ)",
        "صيغة  للفعل يأتي بعدها المفعول مباشرة بدون أداة مفعول": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مركبة": "",
        "صيغة مصدرية  للفعل يأتي بعدها  أداة المفعول ثم المفعول": "",
        "مؤنث": "(ⲧ)",
        "مؤنث ، جمع": "(ⲧ/ⲛ)",
        "مؤنث ، صيغة  للفعل يأتي بعدها المفعول مباشرة بدون أداة مفعول": "",
        "مؤنث ، صيغة ضميرية": "",
        "مؤنث صيغة  للفعل يأتي بعدها المفعول مباشرة بدون أداة مفعول": "",
        "مذكر": "(ⲡ)",
        "مذكر ، جمع": "(ⲡ/ⲛ)",
        "مذكر ، صيغة ضميرية": "",
        "مذكر ، صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "مذكر ، مؤنث": "(ⲡ/ⲧ)",
        "مذكر ، يأتي بعدها ضمير": "",
        "مذكر – مؤنث": "(ⲡ/ⲧ)",
    },
    "اسم أشارة": {
        "": "",
        "مذكر": "",
    },
    "اسم إشارة": {
        "": "",
    },
    "اسم موصول": {
        "": "",
    },
    "بادئة  prefix": {
        "": "",
    },
    "بادئة ، prefix": {
        "": "",
    },
    "توكيد": {
        "": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
    },
    "جملة": {
        "": "",
    },
    "حال": {
        "": "(adv.)",
    },
    "حرف": {
        "": "",
        "الحرف الثلاثون من الابجدية القبطية": "",
    },
    "حرف ، رقم": {
        "": "",
    },
    "حرف جر": {
        "": "",
        "صيغة  للفعل يأتي بعدها المفعول مباشرة بدون أداة مفعول": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مركبة": "",
    },
    "حرف جر ، ضمير": {
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
    },
    "حرف عطف": {
        "": "",
    },
    "رقم": {
        "": "(num.)",
        "مذكر": "(num. ⲡ)",
    },
    "زائدة prefix": {
        "": "",
        "صيغة مركبة": "",
    },
    "زائدة ، prefix": {
        "": "",
    },
    "صفة": {
        "": "(adj.)",
        "جمع": "(adj. ⲛ)",
        "صيغة  للفعل يأتي بعدها المفعول مباشرة بدون أداة مفعول": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مركبة": "",
        "صيغة مصدرية  للفعل يأتي بعدها  أداة المفعول ثم المفعول": "",
        "صيغة وصفية - حال ، يأتي قبلها الضمير": "",
        "صيغة وصفية – حال": "",
        "مؤنث": "(adj. ⲧ)",
        "مذكر": "(adj. ⲡ)",
        "يوناني": "(adj. ⲉ)",
    },
    "صيغة تفضيل": {
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
    },
    "ضمير": {
        "": "(pron.)",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
    },
    "ضمير إشارة": {
        "": "",
    },
    "ضمير ملكية": {
        "": "",
        "مذكر": "",
    },
    "ضمير وصل": {
        "": "",
        "صيغة مركبة": "",
    },
    "ظرف": {
        "": "(adv.)",
        "صيغة  للفعل يأتي بعدها المفعول مباشرة بدون أداة مفعول": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مصدرية  للفعل يأتي بعدها  أداة المفعول ثم المفعول": "",
    },
    "علامة اسم الفاعل": {
        "": "",
    },
    "علامة الحال": {
        "": "",
    },
    "علامة الماضي": {
        "": "",
    },
    "علامة المصدر": {
        "": "",
        "صيغة مركبة": "",
    },
    "علامة المضاف إليه": {
        "": "",
    },
    "علامة المفعول": {
        "": "",
    },
    "علامة زمن المستقبل": {
        "": "",
    },
    "فعل": {
        "": "(v.)",
        "أمر": "(imp.)",
        "جمع": "(v. ⲛ)",
        "صيغة  للفعل يأتي بعدها المفعول مباشرة بدون أداة مفعول": "",
        "صيغة ضميرية يأتي بعدها ضمير مفعول": "",
        "صيغة مركبة": "",
        "صيغة مصدرية  للفعل يأتي بعدها  أداة المفعول ثم المفعول": "",
        "صيغة وصفية - حال ، يأتي قبلها الضمير": "",
        "صيغة وصفية – حال": "",
        "فعل منعكس": "",
        "مؤنث": "(v. ⲧ)",
        "مذكر": "(v. ⲡ)",
        "مذكر ، مؤنث": "(v. ⲡ/ⲧ)",
    },
    "فعل أمر": {
        "": "(imp.)",
    },
}


_ENGLISH_WORD_RE: re.Pattern = re.compile("[A-Za-z]")
_COPTIC_WORD_RE: re.Pattern = re.compile("([Ⲁ-ⲱϢ-ϯⳈⳉ]+)")


_OTHER_ACCEPTED_CHARS = {
    "…",
    " ",
    ".",
    "/",
    "=",
    "+",
    "-",
    "(",
    ")",
    "?",
    "6",
    ",",
    ":",
    "̀",
    "̅",
}

_FIXES: dict[str, str] = {
    "ὰ": "ⲁ̀",
    "ὸ": "ⲟ̀",
    "ή": "ⲏ̀",
    "ὲ": "ⲉ̀",
    "ὼ": "ⲱ̀",
    "ὶ": "ⲓ̀",
    "ὴ": "ⲏ̀",
    "ː": ":",
}

_MACRONED_LETTER: re.Pattern = re.compile("¯(.)")
_BACKTICKED_LETTER: re.Pattern = re.compile("`(.)")


def _known(w: str) -> bool:
    assert len(w) == 1
    return bool(
        _COPTIC_WORD_RE.fullmatch(w)
        or _ENGLISH_WORD_RE.fullmatch(w)
        or w in _OTHER_ACCEPTED_CHARS,
    )


def _normalize(word: str) -> str:
    word = "".join([_FIXES.get(char, char) for char in word])
    word = _MACRONED_LETTER.sub(r"\1̅", word)
    word = _BACKTICKED_LETTER.sub(r"\1̀", word)
    unknown: list[str] = [w for w in word if not _known(w)]
    ensure.ensure(not unknown, "invalid:", unknown)
    return word


def _main() -> pd.DataFrame:
    df: pd.DataFrame = pd.read_excel(_INPUT_XLSX, dtype=str).fillna("")
    df.dropna(inplace=True)
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
    df[_ORIGIN_COL] = df[_MEANING_COL]
    meaning: list[str] = []
    prettify: list[str] = []
    suffix: list[str] = []
    for _, row in df.iterrows():
        cur: dict[int, str] = {}
        for key in row.keys():
            if key.startswith(_UNNAMED_PREFIX):
                value: str = str(row[key])
                if not value:
                    continue
                key = int(key[len(_UNNAMED_PREFIX) :])
                cur[key] = value
        meaning.append("\n".join(v for _, v in sorted(cur.items())))
        del cur
        p = row[_COPTIC_COL]
        kind = row[_KIND_COL]
        gender = row[_GENDER_COL]
        sfx = _SUFFIX[kind][gender]
        suffix.append(sfx)
        if sfx:
            p = p + " " + sfx
        p = _normalize(p)
        prettify.append(p)
    df[_MEANING_COL] = meaning
    df[_PRETTIFY_COL] = prettify
    df[_SUFFIX_COL] = suffix
    for key in df.keys():
        if key.startswith(_UNNAMED_PREFIX):
            df.drop(key, axis=1, inplace=True)
    return df


# TODO: (#399): Export objects and methods, rather than a TSV!
copticsite = _main()
