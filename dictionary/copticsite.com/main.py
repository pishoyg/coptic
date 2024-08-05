import argparse
import os

import pandas as pd
import type_enforced

UNNAMED_PREFIX = "Unnamed: "
MEANING_COL = "Meaning"
ORIGIN_COL = "Origin"
COPTIC_COL = "Coptic Unicode Alphabet"
KIND_COL = "Word Kind"
GENDER_COL = "Word Gender"
SUFFIX_COL = "suffix"
PRETTIFY_COL = "prettify"

# SUFFIX maps the word kinds to a map of word genders to suffixes.
# TODO: Revisit the suffixes. Make display more friendly.
SUFFIX = {
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


@type_enforced.Enforcer
def get_suffix(kind: str, gender: str) -> str:
    if kind not in SUFFIX:
        return ""
    gender_map = SUFFIX[kind]
    if isinstance(gender_map, str):
        return gender_map
    assert isinstance(gender_map, dict)
    if gender in gender_map:
        return gender_map[gender]
    if "*" in gender_map:
        return gender_map["*"]
    return ""


argparser = argparse.ArgumentParser(
    description="Create a TSV for copticsite.com's dictionary.",
)

argparser.add_argument(
    "--input_xlsx",
    type=str,
    default="dictionary/copticsite.com/data/raw/coptic dictionary northern dialect unicode complete.xlsx",
    help="Path to the input Excel file.",
)

argparser.add_argument(
    "--output",
    type=str,
    default="dictionary/copticsite.com/data/output/",
    help="Path to the output directory.",
)

args = argparser.parse_args()


@type_enforced.Enforcer
def main() -> None:
    df = pd.read_excel(args.input_xlsx, dtype=str).fillna("")
    df.dropna(inplace=True)
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
    df[ORIGIN_COL] = df[MEANING_COL]
    meaning = []
    prettify = []
    suffix = []
    for _, row in df.iterrows():
        cur = {}
        for key in row.keys():
            if key.startswith(UNNAMED_PREFIX):
                value = row[key]
                if not value:
                    continue
                key = int(key[len(UNNAMED_PREFIX) :])
                cur[key] = value
        cur = "\n".join(v for _, v in sorted(cur.items()))
        meaning.append(cur)
        p = row[COPTIC_COL]
        kind = row[KIND_COL]
        gender = row[GENDER_COL]
        sfx = SUFFIX[kind][gender]
        suffix.append(sfx)
        if sfx:
            p = p + " " + sfx
        prettify.append(p)
    df[MEANING_COL] = meaning
    df[PRETTIFY_COL] = prettify
    df[SUFFIX_COL] = suffix
    for key in df.keys():
        if key.startswith(UNNAMED_PREFIX):
            df.drop(key, axis=1, inplace=True)

    df.to_csv(os.path.join(args.output, "tsv", "output.tsv"), sep="\t", index=False)


if __name__ == "__main__":
    main()
