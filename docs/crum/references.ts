import * as log from '../logger.js';
import * as tool from '../tooltip.js';
import * as cls from './cls.js';
import * as dev from '../dev.js';
import * as html from '../html.js';
import * as ann from './annotations.js';
import * as sax from './pisaxo.js';

export const MAPPING: Record<string, Reference> = {};

/**
 * @param text
 * @returns
 */
export function ib(text: string): boolean {
  return /^ib\b/i.test(text);
}

/**
 * @param classify
 * @returns
 */
export function ibidem(classify = false): HTMLElement {
  const i: HTMLElement = document.createElement('i');
  i.textContent = 'ibidem';
  if (classify) {
    i.classList.add(cls.IBIDEM);
  }
  return i;
}

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
   * @returns A deep copy of the parsed description list, or undefined if the
   *   source has no description.
   */
  public description(): HTMLUListElement | undefined {
    if (!this.descriptionHTML?.length) {
      return undefined;
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
    return this.descriptionMemo.cloneNode(true) as HTMLUListElement;
  }
}

/**
 * Reference represents a particular way of citing a source in the text.
 */
export class Reference {
  private static readonly DATA_REF = 'ref';

  /**
   *
   * @param source - Cited source.
   * @param variant - Abbreviation used to cite this source.
   * @param postfix - Postfix appended to the abbreviation, if any.
   */
  public constructor(
    // TODO: (#522) The `source` field should become required once all sources
    // are populated.
    public readonly source: Source | undefined,
    public readonly variant: string,
    public readonly postfix?: Postfix
  ) {}

  /**
   *
   * @returns
   */
  public tooltip(): DocumentFragment | undefined {
    if (!this.source) {
      return undefined;
    }

    const fragment: DocumentFragment = new DocumentFragment();

    fragment.append(
      abbreviation(this.variant),
      ...this.source.title(),
      ...[this.source.description(), this.postfix?.tooltip()].filter(
        (e) => e !== undefined
      )
    );

    return fragment;
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
    span.dataset[Reference.DATA_REF] = this.raw();
    span.append(...content, ...suffix);
    const tooltip: (Node | string)[] = [];
    if (ib(span.textContent)) {
      tooltip.push(ibidem(true));
    }
    tooltip.push(
      ...(this.tooltip()?.childNodes ?? []),
      ...Reference.suffixAnnotations(suffix)
    );

    // Make all hyperlinks in the tooltip external.
    tooltip
      .filter((n: Node | string) => n instanceof Element)
      .forEach((node: Element): void => {
        node.querySelectorAll('a').forEach((a: HTMLAnchorElement): void => {
          a.target = '_blank';
          a.rel = 'noreferrer noopener';
        });
      });

    // TODO: (#522) This check will soon be unnecessary, because all references
    // will be guaranteed to have tooltips.
    if (tooltip.length) {
      tool.addTooltip(span, tooltip);
    }

    return span;
  }

  /**
   * @returns
   */
  public raw(): string {
    if (!this.postfix) {
      return this.variant;
    }
    return `${this.variant} ${this.postfix.name}`;
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
      const text: string = html.textContent(node);
      const italic = node instanceof Element && node.nodeName === 'I';

      for (const match of text.matchAll(ann.RE)) {
        const abb: string = match[0];
        const annot = ann.MAPPING[abb];
        if (!annot?.suffix) {
          log.warn(
            'Non-suffix annotation',
            abb,
            'found in suffix',
            Array.from(suffix).map(html.textContent).join('')
          );
          continue;
        }
        const div: HTMLDivElement = document.createElement('div');
        div.append(
          abbreviation(abb, italic),
          html.maybeI(annot.fullForm, italic)
        );
        yield div;
      }
    }
  }
}

/**
 *
 * @param name
 * @param italic
 * @returns
 */
function abbreviation(name: string | Node, italic?: boolean): Element {
  return html.classify(
    html.span(html.maybeI(name, italic), ': '),
    cls.ABBREVIATION
  );
}

/**
 *
 */
class Postfix {
  /**
   *
   * @param name
   * @param interpretation
   */
  public constructor(
    public readonly name: string,
    public readonly interpretation: sax.Postfix
  ) {}

  /**
   * @returns
   */
  public tooltip(): HTMLDivElement | undefined {
    const content: Node[] = this.tooltipAux();
    if (!content.length) {
      return undefined;
    }

    const div: HTMLDivElement = document.createElement('div');
    div.append(...content);
    return div;
  }

  /**
   * @returns
   */
  private tooltipAux(): Node[] {
    if (!this.interpretation) {
      return [];
    }

    if (typeof this.interpretation === 'string') {
      return [abbreviation(this.name), ...html.parse(this.interpretation)];
    }

    dev.play(() => {
      // Sanity check. This is the only option left.
      log.ensure(this.interpretation === sax.LOOKUP);
    });

    // The postfix 'Am' (as in 'ShAm', under ⲏⲡⲥ 525) refers to Amélineau,
    // but we only record the variant 'A' for Amélineau — 'Am' was
    // intentionally excluded from its variants to avoid colliding with Actes
    // des Martyrs (and Amos as well). Redirect the lookup so the tooltip
    // still resolves.
    // NOTE: The tooltip will use `A` as the abbreviation, although the text
    // uses `Am`.
    const name = this.name === 'Am' ? 'A' : this.name;
    return Array.from(MAPPING[name]?.tooltip()?.childNodes ?? []);
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
  /**
   *
   * @param index
   * @param current
   */
  function* spaceVariants(index: number, current: string): Generator<string> {
    const char: string | undefined = key[index];

    if (char === undefined) {
      // We've reached the end of the string.
      yield current;
      return;
    }

    if (char === ' ') {
      // Branch 1: Keep the space.
      yield* spaceVariants(index + 1, `${current} `);

      // Branch 2: Remove the space.
      yield* spaceVariants(index + 1, current);
      return;
    }

    // Not a space: Must keep the character and move on
    yield* spaceVariants(index + 1, current + char);
  }

  for (const variant of spaceVariants(0, '')) {
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

  [...raw.variants, ...(raw.typos ?? [])].forEach(
    (variant: string, index: number): void => {
      const standard: string =
        index < raw.variants.length ? variant : raw.variants[0]!;
      // Add the abbreviation without any postfixes.
      add(variant, new Reference(source, standard));
      Object.entries(raw.postfixes ?? {}).forEach(
        ([name, type]: [string, sax.Postfix]): void => {
          add(
            `${variant} ${name}`,
            new Reference(source, standard, new Postfix(name, type))
          );
        }
      );
    }
  );
});

dev.play(() => {
  // Verify that all LOOKUP postfixes are present.
  Object.values(MAPPING)
    .map((reference: Reference): string | undefined =>
      reference.postfix?.interpretation === sax.LOOKUP
        ? reference.postfix.name
        : undefined
    )
    .filter((postfix) => postfix !== undefined)
    .forEach((postfix: string) => {
      log.ensure(
        postfix in MAPPING,
        'LOOKUP postfix',
        postfix,
        'is absent from the map'
      );
    });
});
