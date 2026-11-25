/**
 * Exercise the links of KELLIA citations to the works they cite.
 *
 * Each case searches the lexicon for a KELLIA entry, and checks where one of
 * its citations links to. The cases cover every kind of link: a scan that our
 * website hosts, a page or a volume on the Internet Archive, a section that
 * lands on the work, an image that we find through an offset that we measured,
 * and a work that isn't available online.
 */
import * as play from '@playwright/test';
import * as cls from '../docs/crum/cls.js';
import * as css from '../docs/css.js';
import * as paths from '../docs/paths.js';

interface Case {
  /** query finds the KELLIA entry that gives the citation. */
  query: string;
  /** citation is the text of the citation. */
  citation: string;
  /** href is where the citation links to, or null if it isn't a link. */
  href: string | null;
}

const CASES: Case[] = [
  {
    query: 'temps, saison',
    citation: 'CD 391b',
    href: paths.crumScan('391b'),
  },
  {
    query: 'ensemble avec',
    citation: 'CD XVI',
    href: paths.crumScan('xvi'),
  },
  {
    query: 'temps, saison',
    citation: 'CDC 62a',
    href: paths.ifao('62a'),
  },
  {
    query: 'temps, saison',
    citation: 'DELC 208b',
    href: null,
  },
  {
    query: 'σπεκουλάτωρ',
    citation: 'Sophocles 1003b',
    href: 'https://archive.org/details/greeklexiconofro00soph/page/1003/mode/1up',
  },
  {
    query: 'σπεκουλάτωρ',
    citation: 'Preisigke 2:475',
    href: 'https://archive.org/details/wrterbuchdergrie0000prei_y4l3/page/n247/mode/1up',
  },
  {
    query: 'σπεκουλάτωρ',
    citation: 'LSJ 1626a',
    href: 'https://archive.org/details/greekenglishlexi0000lidd_y0v2/page/n1677/mode/1up',
  },
  {
    query: 'father (here as title), abbot',
    citation: 'Preisigke 1:1',
    href: 'https://archive.org/details/wrterbuchdergrie0001prei/page/n20/mode/1up',
  },
  {
    query: 'διατίθεμαι',
    citation: 'Kontopoulos 120B',
    href: 'https://archive.org/details/glexiknllynoagg00kontgoog/page/n132/mode/1up',
  },
  {
    query: 'all-holy, saintly',
    citation: 'Lampe 1003b',
    href: 'https://archive.org/details/patristicgreekle0000lamp/page/1003/mode/1up',
  },
  {
    query: 'I, me, my',
    citation: 'Till D 26',
    href: 'https://archive.org/details/koptischedialekt0000till/page/26/mode/1up',
  },
  {
    query: 'I, me, my',
    citation: 'LCG 68',
    href: 'https://archive.org/details/copticgrammarwit0000layt/page/68/mode/1up',
  },
  {
    query: 'Umstandsatzkonverter',
    citation: 'LCG § 396, 413',
    href: 'https://archive.org/details/copticgrammarwit0000layt/mode/1up',
  },
  {
    query: 'red lead, minium',
    citation: 'du Cange 1374',
    href: 'https://archive.org/details/A210119/page/n54/mode/1up',
  },
  {
    query: 'in turn, in orderly fashion',
    citation: 'du Cange 1052',
    href: 'https://archive.org/details/bub_gb_IFNLAAAAcAAJ/page/n581/mode/1up',
  },
];

/**
 * @param page
 * @param query - The query that finds the KELLIA entry.
 * @param citation - The text of the citation.
 * @returns The first citation with the given text.
 */
async function find(
  page: play.Page,
  query: string,
  citation: string
): Promise<play.Locator> {
  await page.goto(paths.lexicon(encodeURIComponent(query)), {
    waitUntil: 'networkidle',
  });
  const source: play.Locator = page
    .locator(css.c(cls.SOURCE), {
      hasText: new RegExp(`^${RegExp.escape(citation)}$`),
    })
    .first();
  await play.expect(source).toBeVisible();
  return source;
}

play.test.describe('KELLIA Citation Links', () => {
  for (const { query, citation, href } of CASES) {
    play.test(`${citation} links to ${href ?? 'nothing'}`, async ({ page }) => {
      const source: play.Locator = await find(page, query, citation);
      const link: play.Locator = source.locator('a');
      if (href === null) {
        await play.expect(link).toHaveCount(0);
        return;
      }
      await play.expect(link).toHaveAttribute('href', href);
      await play.expect(link).toHaveAttribute('target', '_blank');
    });
  }

  play.test('a link keeps the color of the citation', async ({ page }) => {
    const source: play.Locator = await find(page, 'temps, saison', 'CD 391b');
    const color: string = await source.evaluate(
      (el: Element): string => getComputedStyle(el).color
    );
    const link: play.Locator = source.locator('a');
    await play.expect(link).toHaveCSS('color', color);
    await link.hover();
    await play.expect(link).toHaveCSS('color', color);
  });
});
