/**
 * Exercise wiki handlers.
 */
import * as play from '@playwright/test';
import * as cls from '../docs/crum/cls.js';
import * as drop from '../docs/dropdown.js';
import * as paths from '../docs/paths.js';
import * as base from './base.js';

/**
 * WikiElementKey represents a name covering a set of Wiki element.
 */
type WikiElementKey =
  | 'references'
  | 'bible'
  | 'dialectTooltips'
  | 'annotations'
  | 'pages'
  | 'semicolons';

const TEST_CASES: {
  key: string;
  want: Partial<Record<WikiElementKey, number>>;
}[] = [
  {
    // 88 contains a relatively large piece of text, so we include to cover a
    // lot of common cases.
    key: '88',
    want: {
      references: 147,
      bible: 122,
      dialectTooltips: 388,
      annotations: 76,
    },
  },
  {
    // 54 is the largest entry. At 5 pages long, it is the longest entry in
    // Crum.
    key: '54',
    want: {
      references: 389,
      bible: 305,
      dialectTooltips: 832,
      annotations: 237,
    },
  },
  {
    // 1144 covers cases with diacritics and boundaries. Particularly, in
    // ‘Amélineau Géog’:
    // - ‘Am’ shouldn't match ‘Amos’ (which would happen if the text were
    //   NFC-normalized and the non-Unicode-aware `\b` was used to match word
    //   boundaries).
    // - ‘Ge’ shouldn't match ‘Genesis’ (which would happen if the text was
    //   NFD-normalized, and the diacritic was misinterpreted as a word
    //   boundary).
    key: '1144',
    want: {
      references: 7,
      bible: 6,
      dialectTooltips: 9,
      annotations: 11,
    },
  },
  {
    // 3271 covers spacing variants. Particularly, ‘Schweinf Ar Pfl’ is cited as
    // ‘Schweinf ArPfl’ in this page, and we want to make sure we're covering
    // it.
    key: '3271',
    want: {
      references: 3,
      bible: 0,
      dialectTooltips: 1,
      annotations: 3,
    },
  },
  {
    // 1082 covers a case where ‘P’ was mistakenly parsed as a suffix, thus
    // breaking our reference detection. We make sure it's actually parsed as a
    // source.
    key: '1082',
    want: {
      references: 2,
      bible: 2,
      dialectTooltips: 13,
      annotations: 9,
    },
  },
  {
    // 629 has a corrigendum.
    key: '629',
    want: {
      references: 23,
      bible: 18,
      dialectTooltips: 66,
      annotations: 30,
    },
  },
  {
    // 2531 has a tricky Bible reference.
    key: '2531',
    want: {
      references: 3,
      bible: 1,
      dialectTooltips: 2,
      annotations: 3,
    },
  },
  {
    // 732 contains instances of 'pp' (pages).
    key: '732',
    want: {
      pages: 6,
    },
  },
  {
    // 1637 contains a page reference without a column.
    key: '1637',
    want: {
      pages: 1,
    },
  },
  {
    // 2157 contains a semicolon immediately followed by a word character.
    // See #692 for context.
    key: '2157',
    want: {
      semicolons: 11,
    },
  },
];

/**
 * QUERIES is a map of test keys to their corresponding CSS selectors.
 */
const QUERIES: Record<WikiElementKey, string> = {
  references: `.${cls.WIKI} .${cls.REFERENCE}`,
  bible: `.${cls.WIKI} .${cls.BIBLE}`,
  dialectTooltips: `.${cls.WIKI} .${cls.DIALECT} .${drop.CLS.DROPPABLE}`,
  annotations: `.${cls.WIKI} .${cls.ANNOTATION}`,
  pages: `.${cls.PAGE}`,
  semicolons: `.${cls.SEMICOLON}`,
};

base.test.describe('Wiki Reference Handlers', () => {
  for (const testCase of TEST_CASES) {
    base.test(
      `Inserts the correct number of objects on '${testCase.key}'.`,
      async ({ page }: { page: play.Page }): Promise<void> => {
        await page.goto(paths.crum(testCase.key), {
          waitUntil: 'networkidle',
        });
        await Promise.all(
          Object.entries(testCase.want).map(
            ([key, value]: [string, number]): Promise<void> =>
              play.expect
                .soft(page.locator(QUERIES[key as WikiElementKey]))
                .toHaveCount(value)
          )
        );
      }
    );
  }
});

