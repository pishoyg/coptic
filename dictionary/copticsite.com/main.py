import argparse

import pandas as pd

UNNAMED_PREFIX = "Unnamed: "

argparser = argparse.ArgumentParser(
    description="Create a TSV for copticsite.com's dictionary.",
)

argparser.add_argument(
    "--input_tsv",
    type=str,
    default="data/raw/coptic dictionary northern dialect unicode complete.xlsx.tsv",
    help="Path to the input TSV.",
)

argparser.add_argument(
    "--output_tsv",
    type=str,
    default="data/output/output.tsv",
    help="Path to the output TSV.",
)

args = argparser.parse_args()


def main():
    df = pd.read_csv(args.input_tsv, sep="\t", encoding="utf-8").fillna("")
    df.dropna(inplace=True)
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
    df["Origin"] = df["Meaning"]
    meaning = []
    for _, row in df.iterrows():
        cur = {}
        for key in row.keys():
            if key.startswith(UNNAMED_PREFIX):
                value = row[key]
                key = int(key[len(UNNAMED_PREFIX) :])
                cur[key] = value
        cur = "\n".join(v for _, v in sorted(cur.items()))
        meaning.append(cur)
    df["Meaning"] = meaning
    for key in df.keys():
        if key.startswith(UNNAMED_PREFIX):
            df.drop(key, axis=1, inplace=True)

    df.to_csv(args.output_tsv, sep="\t", index=False)


if __name__ == "__main__":
    main()
