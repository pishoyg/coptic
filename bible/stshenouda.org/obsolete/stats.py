import re

LEFT_HAND = ["ⲭⲁⲍ", "ⲱⲥϧ", "ⲉⲇϭ", "ⲣϥⲫ", "ⲧⲅⲃ"]

RIGHT_HAND = ["ⲏϩⲛ", "ⲩϫⲙ", "ⲓⲕⲑ", "ⲟⲗϣ", "ⲡϯ"]

LETTER_MAPPING = {
    "ⲁ": "a",
    "ⲃ": "b",
    "ⲅ": "g",
    "ⲇ": "d",
    "ⲉ": "e",
    "ⲋ": "`",
    "ⲍ": "z",
    "ⲏ": "y",
    "ⲑ": ",",
    "ⲓ": "i",
    "ⲕ": "k",
    "ⲗ": "l",
    "ⲙ": "m",
    "ⲛ": "n",
    "ⲝ": "[",
    "ⲟ": "o",
    "ⲡ": "p",
    "ⲣ": "r",
    "ⲥ": "s",
    "ⲧ": "t",
    "ⲩ": "u",
    "ⲫ": "v",
    "ⲭ": "q",
    "ⲯ": "]",
    "ⲱ": "w",
    "ϣ": ".",
    "ϥ": "f",
    "ϧ": "x",
    "ϩ": "h",
    "ϫ": "j",
    "ϭ": "c",
    "ϯ": ";",
}


def same_finger(a, b):
    return a != b and any(
        a in finger and b in finger for finger in LEFT_HAND + RIGHT_HAND
    )


def is_left(a):
    return any(a in finger for finger in LEFT_HAND)


def is_right(a):
    return not is_left(a)


def same_hand(a, b):
    return a != b and is_left(a) == is_left(b)


class pairFreq:
    def __init__(self, p, d):
        total = sum(d.values())
        self.p1 = p
        self.f1 = d[p]
        self.p2 = p[1] + p[0]
        if self.p2 in d:
            self.f2 = d[self.p2]
        else:
            self.f2 = 0
        self.s = self.f1 + self.f2
        if self.f1 < self.f2:
            self.p1, self.f1, self.p2, self.f2 = self.p2, self.f2, self.p1, self.f1
        self.sameFinger = same_finger(p[0], p[1])
        self.sameHand = same_hand(p[0], p[1])
        self.percentage = self.s * 100 / total

    def __str__(self):
        return "\t".join(
            map(
                str,
                [
                    self.p1,
                    self.f1,
                    self.p2,
                    self.f2,
                    self.s,
                    "%.2f" % self.percentage,
                    self.sameFinger,
                    self.sameHand,
                ],
            )
        )


def count_pairs(coptic_nt):
    d = {}
    pf = {}
    cntLeft = 0
    cntRight = 0
    letterFreq = {}
    r = re.compile("[^ Ⲁ-ⲱϢ-ϯ]")
    for b in coptic_nt.books():
        for c in b.chapters():
            for v in c.verses():
                v = v.text().lower()
                v = r.sub("", v)
                for w in v.split():
                    for l in w:
                        if is_left(l):
                            cntLeft += 1
                        else:
                            cntRight += 1
                        if l not in letterFreq:
                            letterFreq[l] = 0
                        letterFreq[l] += 1
                    for i in range(len(w) - 1):
                        p = w[i] + w[i + 1]
                        if p not in d:
                            d[p] = 0
                        d[p] += 1
    for k, v in d.items():
        s = v
        if k[1] + k[0] in d:
            s += d[k[1] + k[0]]
        if s >= 548:
            if k in pf or k[1] + k[0] in pf:
                continue
            entry = pairFreq(k, d)
            pf[entry.p1] = entry
    pf = [entry for _, entry in pf.items()]
    pf = sorted(pf, key=lambda x: x.s, reverse=True)
    for x in pf:
        print(x)
    percentages = [
        sum(entry.percentage for entry in pf),
        sum(entry.percentage for entry in pf if entry.sameFinger),
        sum(entry.percentage for entry in pf if entry.sameHand),
    ]
    # print('\t'.join("%.2f" % x for x in percentages))
    # print(cntLeft, cntRight)
    print(letterFreq)
    print(sum(letterFreq.values()))
    s = ""
    for k, v in letterFreq.items():
        print(k, v)
        # s += LETTER_MAPPING[k] * v
    # print(s)
