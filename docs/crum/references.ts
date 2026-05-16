import * as log from '../logger.js';
import * as drop from '../dropdown.js';
import * as cls from './cls.js';
import * as dev from '../dev.js';
import * as html from '../html.js';
import * as ann from './annotations.js';
import * as sax from './pisaxo.js';

export const MAPPING: Record<string, Reference> = {};

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
   * @param raw
   */
  public constructor(public readonly raw: sax.Source) {}

  /**
   * @returns Deep copies of the parsed title's child nodes.
   */
  public title(): Node[] {
    if (!this.raw.title) {
      return [];
    }
    if (!this.titleMemo) {
      this.titleMemo = new DocumentFragment();
      this.titleMemo.append(...html.parse(this.raw.title));
    }
    return Array.from(this.titleMemo.cloneNode(true).childNodes);
  }

  /**
   * @returns A deep copy of the parsed description list, or undefined if the
   *   source has no description.
   */
  public description(): HTMLUListElement | undefined {
    if (!this.raw.description?.length) {
      return undefined;
    }
    if (!this.descriptionMemo) {
      const ul: HTMLUListElement = document.createElement('ul');
      this.raw.description.forEach((innerHTML: string): void => {
        const li: HTMLLIElement = document.createElement('li');
        li.innerHTML = innerHTML;
        ul.append(li);
      });
      ul.querySelectorAll('a').forEach((a: HTMLAnchorElement): void => {
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
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

    fragment.append(...abbreviation(this.variant));

    fragment.append(...this.source.title());

    const description: HTMLUListElement | undefined = this.source.description();
    if (description) {
      fragment.append(description);
    }

    const tooltip = this.postfix?.tooltip();
    if (tooltip?.length) {
      fragment.append(document.createElement('br'), ...tooltip);
    }

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
    content: (Node | string)[],
    suffix: (Node | string)[] = []
  ): HTMLSpanElement {
    const span: HTMLSpanElement = document.createElement('span');
    span.classList.add(cls.REFERENCE);
    span.dataset[Reference.DATA_REF] = this.raw();
    span.append(...content, ...suffix);
    const tooltip: (Node | string)[] = [
      ...(/^ib\b/i.test(span.textContent) ? [ibidem(true)] : []),
      ...(this.tooltip()?.childNodes ?? []),
      ...Reference.suffixAnnotations(suffix),
    ];
    // TODO: (#522) This check will soon be unnecessary, because all references
    // will be guaranteed to have tooltips.
    if (tooltip.length) {
      drop.addDroppable(span, tooltip);
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
  private static suffixAnnotations(
    suffix: (Node | string)[]
  ): (Node | string)[] {
    return suffix.flatMap((node: string | Node): (Node | string)[] => {
      const text = typeof node === 'string' ? node : (node.textContent ?? '');
      const italic = node instanceof Element && node.nodeName === 'I';
      ann.RE.lastIndex = 0;
      return Array.from(text.matchAll(ann.RE))
        .map((match: RegExpExecArray): string => match[0])
        .flatMap((abb: string): (Node | string)[] => {
          const annot = ann.MAPPING[abb];
          return !annot?.suffix
            ? []
            : [
                ...abbreviation(abb, italic),
                html.maybeI(annot.fullForm, italic),
              ];
        });
    });
  }
}

/**
 *
 * @param name
 * @param italic
 * @returns
 */
function abbreviation(name: string | Node, italic?: boolean): HTMLElement[] {
  const span: HTMLSpanElement = document.createElement('span');
  span.append(html.maybeI(name, italic), ': ');
  span.classList.add(cls.ABBREVIATION);
  return [span];
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
    public readonly interpretation?: string | typeof sax.LOOKUP
  ) {}

  /**
   * @returns
   */
  public tooltip(): (Node | string)[] {
    if (typeof this.interpretation === 'string') {
      return [...abbreviation(this.name), ...html.parse(this.interpretation)];
    }
    if (this.interpretation === sax.LOOKUP) {
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

    dev.play(() => {
      // Sanity check!
      log.ensure(this.interpretation === undefined);
    });

    return [];
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
[...sax.DATA_1, ...sax.DATA_2].forEach((res: sax.Resource): void => {
  log.ensure(
    !!res.variants.length,
    'resource has no abbreviations listed:',
    res.source?.title
  );

  const source: Source | undefined = res.source
    ? new Source(res.source)
    : undefined;

  [...res.variants, ...(res.typos ?? [])].forEach(
    (variant: string, index: number): void => {
      const standard: string =
        index < res.variants.length ? variant : res.variants[0]!;
      // Add the abbreviation without any postfixes.
      add(variant, new Reference(source, standard));
      Object.entries(res.postfixes ?? {}).forEach(
        ([name, type]: [string, sax.PostfixType]): void => {
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
