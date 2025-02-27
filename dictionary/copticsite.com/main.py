#!/usr/bin/env python3
import os
import re

import pandas as pd

import utils

INPUT_XLSX: str = (
    "dictionary/copticsite.com/data/raw/coptic dictionary northern dialect unicode complete.xlsx"
)
OUTPUT: str = "dictionary/copticsite.com/data/output/"

UNNAMED_PREFIX: str = "Unnamed: "
MEANING_COL: str = "Meaning"
ORIGIN_COL: str = "Origin"
COPTIC_COL: str = "Coptic Unicode Alphabet"
KIND_COL: str = "Word Kind"
GENDER_COL: str = "Word Gender"
SUFFIX_COL: str = "suffix"
PRETTIFY_COL: str = "prettify"

# SUFFIX maps the word kinds to a map of word genders to suffixes.
# TODO: (#10) Revisit the suffixes. Make display more friendly.
SUFFIX: dict[str, dict[str, str]] = {
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


ENGLISH_WORD_RE: re.Pattern = re.compile("[A-Za-z]")
COPTIC_WORD_RE: re.Pattern = re.compile("([Ⲁ-ⲱϢ-ϯⳈⳉ]+)")


OTHER_ACCEPTED_CHARS = {
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

FIXES: dict[str, str] = {
    "ὰ": "ⲁ̀",
    "ὸ": "ⲟ̀",
    "ή": "ⲏ̀",
    "ὲ": "ⲉ̀",
    "ὼ": "ⲱ̀",
    "ὶ": "ⲓ̀",
    "ὴ": "ⲏ̀",
    "ː": ":",
}

MACRONED_LETTER: re.Pattern = re.compile("¯(.)")
BACKTICKED_LETTER: re.Pattern = re.compile("`(.)")


def known(w: str) -> bool:
    assert len(w) == 1
    return bool(
        COPTIC_WORD_RE.fullmatch(w)
        or ENGLISH_WORD_RE.fullmatch(w)
        or w in OTHER_ACCEPTED_CHARS,
    )


def normalize(word: str) -> str:
    word = "".join([FIXES.get(char, char) for char in word])
    word = MACRONED_LETTER.sub(r"\1̅", word)
    word = BACKTICKED_LETTER.sub(r"\1̀", word)
    assert all(
        known(w) for w in word
    ), f"'{word}': {[w for w in word if not known(w)]}"
    return word


def main() -> None:
    df: pd.DataFrame = pd.read_excel(INPUT_XLSX, dtype=str).fillna("")
    df.dropna(inplace=True)
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
    df[ORIGIN_COL] = df[MEANING_COL]
    meaning: list[str] = []
    prettify: list[str] = []
    suffix: list[str] = []
    for _, row in df.iterrows():
        cur: dict[int, str] = {}
        for key in row.keys():
            if key.startswith(UNNAMED_PREFIX):
                value: str = str(row[key])
                if not value:
                    continue
                key = int(key[len(UNNAMED_PREFIX) :])
                cur[key] = value
        meaning.append("\n".join(v for _, v in sorted(cur.items())))
        del cur
        p = row[COPTIC_COL]
        kind = row[KIND_COL]
        gender = row[GENDER_COL]
        sfx = SUFFIX[kind][gender]
        suffix.append(sfx)
        if sfx:
            p = p + " " + sfx
        p = normalize(p)
        prettify.append(p)
    df[MEANING_COL] = meaning
    df[PRETTIFY_COL] = prettify
    df[SUFFIX_COL] = suffix
    for key in df.keys():
        if key.startswith(UNNAMED_PREFIX):
            df.drop(key, axis=1, inplace=True)

    utils.to_tsv(df, os.path.join(OUTPUT, "tsv", "output.tsv"))


if __name__ == "__main__":
    main()
