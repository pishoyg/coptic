ONES = " ⲁⲃⲅⲇⲉⲋⲍⲏⲑ"
TENS = " ⲓⲕⲗⲙⲛⲝⲟⲡϥ"
HUNDREDS = " ⲣⲥⲧⲩⲫⲭⲯⲱϣ"
STROKE = "̅"


def to_coptic_num(n):
    """Return the Coptic representation of the given integer in string format."""
    assert isinstance(n, int), "number conversion is only possible for integers"
    assert 0 < n < 1000, "number conversion is currently only possible for [1:999]"
    o, t, h = n % 10, (n // 10) % 10, (n // 100) % 10
    return "".join([x + STROKE for x in [HUNDREDS[h], TENS[t], ONES[o]] if x != " "])
