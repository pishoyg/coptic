import * as play from '@playwright/test';

// test extends the Playwright test, defining the property `isPlaywright` on the
// global `window` object. This property can then be used by our code to detect
// whether it's running under Playwright or otherwise.
// In order for this to work, all test files should import this file and use the
// `test` object below, rather than the standard playwright `test`.
export const test = play.test.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      window.isPlaywright = true;
    });
    await use(context);
  },
});
