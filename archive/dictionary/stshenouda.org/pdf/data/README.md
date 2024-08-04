<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Files](#files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Files

- `coptdict.pdf` is the source, downloaded from stshenouda.org.

- `coptdict-converted.html` represents the PDF file converted to HTML using a
standard HTML convertor.

- `coptdict-converted-tail.html` represents the file manually trimmed to
eliminate noise.

- `coptdict-converted-tail-mapped.*` represent the result of processing the
file using our script.

- `class_frequency.txt` offers insights into the HTML structure. It's obtained
by running the following:

```bash
cat coptdict-converted-tail.html \
  | grep -o 'class="[^"]*"' \
  | grep -oE '"[^"]+"' \
  | sort \
  | uniq -c \
  | sort -nr \
  > class_frequency.txt
```
