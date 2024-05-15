import re
import sys

import clipboard

x = sys.argv[1]
x = x.split("\n")
x = [a for a in x if "B" in a]
prefix = r"→ \([^)]+\) "
suffix = r" (←|↓)"
for pair in [[prefix, ""], [suffix, ""], ["–", "-"], ["=", "//"], [r"\+", " (ⲉϥ)"]]:
    x = [re.sub(pair[0], pair[1], a) for a in x]

x = ", ".join(x)
clipboard.copy(x)
