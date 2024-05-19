INPUT_FILE_NAME = "bible.txt"
letters = """Α  Ⲁ  α  ⲁ
Β  Ⲃ  β  ⲃ
Γ  Ⲅ  γ  ⲅ
Δ  Ⲇ  δ  ⲇ
Ε  Ⲉ  ε  ⲉ
Ζ  Ⲍ  ζ  ⲍ
Η  Ⲏ  η  ⲏ
Θ  Ⲑ  θ  ⲑ
Ι  Ⲓ  ι  ⲓ
Κ  Ⲕ  κ  ⲕ
Λ  Ⲗ  λ  ⲗ
Μ  Ⲙ  μ  ⲙ
Ν  Ⲛ  ν  ⲛ
Ξ  Ⲝ  ξ  ⲝ
Ο  Ⲟ  ο  ⲟ
Π  Ⲡ  π  ⲡ
Ρ  Ⲣ  ρ  ⲣ
Σ  Ⲥ  σ  ⲥ
Τ  Ⲧ  τ  ⲧ
Υ  Ⲩ  υ  ⲩ
Φ  Ⲫ  φ  ⲫ
Χ  Ⲭ  χ  ⲭ
Ψ  Ⲯ  ψ  ⲯ
Ω  Ⲱ  ω  ⲱ
ς  ⲥ  ὲ  ⲉ̀
ò  ⲟ̀  ὰ  ⲁ̀
ὶ  ⲓ̀  ὶ  ⲓ̀"""

letters = letters.split("\n")
m = {}
for line in letters:
    line = line.split("  ")
    assert len(line) == 4, '"{}"'.format(line)
    m[line[0]] = line[1]
    m[line[2]] = line[3]


def convert_char(c):
    if c in m:
        return m[c]
    return c


text = [convert_char(c) for c in open(INPUT_FILE_NAME).read()]
i = 0
while i < len(text) - 1:
    if text[i] == "_":
        text[i] = text[i + 1]
        text[i + 1] = "̅"
        i += 1
    elif text[i] == "`":
        text[i] = text[i + 1]
        text[i + 1] = "̀"
        i += 1
    i += 1

print("".join(text))
