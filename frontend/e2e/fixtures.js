/** Fail every browser journey on console or uncaught page errors. */
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  /** Attach listeners before exposing the page, then assert after the journey.
   * Args:
   *   page: Fresh Playwright browser page.
   *   use: Execute the journey with error monitoring active.
   * Raises:
   *   AssertionError: If the browser emits any error.
   */
  page: async ({ page }, use) => {
    const errors = [];
    /** Record browser console errors, including those during initial navigation. */
    const onConsole = (message) => {
      if (message.type() === 'error') errors.push(message.text());
    };
    /** Record uncaught runtime errors. */
    const onPageError = (error) => errors.push(error.message);
    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    try {
      await use(page);
    } finally {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      expect(errors, 'Browser console and page errors').toEqual([]);
    }
  },
});

export { expect };
