"""Markdown helprs."""

import typing
from xml.etree.ElementTree import Element

import markdown
from markdown import treeprocessors


class _Processor(treeprocessors.Treeprocessor):
    """Align rendered Markdown with the site's HTML conventions.

    Renames `<em>`/`<strong>` to the house `<i>`/`<b>`, and makes external links
    open in a new tab with safe `rel` attributes, so authors don't have to
    annotate every link by hand.
    """

    @typing.override
    def run(self, root: Element) -> None:
        for el in root.iter():
            if el.tag == "em":
                el.tag = "i"
                continue
            if el.tag == "strong":
                el.tag = "b"
                continue
            if el.tag == "a" and not el.attrib["href"].startswith("#"):
                el.set("target", "_blank")
                el.set("rel", "noopener noreferrer")
                continue


class _Extension(markdown.Extension):
    """Register :class:`_NotesProcessor` on the Markdown instance."""

    @typing.override
    # pylint: disable-next=invalid-name
    def extendMarkdown(self, md: markdown.Markdown) -> None:  # dead: disable
        # Priority 0: run last, after inline processing has built the
        # `<em>`/`<strong>`/`<a>` elements this processor rewrites.
        md.treeprocessors.register(_Processor(md), "extension", 0)


def to_html(md: str) -> str:
    return markdown.markdown(md, extensions=[_Extension()])
