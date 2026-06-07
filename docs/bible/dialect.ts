/** Package dialect defines Bible dialects. */
import * as dial from '../dialect.js';
import * as css from '../css.js';

export type DIALECT =
  | 'Bohairic'
  | 'Sahidic'
  | 'Fayyumic'
  | 'Akhmimic'
  | 'Lycopolitan'
  | 'Mesokemic'
  | 'DialectP'
  | 'OldBohairic'
  | 'English'
  | 'Greek';

export type Code = 'B' | 'S' | 'F' | 'A' | 'L' | 'M' | 'P' | 'O' | 'E' | 'G';

/**
 *
 */
export class Dialect extends dial.Dialect<Code, DIALECT, Code> {
  /**
   *
   * @param code
   * @param name
   * @param article
   * @param coptic
   */
  public constructor(
    code: Code,
    name: DIALECT,
    article: dial.Article,
    public readonly coptic: boolean
  ) {
    super(code, name, article, code);
  }
}

const ALL_DIALECTS: Dialect[] = [
  new Dialect('B', 'Bohairic', dial.Article.BOHAIRIC, true),
  new Dialect('S', 'Sahidic', dial.Article.SAHIDIC, true),
  new Dialect('F', 'Fayyumic', dial.Article.FAYYUMIC, true),
  new Dialect('A', 'Akhmimic', dial.Article.AKHMIMIC, true),
  new Dialect('L', 'Lycopolitan', dial.Article.LYCOPOLITAN, true),
  new Dialect('M', 'Mesokemic', dial.Article.MESOKEMIC, true),
  new Dialect('P', 'DialectP', dial.Article.PROTO_THEBAN, true),
  new Dialect('O', 'OldBohairic', dial.Article.OLD_COPTIC, true),
  new Dialect('E', 'English', dial.Article.ENGLISH, false),
  new Dialect('G', 'Greek', dial.Article.GREEK, false),
];

// DIALECTS bears the dialects present in this page.
// Each page has a subset of the dialects. For highlighting purposes, only this
// subset is of interest.
export const DIALECTS: Dialect[] = ALL_DIALECTS.filter(
  (d: Dialect): boolean => !!document.querySelector(css.c(d.code))
);

const CODES: Set<Code> = new Set<Code>(
  DIALECTS.map((d: Dialect): Code => d.code)
);

/**
 *
 * @param code
 * @returns
 */
export function isCoptic(code: Code): boolean {
  return !!ALL_DIALECTS.find((d: Dialect): boolean => d.code === code)?.coptic;
}

/**
 *
 */
export class Manager extends dial.Manager<Code> {
  /**
   *
   */
  public constructor() {
    super('bd');
  }

  /**
   * @returns
   * NOTE: Unlike the `active` method, this method returns the list of inactive
   * languages that are actually present on this page. Languages that are absent
   * from this page are excluded.
   * Another distinction is that an empty or undefined array implies that no
   * languages are inactive, while an empty or undefined `active` array
   * implies that all languages are active.
   *
   * TODO: (#0) Try to privatize or omit the `active` method somehow, as it
   * includes languages that are absent from the page, which could be
   * problematic.
   */
  public inactive(): Code[] | undefined {
    const active: Code[] | undefined = this.active();
    const inactive: Code[] = Array.from(CODES).filter(
      (c: Code): boolean => !active?.includes(c)
    );
    return inactive.length && inactive.length !== DIALECTS.length
      ? inactive
      : undefined;
  }
}
