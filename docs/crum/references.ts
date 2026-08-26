import * as log from '../logger.js';
import * as tool from '../tooltip.js';
import * as cls from './cls.js';
import * as dev from '../dev.js';
import * as html from '../html.js';
import * as ann from './annotations.js';
import * as sax from './pisaxo.js';
import * as str from '../str.js';

export const MAPPING: Record<string, Reference> = {};

/**
 * Source wraps a raw source, caching its parsed title and description so
 * the HTML is parsed once per source rather than once per tooltip render.
 */
export class Source {
  private titleMemo?: DocumentFragment;
  private descriptionMemo?: HTMLUListElement;

  /**
   *
   * @param titleHTML
   * @param descriptionHTML
   */
  public constructor(
    public readonly titleHTML?: string | null,
    public readonly descriptionHTML?: string[] | null
  ) {}

  /**
   * @returns Deep copies of the parsed title's child nodes.
   */
  public title(): Iterable<Node> {
    if (!this.titleHTML) {
      return [];
    }
    if (!this.titleMemo) {
      this.titleMemo = new DocumentFragment();
      this.titleMemo.append(...html.parse(this.titleHTML));
    }
    return this.titleMemo.cloneNode(true).childNodes;
  }

  /**
   * @returns A deep copy of the parsed description list, empty if the source
   *   has no description.
   */
  public description(): HTMLElement[] {
    if (!this.descriptionHTML?.length) {
      return [];
    }
    if (!this.descriptionMemo) {
      const ul: HTMLUListElement = document.createElement('ul');
      this.descriptionHTML.forEach((innerHTML: string): void => {
        const li: HTMLLIElement = document.createElement('li');
        li.innerHTML = innerHTML;
        ul.append(li);
      });
      ul.querySelectorAll('strong').forEach((strong: HTMLElement): void => {
        strong.replaceWith(
          html.classify(html.span(...strong.childNodes), cls.ABBREVIATION)
        );
      });
      this.descriptionMemo = ul;
    }
    return [this.descriptionMemo.cloneNode(true) as HTMLUListElement];
  }
}

const SUFFIX_ANNOTATIONS: Record<string, string> = Object.fromEntries([
  ...Object.entries(ann.MAPPING)
    .filter(([_, annot]: [string, ann.Annotation]): boolean => !!annot.suffix)
    .map(([key, annot]: [string, ann.Annotation]): [string, string] => [
      key,
      annot.fixFullForm ?? annot.fullForm,
    ]),
  // 'no' is absent from the canonical list of annotations, because it would
  // yield too many false positives.
  ['no', 'number'],
]);
const SUFFIX_ANNOTATION_RE = new RegExp(
  str.regex(Object.keys(SUFFIX_ANNOTATIONS)),
  'ug'
);

/**
 * Reference represents a particular way of citing a source in the text.
 */
export class Reference {
  private static readonly DATA_REF = 'ref';

  /**
   *
   * @param source - Cited source.
   * @param variant - Abbreviation used to cite this source.
   * @param fix - Either a postfix or a prefix. Optional.
   */
  public constructor(
    // TODO: (#522) The `source` field should become required once all sources
    // are populated.
    public readonly source: Source | undefined,
    public readonly variant: string,
    public readonly fix?: Fix
  ) {}

  /**
   * @returns This reference's key in the `MAPPING` — the variant with its fix
   * composed in, if it has one. `span` records it, and `fromSpan` looks the
   * reference back up by it, so the round trip holds by construction.
   */
  public key(): string {
    return this.fix?.compose(this.variant) ?? this.variant;
  }

  /**
   *
   * @returns
   */
  public tooltip(): HTMLElement[] {
    if (!this.source) {
      return [];
    }
    return [
      tooltip(this.variant, this.source.title()),
      ...this.source.description(),
      ...(this.fix?.tooltip() ?? []),
    ];
  }

