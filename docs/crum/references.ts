import * as log from '../logger.js';
import * as drop from '../dropdown.js';
import * as cls from './cls.js';
import * as dev from '../dev.js';
import * as html from '../html.js';
import * as ann from './annotations.js';
import * as sax from './pisaxo.js';

export const MAPPING: Record<string, Reference> = {};

/**
 *
 * @param content
 * @param flag
 * @returns
 */
function maybeI(content: Node | string, flag?: boolean): Node | string {
  if (!flag) {
    return content;
  }
  const i: HTMLElement = document.createElement('i');
  i.append(content);
  return i;
}

/**
 * @returns
 */
export function ibidem(): HTMLElement {
  const i: HTMLElement = document.createElement('i');
  i.textContent = 'ibidem';
  i.classList.add(cls.IBIDEM);
  return i;
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
    public readonly source: sax.Source | undefined,
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

    if (this.source.title) {
      fragment.append(...html.parse(this.source.title));
    }

    if (this.source.description?.length) {
      const description: HTMLUListElement = document.createElement('ul');
      this.source.description.forEach((innerHTML: string) => {
        const li = document.createElement('li');
        li.innerHTML = innerHTML;
        description.append(li);
      });
      fragment.append(description);
    }

    const tooltip = this.postfix?.tooltip();
    if (tooltip?.length) {
      fragment.append(document.createElement('hr'), ...tooltip);
    }

    fragment.querySelectorAll('a').forEach((a: HTMLAnchorElement): void => {
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
    });

    return fragment;
  }

  /**
   *
   * @param raw
   * @returns
   */
  public span(...raw: (Node | string)[]): HTMLSpanElement {
    const span: HTMLSpanElement = document.createElement('span');
    span.classList.add(cls.REFERENCE);
    span.dataset[Reference.DATA_REF] = this.raw();
    span.append(...raw);
    const tooltip: (Node | string)[] = [
      ...(/^ib\b/i.test(span.textContent) ? [ibidem()] : []),
      ...(this.tooltip()?.childNodes ?? []),
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
   * Remove all tooltips, as well as `reference` tags.
   *
   * NOTE: We do NOT account for the case that the root itself is an artifact
   * that needs to be gotten rid of.
   *
   * @param elem
   */
  public static dereference(elem: ChildNode): void {
    if (!(elem instanceof Element)) {
      // This is probably a text node. Definitely no reference here! Do nothing!
      return;
    }

    elem
      .querySelectorAll(`.${drop.CLS.DROPPABLE}`)
      .forEach((el: Element): void => {
        el.remove();
      });

    // Remove the .reference span, retaining the children.
    elem.querySelectorAll(`.${cls.REFERENCE}`).forEach((el: Element): void => {
      el.replaceWith(...el.childNodes);
    });
  }

  /**
   *
   * @param span
   * @param {...any} suffix
   *
   * Isn't it better to endow the `Reference` class with a `suffix` field and
   * grow this field, constructing a complete <span> tag at the end, instead of
   * starting with a partial <span> tag and gradually growing it with suffixes?
   *
   * That would be a cleaner design, but it's not compatible with our current
   * pipeline, which does several passes over the DOM.
   * - In the first pass, references are detected, and marked with <span> tags
   *   in the HTML.
   * - In the second pass, reference suffixes (called "followups" in that
   *   context) are picked up and added to the spans.
   *
   * We can't do the above in a single pass, as that would make it challenging
   * to handle such cases as the following (where K is the variant of another
   * source rather than a followup suffix of P):
   *   P 44 66, K 179[1]
   * See followup logic for more details.
   *
   * [1] https://remnqymi.com/crum/510.html#:~:text=P%2044%2066,%20K%20179
   */
  public static suffix(
    span: HTMLSpanElement,
    ...suffix: (string | Node)[]
  ): void {
    // Append the suffix.
    span.append(...suffix);
    // Expand the tooltip with any annotations from the suffix.
    // TODO: (#0) It's better to use your own custom class, instead of relying
    // on `drop.CLS.DROPPABLE`.
    span.querySelector(`.${drop.CLS.DROPPABLE}`)?.append(
      ...suffix.flatMap((node: string | Node): (Node | string)[] => {
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
                  document.createElement('hr'),
                  ...abbreviation(abb, italic),
                  maybeI(annot.fullForm, italic),
                ];
          });
      })
    );
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
  span.append(maybeI(name, italic), ': ');
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

  [...res.variants, ...(res.typos ?? [])].forEach(
    (variant: string, index: number): void => {
      const standard: string =
        index < res.variants.length ? variant : res.variants[0]!;
      // Add the abbreviation without any postfixes.
      add(variant, new Reference(res.source, standard));
      Object.entries(res.postfixes ?? {}).forEach(
        ([name, type]: [string, sax.PostfixType]): void => {
          add(
            `${variant} ${name}`,
            new Reference(res.source, standard, new Postfix(name, type))
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
