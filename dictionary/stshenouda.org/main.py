import argparse

import bs4
import constants
import pandas as pd

argparser = argparse.ArgumentParser(
    description="Process stshenouda.org's Coptic dictionary."
)

# TODO: Use more indicative names than "tail" and "mapped", such as "denoise"
# and "unicode".
argparser.add_argument(
    "--input",
    type=str,
    default="data/coptdict-converted-tail.html",
    help="Path to the input HTML file.",
)
argparser.add_argument(
    "--output_html",
    type=str,
    default="data/coptdict-converted-tail-mapped.html",
    help="Path to the output HTML file with the alphabet mapped.",
)
argparser.add_argument(
    "--output_txt",
    type=str,
    default="data/coptdict-converted-tail-mapped.txt",
    help="Path to the output TXT file containing the full text.",
)
argparser.add_argument(
    "--output_tsv",
    type=str,
    default="data/coptdict-converted-tail-mapped.tsv",
    help="Path to the output TSV file containing the flashcards.",
)


args = argparser.parse_args()


def remap_unicode(s):
    out = ""
    for c in s:
        if c in constants.MAP:
            out += constants.MAP[c]
        else:
            out += c
    return out


def split(s):
    for c in constants.MEANING_SPLITTERS:
        i = s.find(c)
        if i != -1:
            return s[:i].strip(), s[i + 1 :].strip()
    # TODO: Handle all the corner cases, and raise an exception if this
    # situation is encountered.
    print("Unable to split string: %s" % s)
    return s, s


def join(lines):
    out = []
    for l in lines:
        if any(l.strip().startswith(c) for c in ":,"):
            out[-1] += l.strip()
            continue
        out.append(l)
    return out


def pack_abbreviations(line):
    for word in constants.ABBREVIATIONS.keys():
        if not word.endswith("."):
            continue
        start = 0
        while True:
            i = line.find(word, start)
            if i == -1:
                break
            if i == 0:
                raise ValueError(line)
            if line[i - 1].isalpha():
                start = i + 1
                continue
            # This is an occurrence!
            line = line[:i] + "(" + word + ")" + line[i + len(word) :]
            start = i + 2
    return line


def fix(line):
    line = line.replace("Vow. promise.", "Vow, promise.")
    line = line.replace("f..", "f.")
    line = line.replace("n .", "n.")
    return line


def check_multiword(line, start=0):
    # Handle a typo in the original text.
    line = line.strip()
    if not line:
        return []
    i = line.find(". ", start)
    if i == -1:
        return [line]
    if any(line[i + 2 :].strip().startswith(s) for s in ["(I.)", "(II.)", "(III.)"]):
        # False positive
        return check_multiword(line, i + 3)
    return [line[: i + 1]] + check_multiword(line[i + 2 :])


def get_text(soup):
    # TODO: Move the constants to the constants package, in this method and
    # also in the callees.
    # TODO: Explain the logic in comments.
    text = [""]
    for e in soup.body.descendants:
        if isinstance(e, str):
            text[-1] += e.strip() + " "
        elif e.name in ["br", "p", "h1", "h2", "h3", "h4", "tr", "th"]:
            text.append("")
        elif e.name == "li":
            text.append("- ")
    text = [t for t in text if t.strip()]

    text = map(fix, text)

    text = [[t] for t in text]

    tmp = [["."]]
    for t in text:
        if tmp[-1][-1].strip()[-1] not in ".!":
            tmp[-1].extend(t)
            continue
        tmp.append(t)
    tmp = tmp[1:]
    text = tmp

    tmp = [[]]
    for t in text:
        c = t[0][0]
        if (
            not (c >= "ⲁ" and c <= "ⲱ")
            and not (c >= "ϣ" and c <= "ϯ")
            and c != "("
            and c != "-"
            and c != "–"
        ):
            tmp[-1].extend(t)
            continue
        tmp.append(t)
    text = tmp

    tmp = [[]]
    for t in text:
        if not any(s in tt for s in constants.MEANING_SPLITTERS for tt in t):
            tmp[-1].extend(t)
            continue
        tmp.append(t)
    text = tmp

    text = [[" ".join(tt.split()) for tt in t] for t in text]
    text = [list(filter(None, t)) for t in text]
    text = list(filter(None, text))
    text = ["\n   ".join(t) for t in text]
    text = [pack_abbreviations(t) for t in text]

    tmp = []
    for t in text:
        tmp.extend(check_multiword(t))
    text = tmp
    return text


def main():
    soup = bs4.BeautifulSoup(open(args.input).read(), features="html.parser")
    for d in list(soup.descendants):
        if not isinstance(d, bs4.element.NavigableString):
            continue
        p = d.parent
        if not p.has_attr("class"):
            continue
        c = p.attrs["class"]
        assert len(c) == 1
        c = c[0]
        if c not in constants.SHOULD_MAP:
            continue
        d.replace_with(remap_unicode(str(d)))

    with open(args.output_html, "w") as f:
        f.write(soup.prettify())

    text = get_text(soup)
    with open(args.output_txt, "w") as f:
        f.write("\n\n".join(text))

    df = pd.DataFrame()
    for t in text:
        w, m = split(t)
        new = pd.DataFrame([{"word": w, "meaning": m}])
        df = pd.concat([df, new], ignore_index=True)
    df.to_csv(args.output_tsv, sep="\t", header=False, index=False)

    # TODO: Write a gsheet.


if __name__ == "__main__":
    main()
