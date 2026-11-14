/**
 * Exercise tooltip placement.
 *
 * Tooltips are anchor-positioned popovers, and browsers disagree on the corner
 * cases (see the NOTE in `docs/tooltip.css`). These tests hover real triggers
 * in the positions that have broken before, and check that each tooltip shows
 * up next to its trigger, inside the viewport.
 *
 * NOTE: Playwright's Chromium is much newer than the Qt WebEngine in Anki
 * Desktop, which is where the tooltips last broke (they opened with a height of
 * zero far down the page). These tests guard the placement logic, but they
 * can't catch every engine-specific quirk.
 */
import * as play from '@playwright/test';
import * as cls from '../docs/crum/cls.js';
import * as css from '../docs/css.js';
import * as paths from '../docs/paths.js';
import * as tool from '../docs/tooltip.js';

/* Crum 1 (ⲁ) is long, and it cites Shenoute, whose tooltip is the tallest on
 * the page. */
const KEY = '1';

/* Attribute marking the trigger that a test picked, so the test can find it
 * again after picking it inside the page. */
const PICKED = 'data-picked';

/* Where to place a trigger's center, as a fraction of the viewport height (0 is
 * the top, 1 is the bottom). */
const AT = { TOP: 0.1, UPPER: 0.25, MIDDLE: 0.5, LOW: 0.9, BOTTOM: 0.98 };

/* The gutter that `--shift-to-fit` leaves at the viewport's right edge. */
const GUTTER = 8;

/* The height of a trigger that wraps across lines, in pixels. */
const TALL = 100;

/* A viewport height, in pixels, that Shenoute's tooltip is taller than on
 * every project. */
const SHORT = 480;

/* Pixel tolerance for comparing edges. */
const TOLERANCE = 1;

interface PickArgs {
  selector: string;
  tooltip: string;
  picked: string;
  rule: 'right' | 'long';
  anchorName: string;
  positionAnchor: string;
}

/**
 * Pick the trigger that scores highest among those in the second half of the
 * page, and mark it.
 *
 * @param page
 * @param score - Name of the scoring rule: `right` prefers the trigger that
 * ends furthest to the right; `long` prefers the trigger with the longest
 * tooltip text.
 * @returns A locator for the picked trigger.
 */
async function pick(
  page: play.Page,
  score: 'right' | 'long'
): Promise<play.Locator> {
  await page.evaluate(
    ({
      selector,
      tooltip,
      picked,
      rule,
      anchorName,
      positionAnchor,
    }: PickArgs): void => {
      const all = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const tooltips = Array.from(
        document.querySelectorAll<HTMLElement>(tooltip)
      );
      const value = (el: HTMLElement): number => {
        if (rule === 'right') {
          return el.getBoundingClientRect().right;
        }
        const anchor = el.style.getPropertyValue(anchorName);
        return (
          tooltips.find(
            (t: HTMLElement): boolean =>
              t.style.getPropertyValue(positionAnchor) === anchor
          )?.textContent.length ?? 0
        );
      };
      const candidates = all.slice(Math.floor(all.length / 2));
      if (!candidates.length) {
        throw new Error(`No triggers match ${selector}!`);
      }
      const best = candidates.reduce(
        (a: HTMLElement, b: HTMLElement): HTMLElement =>
          value(b) > value(a) ? b : a
      );
      best.setAttribute(picked, '');
    },
    {
      selector: css.nested(cls.WIKI, cls.REFERENCE),
      tooltip: css.c(tool.CLS.TOOLTIP),
      picked: PICKED,
      rule: score,
      anchorName: tool.ANCHOR_NAME,
      positionAnchor: tool.POSITION_ANCHOR,
    }
  );
  return page.locator(`[${PICKED}]`);
}

interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Placement {
  trigger: Rect;
  tooltip: Rect;
  // The tooltip's full content height, scrolled or not.
  content: number;
  viewport: { width: number; height: number };
}