base.test.describe('Copy Wiki Entry Text', () => {
  base.test(
    "Copies the entry text to the clipboard on '28'.",
    async ({
      page,
      context,
    }: {
      page: play.Page;
      context: play.BrowserContext;
    }): Promise<void> => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto(paths.crum('28'), { waitUntil: 'networkidle' });

      // The copy button is `visibility: hidden` until the entry is hovered,
      // so hover first to make it actionable.
      const entry = page.locator(`.${cls.ENTRY}`).first();
      await entry.hover();
      await entry.locator(`.${cls.COPY}`).click();

      const yanked: string = await page.evaluate(
        (): Promise<string> => navigator.clipboard.readText()
      );
      play.expect(yanked).toBe(
        `    ⲃⲁⲗ SB, ⲃⲉⲗ AA2F, DM bel nn m, eye: Job 16 20 SB, Ps 53 7 SB, ib 33 16 SA (Cl 22 6) B, Pro 4 25 SAB, Is 30 20 SBF, Lam 2 18 B, ὀφθαλμός; Sa 11 19 S, Mk 8 23 SB ὄμμα; ⲉⲓⲁⲧ Ge 18 2 S not true var, cf Ps 53 7, 91 11 S ⲁⲡⲁⲃ. ⲙⲉϩ ⲉⲓⲁⲧϥ, ib 90 8 B ϯ ⲛⲓⲁⲧⲕ ⲛⲛⲉⲕⲃ.
    ⲕⲉⲕⲉ ⲛⲃ. Ps 16 8 S (B ⲁⲗⲟⲩ ⲛⲃ.) κόρη ὀφθ., which Glos 25 S = ϫⲛⲣⲱⲙⲉ ⲛⲛⲃ.; ⲃ. ⲛⲛⲉϩ S (l ⲛⲉⲛϩ) العين السفلا lower eye(lid ?) Scala frag EW 1921.
    ⲃ. ⲉⲧⲕⲏⲕ PMéd 61 S, peeled, skinned eyes (disease), cf ⲕⲁⲕ ⲃ. πτίλος Lev 21 20 B & ? PLond 4 217 name Πκακουϩάλ; ⲃ. ⲉⲧⲱ (l ⲟ) ⲛⲥⲓⲟⲩ PMéd 64 S star-eyed (disease); ⲃ. ⲉⲧⲱ ⲛⲕⲁⲕⲉ ib 89 S darkened, obscured eye (disease), cf Ps 68 23, Lam 5 17 B; ϣⲟⲩⲃ. charm in Cambridge Univ Libr (Taylor-Schechter) B streaming eye (disease), cf ϣⲟⲩⲙⲏ; ϣⲧⲉⲙⲃⲉⲗ BM 524 F closing of eye (blindness ?), cf Is 33 15 F; other diseases v PMéd 331; eyes dazzled by light ⲛⲉⲁⲛⲉⲩⲃ. ϩⲧⲟⲙⲧⲙ PS 5, 8 S, cf Ge 48 10 S.
    ⲃ. ⲃⲱⲛ, evil eye Va 61 93 B ⲁⲕⲟⲩⲱⲙ ϧⲉⲛⲟⲩⲃ. ⲃ. ⲛⲥⲁⲙⲡⲉⲧϩⲱⲟⲩ.
    ⲙⲉⲧⲃ. ⲙⲃⲱⲕ ὀφθαλμοδουλεία Eph 6 6 B, Col 3 22 B = S ⲙⲛⲧⲉⲓⲁ ⲛϭⲁⲩⲟⲛ, cf Ps 122 2.
    ⲃ. ⲛⲁⲃⲱⲕ κύαμος ἑλληνικός PMéd 267 S, Z 629 S, WS 52 S, cf DM 5 24 ⲃⲉⲗ n ⲉⲃⲱⲕ.
    ⲃ. ⲛⲉⲙⲟⲩ S, cat's eye αἰλούρου ὀφθ., CR '87 376.
    ⲃ. ⲛⲃⲛⲛⲉ S date's eye i e ? date stone, P 43 233 (ⲅⲓ)ⲅⲁⲣⲧⲟⲛ· ⲛⲃ. ⲛⲛⲃⲛⲛⲉ عيون اقماع البلح (though قمع is said to be the outer casing of a fruit). In P 44 80 ⲅⲏⲅⲁⲣⲧⲁ = عنب, in Nu 6 4 B = زبيب.
    ⲣⲓⲕⲉ ⲙⲃ. ῥιπὴ ὀφθ. 1 Cor 15 52 SB, Miss 4 711 S, BMis 532 S, Va 69 124 B divinity of Only begotten not divided from humanity ⲛⲟⲩⲣ. ⲛⲃ.
    ϭⲱⲣⲉⲙ ⲛⲃ. νεῦμα ὀφθ. Is 3 16 B = S ⲕⲓⲙ ⲛⲃ.
    ⲥⲁⲓⲏ ⲛⲃ. S = B ⲥⲁⲓⲉ ⲃ. μετὰ κάλλους ὀφθ. 1 Kg 16 12, εὐόμματος Mélanges Ch. Moeller 3 S, Miss 4 738 S, C 43 63 B.
    ϯ ⲱⲟⲩ ⲛⲃ. μακαρίζειν Ge 30 13 B, Job 29 11 B (cf ⲱⲟⲩ ⲛⲓⲁⲧ⸗).
    ϥⲁⲓ ⲃ. ⲉⲡϣⲱⲓ B αἴρειν ὀφθ. Is 60 4, Zech 1 18, Lu 6 20 (all = S ϥⲓ ⲉⲓⲁⲧ⸗ ⲉϩⲣⲁⲓ).
    ϩⲓ ⲛⲟⲩⲃ., cast a glance (from window) MG 25 128 B.
    ⲧⲁⲥⲃ. S BAp 160, cf ⲙⲛⲧⲧⲁⲥⲃ. μετεωρισμὸς ὀφθ. Si 23 5 S = ib 26 9 ⲙⲛⲧϫⲁⲥⲓⲃ.
    ϫⲁⲣⲃ. στηρίζων ὀφθ. Eccl 11 9 S, Mor 37 78 S ἀναιδέστερος, BMis 521 S.
    ⲁⲧⲃ. ἀναιδής Is 56 11 S (in Pro 25 23 S, Si 23 6 S = ⲁⲧϣⲓⲡⲉ A), ShZ 476 S.    ⲙⲛⲧⲁⲧⲃ. Pro 21 29 S (var ⲙⲛⲧⲁⲧϣⲓⲡⲉ, Gk adv), ShWess 18 142 S, ShMun 165 S.
    ⲉⲧⲙⲉϩ ⲙⲃ. πολυόμματος CaiEuch 317 B = ⲉⲧⲟ ⲛϩⲁϩ ⲛⲃ. P 12920 127 S.
    ⲛⲃ. ϩⲓⲃ. ὀφθ. κατ' ὀφθ. Nu 14 14 S (ⲃ. ⲟⲩⲃⲉⲃ. B).
    In place-name τόπος Πταρϣβάλ (Preisigke).`
      );
    }
  );
});