  /**
   * Build a <span> for this reference and wire its tooltip in one pass.
   * Annotations detected in `suffix` (e.g. manuscript or page-number tokens
   * that follow the abbreviation) are folded into the tooltip at construction
   * time.
   *
   * @param content - Nodes/strings that make up the reference itself.
   * @param suffix - Suffix nodes/strings that follow the reference.
   * @returns
   */
  public span(
    content: Iterable<Node | string>,
    suffix: Iterable<Node | string> = []
  ): HTMLSpanElement {
    // We loop over `suffix` twice, so we make sure it's an array.
    suffix = Array.from(suffix);
    const span: HTMLSpanElement = document.createElement('span');
    span.classList.add(cls.REFERENCE);
    span.dataset[Reference.DATA_REF] = this.key();
    span.append(...content, ...suffix);
    const tip: (Node | string)[] = [];
    if (ann.ib(span.textContent)) {
      tip.push(ann.ibidem(true));
    }
    tip.push(...this.tooltip());
    if (!tip.length) {
      // Avoid creating a tooltip that only consists of suffix annotations.
      // TODO: (#522) When all sources are populated, this check won't be
      // necessary.
      return span;
    }
    tip.push(...Reference.suffixAnnotations(suffix));

    // Make all hyperlinks in the tooltip external.
    tip
      .filter((n: Node | string) => n instanceof Element)
      .forEach((node: Element): void => {
        node.querySelectorAll('a').forEach((a: HTMLAnchorElement): void => {
          a.target = '_blank';
          a.rel = 'noreferrer noopener';
        });
      });

    tool.addTooltip(span, tip);
    return span;
  }

  /**
   * Check whether the given span is a reference that bears the exact same key
   * as this reference.
   * NOTE: Non-load-bearing postfixes are also accounted for in the comparison.
   * This method evaluates to true only if all key components are identical.
   *
   * @param span
   *
   * @returns
   */
  public sameKey(span: HTMLElement): boolean {
    return (
      span.classList.contains(cls.REFERENCE) &&
      Reference.fromSpan(span).key() === this.key()
    );
  }

  /**
   *
   * @param span
   * @returns
   */
  public static fromSpan(span: HTMLElement): Reference {
    return MAPPING[span.dataset[Reference.DATA_REF]!]!;
  }

  /**
   * Extract annotation entries for any suffix
   * tokens that match a known annotation abbreviation.
   *
   * @param suffix
   * @returns
   */
  private static *suffixAnnotations(
    suffix: Iterable<Node | string>
  ): Generator<Node> {
    // NOTE: Ideally, this should consider the text as a whole, rather than
    // one node at a time.
    // Multi-node annotations are extremely rare. Indeed, multi-node *suffix*
    // annotations have never been encountered yet, so this is deemed
    // acceptable.
    for (const node of suffix) {
      const italic: boolean = node instanceof Element && node.nodeName === 'I';

      for (const match of html
        .textContent(node)
        .matchAll(SUFFIX_ANNOTATION_RE)) {
        const abb: string = match[0];
        yield tooltip(
          abb,
          [html.maybeI(SUFFIX_ANNOTATIONS[abb]!, italic)],
          italic
        );
      }
    }
  }
}

/**
 *
 * @param name
 * @param interpretation
 * @param italic
 * @returns
 */
function tooltip(
  name: string,
  interpretation: Iterable<Node | string>,
  italic = false
): HTMLDivElement {
  const div: HTMLDivElement = document.createElement('div');
  div.append(
    html.classify(html.span(html.maybeI(name, italic), ': '), cls.ABBREVIATION),
    ...interpretation
  );
  return div;
}

/**
 *
 */
abstract class Fix {
  /**
   *
   * @param name
   * @param interpretation
   */
  public constructor(
    public readonly name: string,
    public readonly interpretation: sax.Fix
  ) {}

  public abstract compose(variant: string): string;

  protected abstract lookup(): HTMLElement[];