/**
 * Scroll the trigger's center to the given height in the viewport, hover over
 * it, and measure where its tooltip lands.
 *
 * @param page
 * @param trigger
 * @param at - Where to place the trigger's center, as a fraction of the
 * viewport height (0 is the top, 1 is the bottom).
 * @returns The placement of the trigger and its tooltip.
 */
async function hover(
  page: play.Page,
  trigger: play.Locator,
  at: number
): Promise<Placement> {
  await trigger.evaluate((el: Element, fraction: number): void => {
    const rect = el.getBoundingClientRect();
    // Scroll instantly: the site scrolls smoothly by default, and the page
    // would keep moving under the mouse.
    window.scrollBy({
      top: rect.top + rect.height / 2 - fraction * window.innerHeight,
      behavior: 'instant',
    });
  }, at);
  await trigger.hover();

  // Find the trigger's own tooltip. (Triggers can nest, so more than one
  // tooltip may be open.)
  const anchor: string = await trigger.evaluate(
    (el: Element, name: string): string =>
      (el as HTMLElement).style.getPropertyValue(name),
    tool.ANCHOR_NAME
  );
  play.expect(anchor).toBeTruthy();
  const tooltip = page.locator(
    `${css.c(tool.CLS.TOOLTIP)}[style*="${tool.POSITION_ANCHOR}: ${anchor};"]`
  );
  await play.expect(tooltip).toBeVisible();
  // Wait for the fade-in to finish, so the tooltip is in its final place.
  await play.expect(tooltip).toHaveCSS('opacity', '1');

  const rect = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  };
  return {
    trigger: await trigger.evaluate(rect),
    tooltip: await tooltip.evaluate(rect),
    content: await tooltip.evaluate((el: Element): number => el.scrollHeight),
    // The viewport, without the scrollbars.
    viewport: await page.evaluate((): { width: number; height: number } => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    })),
  };
}

/**
 * Move the mouse away, and wait for every tooltip to close.
 *
 * Wait for the fade-out to finish too: until then, a closing tooltip still
 * intercepts the pointer, and Playwright retries the next hover by scrolling
 * the trigger into view, which the site animates.
 *
 * @param page
 */
async function unhover(page: play.Page): Promise<void> {
  await page.mouse.move(0, 0);
  await play
    .expect(page.locator(css.c(tool.CLS.TOOLTIP)).filter({ visible: true }))
    .toHaveCount(0);
}

/**
 * Check that the tooltip is visible, inside the viewport, and right next to
 * its trigger (below or above it) without covering it.
 *
 * @param p - The placement to check.
 * @returns Whether the tooltip is below its trigger (as opposed to above it).
 */
function expectNextToTrigger(p: Placement): boolean {
  const { trigger, tooltip, viewport } = p;

  play.expect(tooltip.bottom - tooltip.top).toBeGreaterThan(0);
  play.expect(tooltip.top).toBeGreaterThanOrEqual(-TOLERANCE);
  play.expect(tooltip.left).toBeGreaterThanOrEqual(-TOLERANCE);
  play.expect(tooltip.bottom).toBeLessThanOrEqual(viewport.height + TOLERANCE);
  play.expect(tooltip.right).toBeLessThanOrEqual(viewport.width + TOLERANCE);

  const below = Math.abs(tooltip.top - trigger.bottom) <= TOLERANCE;
  const above = Math.abs(tooltip.bottom - trigger.top) <= TOLERANCE;
  play.expect(below || above).toBe(true);
  return below;
}

/**
 * Load the test page.
 *
 * @param root0 - Playwright's test fixtures.
 * @param root0.page - The page to load into.
 */
async function load({ page }: { page: play.Page }): Promise<void> {
  await page.goto(paths.crum(KEY), { waitUntil: 'networkidle' });
}

