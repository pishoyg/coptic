/* This file was auto-generated from a skeleton obtained by running:
 * ```
 * npm init playwright@latest
 * ```
 * Some of the options (such as the parameterization of CI, which we don't use
 * (as of the time of writing)) are taken as is.
 */
import * as play from '@playwright/test';

const PORT = 3000;
const SITE_DIR: string = process.env.SITE_DIR!;
const CI = !!process.env.CI;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default play.defineConfig({
  // Our Playwright tests live in the directory `test`.
  testDir: './test',
  // Although Playwright tests typically end with `.spec.ts` or `.test.ts`, we
  // opt for avoiding that, in order to not confuse them with unit tests.
  // Otherwise, our unit test runner might be tempted to treat them as unit
  // tests, and might try to execute them as such.
  // TODO: (#0) This is no ideal. Let's adopt the convention, and configure the
  // unit test runner to ignore Playwright tests.
  testMatch: /.*\.ts/,
  // `test/base.ts` contains helpers, and is not actually a test.
  testIgnore: 'test/base.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source
   * code. */
  forbidOnly: CI,
  /* Retry on CI only */
  retries: CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* Configure projects for major browsers.
   * NOTE: We used to test on desktop and mobile Safari, but it caused some
   * inexplicable errors. We stick to Chromium for now!
   * */
  projects: [
    {
      name: 'Chromium',
      use: { ...play.devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...play.devices['Pixel 5'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `npx http-server ${SITE_DIR} -p ${PORT.toString()} -c-1`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
  },

  /* Shared settings for all the projects below.
   * See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://localhost:${PORT}`,

    /* Collect trace when retrying the failed test.
     * See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
});
