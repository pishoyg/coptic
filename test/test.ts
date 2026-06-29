/**
 * Ensure website pages load correctly.
 */

import * as play from '@playwright/test';
import * as paths from '../docs/paths.js';
import * as params from '../docs/params.js';
import * as crum from '../docs/crum/params.js';

/**
 * PAGES_TO_TEST defines the list of site pages to test.
 */
const PAGES_TO_TEST: string[] = [
  // Home
  paths.HOME,
  // Keyboard Instructions
  paths.KEYBOARD,
  // Lexicon
  paths.LEXICON,
  // Lexicon with Wiki
  paths.lexicon('light', undefined, { [crum.WIKI]: String(true) }),
  // Lexicon with a query
  paths.lexicon('light', undefined, {
    [params.FULL]: String(true),
    [params.REGEX]: String(true),
  }),
  // A Crum note (sample).
  paths.crum('1'),
  // Bible
  paths.BIBLE,
  // A Bible chapter (sample)
  paths.bible('genesis', '1'),
  // Crum scan
  paths.lexicon('v', paths.BOOK),
  // Dawoud scan
  paths.lexicon('18', paths.DAWOUD),
];

// Our test-environment detection relies on `navigator.webdriver` being true
// under Playwright. If Playwright ever stopped setting it, detection would
// silently evaluate to false in E2E runs, disabling many sanity checks and the
// error-throwing behavior. This test guards against that regression.
play.test(
  'navigator.webdriver is set under Playwright',
  async ({ page }: { page: play.Page }): Promise<void> => {
    await page.goto('/');
    const webdriver = await page.evaluate((): boolean => navigator.webdriver);
    play.expect(webdriver).toBe(true);
  }
);

PAGES_TO_TEST.forEach((path: string): void => {
  play.test(
    `loads ${path} without errors`,
    async ({ page }: { page: play.Page }): Promise<void> => {
      // Block known trackers to prevent them from triggering listeners
      // and to speed up the 'networkidle' state.
      await page.route(
        '**/*{doubleclick,googleads,google-analytics,googletagmanager}**',
        (route: play.Route) => route.fulfill({ status: 200, body: '' })
      );

      // Add a listener to fail the test if we encounter any errors.
      page.on('pageerror', (error: Error): void => {
        throw new Error(error.message);
      });

      // Add a listener to fail the test if we log any error messages.
      page.on('console', (msg: play.ConsoleMessage): void => {
        if (msg.type() === 'error') {
          throw new Error(`Console Error: ${msg.text()}`);
        }
      });

      // Add a listener to fail the test if any of our requests fails. This is
      // necessary in order to catch failures to retrieve any resources (such as
      // CSS files, JavaScript files, images, ...).
      page.on('requestfailed', (request: play.Request): void => {
        throw new Error(`Request Failed: ${request.url()}`);
      });

      // Load the page.
      await page.goto(path, { waitUntil: 'networkidle' });
    }
  );
});
