import sys
x = sys.argv[1]
x = x.split('\n')
x = [a for a in x if 'B' in a]
prefix = '→ \([^)]+\) '
suffix = ' (←|↓)'
import re
for pair in [[prefix, ''], [suffix, ''], ['–', '-'], ['=', '//'], ['\+', ' (ⲉϥ)']]:
  x = [re.sub(pair[0], pair[1], a) for a in x]

x = ', '.join(x)
import clipboard
clipboard.copy(x)