play.test.describe('Tooltip Placement', () => {
  play.test.beforeEach(load);

  play.test(
    'Shows a tooltip below a trigger far down the page.',
    async ({ page }: { page: play.Page }): Promise<void> => {
      // The last Bible reference is several viewports down the page.
      const trigger = page.locator(css.nested(cls.WIKI, cls.BIBLE)).last();
      const p = await hover(page, trigger, AT.UPPER);
      play.expect(expectNextToTrigger(p)).toBe(true);
      // There is room below, so the tooltip shows in full, aligned with the
      // trigger's left edge.
      play
        .expect(Math.abs(p.tooltip.bottom - p.tooltip.top - p.content))
        .toBeLessThanOrEqual(TOLERANCE);
      play
        .expect(Math.abs(p.tooltip.left - p.trigger.left))
        .toBeLessThanOrEqual(TOLERANCE);
    }
  );

  play.test(
    'Flips a tooltip above a trigger near the bottom of the viewport.',
    async ({ page }: { page: play.Page }): Promise<void> => {
      const trigger = page.locator(css.nested(cls.WIKI, cls.BIBLE)).last();
      const p = await hover(page, trigger, AT.BOTTOM);
      play.expect(expectNextToTrigger(p)).toBe(false);
    }
  );
});

play.test.describe('Tooltip Placement Near the Viewport Edges', () => {
  play.test.beforeEach(load);

  play.test(
    'Shifts a tooltip leftwards when the trigger is near the right edge.',
    async ({ page }: { page: play.Page }): Promise<void> => {
      const trigger = await pick(page, 'right');
      const p = await hover(page, trigger, AT.UPPER);
      play.expect(expectNextToTrigger(p)).toBe(true);
      // The tooltip is too wide to start at the trigger's left edge, so it
      // shifts leftwards, just enough to fit.
      const width = p.tooltip.right - p.tooltip.left;
      play
        .expect(p.trigger.left + width)
        .toBeGreaterThan(p.viewport.width - GUTTER);
      play.expect(p.tooltip.left).toBeLessThan(p.trigger.left);
      play
        .expect(Math.abs(p.tooltip.right - (p.viewport.width - GUTTER)))
        .toBeLessThanOrEqual(TOLERANCE);
    }
  );

  play.test(
    'Fits a tooltip taller than the viewport next to its trigger.',
    async ({ page }: { page: play.Page }): Promise<void> => {
      // Shorten the viewport, so that the tooltip is taller than it on every
      // project, desktop included.
      const size = page.viewportSize();
      if (!size) {
        throw new Error('The page has no viewport!');
      }
      await page.setViewportSize({ width: size.width, height: SHORT });
      // Shenoute's tooltip lists many works, which makes it the tallest.
      const trigger = await pick(page, 'long');
      const placements: Placement[] = [];
      for (const at of [AT.TOP, AT.MIDDLE, AT.LOW]) {
        placements.push(await hover(page, trigger, at));
        // So that the next hover shows the tooltip afresh.
        await unhover(page);
      }
      // The premise: the tooltip is taller than the viewport.
      play
        .expect(
          Math.min(...placements.map((p: Placement): number => p.content))
        )
        .toBeGreaterThan(SHORT);
      for (const p of placements) {
        expectNextToTrigger(p);
        // The tooltip doesn't fit, so it scrolls.
        play
          .expect(p.content)
          .toBeGreaterThan(p.tooltip.bottom - p.tooltip.top);
      }
    }
  );
});

play.test.describe('Tooltip Placement Next to a Tall Trigger', () => {
  play.test.beforeEach(load);

  play.test(
    'Fits a tooltip next to a tall trigger in the middle of the viewport.',
    async ({ page }: { page: play.Page }): Promise<void> => {
      const trigger = await pick(page, 'long');
      // Stand in for a reference that wraps across lines (none does on this
      // page). Centered, it leaves less than half the viewport on either side.
      await trigger.evaluate((el: Element, height: number): void => {
        (el as HTMLElement).style.display = 'inline-block';
        (el as HTMLElement).style.height = `${height.toString()}px`;
      }, TALL);
      const p = await hover(page, trigger, AT.MIDDLE);
      expectNextToTrigger(p);
      play.expect(p.content).toBeGreaterThan(p.tooltip.bottom - p.tooltip.top);
    }
  );
});
