f = open("old_testament.csv").readlines()
s = {}
for l in f:
    l = l.split(",")
    assert len(l) == 4
    ref = ":".join(l[:3])
    l = l[3]
    l = l.split()
    l = [a for a in l if "\u0305" in a]
    for a in l:
        if a not in s:
            s[a] = []
        s[a].append(ref)
import pprint

out = sorted(s.items(), key=lambda x: len(x[1]), reverse=True)
out = [(a[0], a[1] if len(a[1]) < 10 else len(a[1])) for a in out]
pprint.pprint(out)