  /**
   * NOTE: A fix whose interpretation is null in `bib.yaml` contributes
   * NOTHING here. A null could be one of the following:
   * 1. A postfix that simply has no tooltip-worthy interpretation, such as one
   *    referring to a chapter within a book.
   * 2. A postfix emptied ON PURPOSE by consolidation (#671), such as `Mani`'s
   *    `K:` or `Pcod`'s `F:`. Its text was not lost: it moved into the
   *    entry's own `description`, under its bold siglum, so that every
   *    citation shares the same tooltip, regardless of postfixes. See the
   *    postfix NOTE in `bib.yaml`.
   * 3. A placeholder that still needs to be filled out (#522).
   *
   * Either way, this makes correct output look broken, and it is worth
   * knowing before reporting a postfix as mis-parsed. `ShViK 9100 229` (under
   * ⲟⲩⲟⲉⲓⲛ, page 1) parses exactly right: `Sh` carries a real `Vi K` postfix,
   * and the longest-first match in `ENRICHMENT_RE` takes the whole `ShViK`.
   * Yet the tooltip reads only "Sh: … Vi: …", so the `K` looks as though it
   * were swallowed as a stray single-letter suffix. It was not. Grep
   * `bib.yaml` for the COMBINED key before concluding otherwise: the postfix
   * that appears to have gone missing is usually declared and merely silent.
   *
   * Note also that `Postfix.lookup` renders the postfix source's own standard
   * variant rather than the form Crum actually wrote, which compounds the
   * illusion.
   *
   * @returns
   */
  public tooltip(): HTMLElement[] {
    if (!this.interpretation) {
      return [];
    }
    if (typeof this.interpretation === 'string') {
      return [tooltip(this.name, html.parse(this.interpretation))];
    }
    dev.play(() => {
      // Sanity check!
      log.ensure(this.interpretation === sax.LOOKUP);
    });
    return this.lookup();
  }
}

/**
 * A postfix is part of the source designation, NOT a suffix. `Mani 1` and
 * `Mani 2` are two whole citations naming two distinct sources — not the
 * reference `Mani` followed by a page number.
 */
class Postfix extends Fix {
  /**
   *
   * @param variant
   * @returns
   */
  public override compose(variant: string): string {
    return `${variant} ${this.name}`;
  }

  /**
   *
   * @returns
   */
  protected override lookup(): HTMLElement[] {
    return MAPPING[this.name]!.tooltip();
  }
}

/**
 *
 */
class Prefix extends Fix {
  /**
   *
   * @param variant
   * @returns
   */
  public override compose(variant: string): string {
    return `${this.name} ${variant}`;
  }

  /**
   *
   * @returns
   */
  protected override lookup(): HTMLElement[] {
    const annot: ann.Annotation = ann.MAPPING[this.name]!;
    return [tooltip(this.name, [annot.fixFullForm ?? annot.fullForm])];
  }
}

/**
 * Add the given source to the mapping, including all space variants. A space
 * variant is obtained by deleting any number of spaces from a given string.
 * If the key has n spaces, this function adds 2^n entries to the MAPPING.
 *
 * @param key
 * @param reference
 */
function add(key: string, reference: Reference): void {
  const words: string[] = key.split(' ');
  /**
   *
   * @param index
   * @param current
   */
  function* spaceVariants(index: number, current: string): Generator<string> {
    const word: string | undefined = words[index];

    if (word === undefined) {
      // We've reached the end of the string.
      yield current;
      return;
    }

    // Branch 1: Keep the space.
    yield* spaceVariants(index + 1, `${current} ${word}`);

    // Branch 2: Remove the space.
    yield* spaceVariants(index + 1, current + word);
  }

  for (const variant of spaceVariants(1, words[0]!)) {
    log.ensure(MAPPING[variant] === undefined, 'duplicate key:', variant);
    MAPPING[variant] = reference;
  }
}

// Add all the variants to the map.
sax.DATA.forEach((raw: sax.Source): void => {
  const source: Source | undefined =
    raw.title || raw.description?.length
      ? new Source(raw.title, raw.description)
      : undefined;

  raw.variants.forEach((variant: string): void => {
    // Add the abbreviation without any fixes.
    add(variant, new Reference(source, variant));
    for (const [fixes, fixClass] of [
      [raw.postfixes, Postfix],
      [raw.prefixes, Prefix],
    ] as const) {
      Object.entries(fixes ?? {}).forEach(
        ([name, type]: [string, sax.Fix]): void => {
          const fix = new fixClass(name, type);
          add(fix.compose(variant), new Reference(source, variant, fix));
        }
      );
    }
  });
});

/**
 *
 * @param fixes
 * @param mapping
 */
function verifyFixLookups(
  fixes: Record<string, sax.Fix> | undefined | null,
  mapping: Record<string, unknown>
): void {
  if (!fixes) {
    return;
  }
  for (const [key, interpretation] of Object.entries(fixes)) {
    if (interpretation === sax.LOOKUP) {
      log.ensure(key in mapping, 'LOOKUP fix', key, 'is absent from the map!');
    }
  }
}

dev.play(() => {
  sax.DATA.forEach((source: sax.Source): void => {
    verifyFixLookups(source.postfixes, MAPPING);
    verifyFixLookups(source.prefixes, ann.MAPPING);
  });
});
