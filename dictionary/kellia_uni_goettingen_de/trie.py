"""Organize the senses of a word in a trie, to eliminate redundancy.

A sense is a translation such as:
    angel (inverted attributive, nominal referent; referent: benevolent being)
We parse it into a *chain*: a head (`angel`) followed by qualifiers
(`inverted attributive, nominal referent` and `referent: benevolent being`).
The qualifiers are the parenthesized groups trailing the head, further split
by the semicolons at their top level.

The chains of a word are inserted in a trie, so senses that share a head (and
possibly some qualifiers) share a branch. For example:
    angel (referent: benevolent being)
    angel (inverted attributive, nominal referent; referent: benevolent being)
    angel (referent: malevolent being)
become:
    angel
      (referent: benevolent being)
        (inverted attributive, nominal referent)
      (referent: malevolent being)

The order of the qualifiers within a sense is inconsistent in the data. A
qualifier that the sense shares with a sibling is sometimes listed first, and
sometimes last (as is the case for `referent: benevolent being` above). We
therefore treat the qualifiers of a sense as an unordered set, and choose an
order that encourages sharing. We sort the qualifiers by descending frequency
among the senses that share the same head (ties retain the original order).
This is the standard ordering heuristic for building compact prefix trees (as
in FP-growth's FP-tree), and it's cheap and deterministic. When tested on the
DDGLC data, it produced the minimal trie in all but 6 out of 3,202 entries (for
which an exhaustive search was feasible), with a total excess of 7 nodes.

Finally, a node that has a single child and terminates no sense is merged with
its child, so the trie only branches where the senses actually diverge.
"""

import collections
from collections import abc

import regex

from utils import ensure

# _GROUP defines a parenthesized group, which may contain nested groups.
_GROUP: str = r"(?(DEFINE)(?P<group>\((?:[^()]++|(?&group))*\)))"

# _QUALIFIER matches a qualifier, which extends to the next semicolon, unless
# the semicolon is enclosed in a nested group.
_QUALIFIER: str = r"(?P<qualifier>(?:[^();]++|(?&group))*)"

# _CHAIN matches a quote: a head, followed by groups of semicolon-separated
# qualifiers.
# Each group must be preceded by whitespace. Otherwise, it's part of a word, as
# in `person(s)`.
# The head is lazy, so it leaves as many trailing groups as possible to the
# qualifiers. But it can't be empty, so if the whole quote is a sequence of
# groups, such as `(interrogative marker) (introduces a question)`, the first
# group is the head.
_CHAIN: regex.Pattern[str] = regex.compile(
    rf"(?P<head>.+?)(?:\s+\({_QUALIFIER}(?:;{_QUALIFIER})*\))*\s*{_GROUP}",
)


class Chain:
    """Chain represents a parsed sense: a head, followed by qualifiers."""

    def __init__(self, quote: str) -> None:
        ensure.brackets_balanced(quote, "in", quote)
        match: regex.Match[str] | None = _CHAIN.fullmatch(quote)
        assert match
        self.quote: str = quote
        self.head: str = match["head"].strip()
        self.qualifiers: list[str] = [
            q.strip() for q in match.captures("qualifier")
        ]
        ensure.ensure(all(self.qualifiers), "empty qualifier in", quote)
        ensure.unique(self.qualifiers, "qualifiers of", quote)


class Node:
    """Node represents a trie node.

    A node can span several labels, as a result of merging a node with its only
    child.
    """

    def __init__(self, label: str) -> None:
        self.labels: list[str] = [label]
        self.children: dict[str, Node] = {}
        # senses is the list of indices of senses that terminate at this node.
        # A sense may terminate at an internal node.
        self.senses: list[int] = []

    def compact(self) -> None:
        while len(self.children) == 1 and not self.senses:
            child: Node = next(iter(self.children.values()))
            self.labels.extend(child.labels)
            self.children = child.children
            self.senses = child.senses
        for child in self.children.values():
            child.compact()

    def walk(
        self,
        path: list[str],
    ) -> abc.Generator[tuple[list[str], int]]:
        path = path + self.labels
        for sense in self.senses:
            yield path, sense
        for child in self.children.values():
            yield from child.walk(path)


def _order(chains: list[Chain]) -> abc.Generator[list[str]]:
    """Order the qualifiers of each chain to encourage sharing.

    Args:
        chains: The chains of a word.

    Yields:
        The path of each chain: Its head, followed by its qualifiers, sorted by
        descending frequency among the chains that share the same head.
    """
    freq: collections.Counter[tuple[str, str]] = collections.Counter(
        (c.head, q) for c in chains for q in c.qualifiers
    )
    for c in chains:
        rank: dict[str, int] = {q: -freq[c.head, q] for q in c.qualifiers}
        # Python's sort is stable, so ties retain their original order.
        yield [c.head, *sorted(c.qualifiers, key=rank.__getitem__)]


def build(quotes: abc.Sequence[str]) -> list[Node]:
    """Build a trie from the senses of a word.

    Args:
        quotes: The senses of a word.

    Returns:
        The top-level nodes of the trie, in order of first appearance. Each
        top-level node starts with the head of its senses. Senses are
        represented by their indices in `quotes`.
    """
    chains: list[Chain] = [Chain(q) for q in quotes]
    root: Node = Node("")
    for idx, path in enumerate(_order(chains)):
        node: Node = root
        for label in path:
            node = node.children.setdefault(label, Node(label))
        node.senses.append(idx)
    nodes: list[Node] = list(root.children.values())
    for node in nodes:
        node.compact()

    # Verify that each sense terminates exactly once, and that it can be
    # reconstructed from its path.
    walked: list[tuple[list[str], int]] = [
        pair for node in nodes for pair in node.walk([])
    ]
    assert sorted(idx for _, idx in walked) == list(range(len(chains)))
    for path, idx in walked:
        assert path[0] == chains[idx].head
        assert sorted(path[1:]) == sorted(chains[idx].qualifiers)

    return nodes
