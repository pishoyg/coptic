// The `Source` interface below is the consumer-facing twin of the Zod
// `SCHEMA` in `dictionary/marcion_sourceforge_net/pisaxo.ts`. Keep the two
// definitions in sync — adding, removing, or retyping a field requires
// editing both.
// NOTE: In general, fields may be absent (`undefined`) or empty-placeholder
// (`null`). This is why we account for both values below.

export const LOOKUP: symbol;
export type Fix = string | null | typeof LOOKUP;

export const DATA: Source[];

/**
 * Source represents a source, and the different variants, postfixes, and
 * prefixes used to cite it.
 */
export interface Source {
  // TODO: (#522) Tighten `title` / `description` / `variants` once every
  // entry has real data — drop `?` and `| null`.

  /** title is the full title of the source. This could be HTML or plain text.
   */
  readonly title?: string | null;
  /**
   * description contains the full HTML description of the source, including
   * bibliographical details and hyperlinks.
   */
  readonly description?: string[] | null;

  /** variants is a list of abbreviation forms used to cite this source in
   * Crum's text. Sources were often cited inconsistently, which is why we
   * provide you with a list, so you can specify all alternatives.
   * TODO: (#522) Record variants.
   */
  readonly variants: string[];
  /**
   * typos records nonstandard variants that will never be shown to the users.
   * Most nonstandard variants should still go to the `variants` field. However,
   * nonstandard variants that are common typos should go to the `typos` field.
   * See #705.
   */
  readonly typos?: string[] | null;
  /** postfixes is a list of all postfixes that this abbreviation can bear.
   *
   * Notice that postfixes are distinct from suffixes. Postfixes are part of
   * the abbreviation, and they're usually (although not always) written in a
   * single word along with the original abbreviation. They make the original
   * abbreviation more specific, by referring to a place or department.
   * On the other hand, suffixes are numbers or number-like affixes, and
   * they're never written with the abbreviation as one word.
   * See examples of postfixes below.
   *
   * The fact that postfixes are parsable if written with the variant as a
   * single word, while suffixes must be separate, sometimes forces us to record
   * some otherwise-would-be suffixes as postfixes in order to be able to parse
   * them.
   * For example, 'BM' and 'BMOr' refer to the same source. 'Or' (for
   * 'oriental') is more appropriately treated as a suffix rather than a
   * postfix, but we treat it as a postfix because it's written as 'BMOr' not
   * 'BM Or'.
   */
  readonly postfixes?: Record<string, Fix> | null;
  /** prefixes is a list of all prefixes that this abbreviation can bear.
   *
   * Prefixes mirror postfixes, but they precede the variant rather than
   * follow it. For example, the 'P' of 'PCaiCoptMus' stands for 'papyrus'.
   *
   * Prefixes are far less common than postfixes.
   *
   * A prefix resolves its `LOOKUP` interpretation against the annotation
   * mapping, not the reference mapping — the opposite of a postfix. The
   * prefix 'ostr' of 'ostr Univ Coll London' looks up the annotation 'Ostr'
   * ('ostracon').
   *
   * Prefixes don't combine with postfixes. A source that records both yields
   * prefixed variants and postfixed variants, but never both at once.
   */
  readonly prefixes?: Record<string, Fix> | null;
}
