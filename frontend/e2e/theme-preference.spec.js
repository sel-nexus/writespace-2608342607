/** Exercise browser-local preference through actual UI journeys; only inject storage faults. */
import { test, expect } from '@playwright/test';

let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** Assert the semantic icon state, root appearance, and right-side placement. */
async function expectTheme(page, theme) {
  const button = page.getByRole('button', { name: 'Dark mode' });
  await expect(button).toHaveCount(1);
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('aria-pressed', String(theme === 'dark'));
  await expect(button).toHaveText('');
  await expect(button.locator(`svg[data-theme-icon="${theme === 'dark' ? 'moon' : 'sun'}"]`)).toBeVisible();
  const [navBox, logoBox, toggleBox] = await Promise.all([
    page.locator('header nav').boundingBox(),
    page.getByRole('link', { name: 'WriteSpace home' }).boundingBox(),
    button.boundingBox(),
  ]);
  expect(toggleBox.x).toBeGreaterThan(logoBox.x + logoBox.width);
  expect(toggleBox.x + toggleBox.width / 2).toBeGreaterThan(navBox.x + navBox.width * 0.65);
  await expect.poll(() => page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    scheme: document.documentElement.style.colorScheme,
  }))).toEqual({ dark: theme === 'dark', scheme: theme });
}

/** Open an existing header disclosure only when responsive navigation is collapsed. */
async function openNavigation(page) {
  const menu = page.getByRole('button', { name: /^(Open menu|Open navigation menu)$/ });
  if (await menu.isVisible()) await menu.click();
}

for (const width of [390, 1280]) {
  test(`keyboard preference survives registration, logout, admin login and direct refresh at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expectTheme(page, 'light');
    const toggle = page.getByRole('button', { name: 'Dark mode' });
    // Tab from the start of the document through visible header items to the right-side control.
    const tabsToToggle = width < 640 ? 3 : 5;
    for (let step = 0; step < tabsToToggle; step += 1) {
      await page.keyboard.press('Tab');
    }
    await expect(toggle).toBeFocused();
    if (width >= 640) {
      const getStartedBox = await page.getByRole('navigation', { name: 'Public navigation' })
        .getByRole('link', { name: 'Get Started', exact: true }).boundingBox();
      const toggleBox = await toggle.boundingBox();
      expect(toggleBox.x).toBeGreaterThanOrEqual(getStartedBox.x + getStartedBox.width);
    }
    expect(await toggle.evaluate((button) => getComputedStyle(button).boxShadow)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expectTheme(page, 'dark');
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('writespace_theme'))).toBe('dark');
    await page.keyboard.press('Space');
    await expectTheme(page, 'light');
    await toggle.click();
    await openNavigation(page);
    await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Get Started', exact: true }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expectTheme(page, 'dark');
    const username = `theme-${Date.now()}-${width}`;
    await page.getByLabel('Display Name').fill('Theme Reader');
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Password', { exact: true }).fill('demo-theme-only');
    await page.getByLabel('Confirm Password').fill('demo-theme-only');
    await page.getByRole('button', { name: /Register|Create Account|Get Started/i }).click();
    await expect(page).toHaveURL(/\/blogs$/);
    await expectTheme(page, 'dark');
    await openNavigation(page);
    await page.getByRole('link', { name: 'Write', exact: true }).click();
    await expect(page).toHaveURL(/\/write$/);
    await page.getByLabel('Title').fill('Unpublished appearance draft');
    await page.getByLabel('Content').fill('Theme switching must not lose these words.');
    const session = await page.evaluate(() => localStorage.getItem('writespace_session'));
    await page.getByRole('button', { name: 'Dark mode' }).click();
    await expectTheme(page, 'light');
    await expect(page.getByLabel('Title')).toHaveValue('Unpublished appearance draft');
    await expect(page.getByLabel('Content')).toHaveValue('Theme switching must not lose these words.');
    expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBe(session);
    await page.getByRole('button', { name: 'Dark mode' }).click();
    // Refresh the actual protected URL reached through navigation.
    await page.reload();
    await expect(page).toHaveURL(/\/write$/);
    await expectTheme(page, 'dark');
    await openNavigation(page);
    await page.getByRole('button', { name: /Account options/ }).click();
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expectTheme(page, 'dark');
    await openNavigation(page);
    await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Login', exact: true }).click();
    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('admin');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expectTheme(page, 'dark');
    await page.reload();
    await expectTheme(page, 'dark');
    await page.getByRole('button', { name: 'Dark mode' }).click();
    await page.reload();
    await expectTheme(page, 'light');
  });
}

test('failed theme writes retain session, draft, errors and other browser data', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('admin');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await openNavigation(page);
  await page.getByRole('link', { name: 'Write', exact: true }).click();
  await page.getByLabel('Title').fill('Unsaved quota draft');
  await page.getByRole('button', { name: /Publish|Save|Create/ }).click();
  const alerts = await page.getByRole('alert').allTextContents();
  expect(alerts.length).toBeGreaterThan(0);
  const data = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'writespace_theme') throw new DOMException('Injected quota failure', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expectTheme(page, 'dark');
  await expect(page.getByLabel('Title')).toHaveValue('Unsaved quota draft');
  expect(await page.getByRole('alert').allTextContents()).toEqual(alerts);
  await page.getByLabel('Content').fill('Editing still works');
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expectTheme(page, 'light');
  await expect(page.getByLabel('Content')).toHaveValue('Editing still works');
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(data);
  await page.reload();
  await expectTheme(page, 'light');
});

test('blocked preference reads fall back to light on a direct protected guest entry', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'writespace_theme') throw new DOMException('Injected blocked read', 'SecurityError');
      return original.call(this, key);
    };
  });
  await page.goto('/write');
  await expect(page).toHaveURL(/\/login$/);
  await expectTheme(page, 'light');
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expectTheme(page, 'dark');
  expect(await page.evaluate(() => localStorage.writespace_theme)).toBe('dark');
  await page.reload();
  await expectTheme(page, 'light');
});
