/** Exercise both public appearances using real browser storage and monitored fixtures. */
import { test, expect } from './fixtures.js';

/** Assert restored preference and the actual document theme. */
async function expectTheme(page, theme) {
  await expect(page.getByRole('button', { name: 'Dark mode' }))
    .toHaveAttribute('aria-pressed', String(theme === 'dark'));
  await expect.poll(() => page.evaluate(() => ({
    saved: localStorage.getItem('writespace_theme'),
    dark: document.documentElement.classList.contains('dark'),
    scheme: document.documentElement.style.colorScheme,
  }))).toEqual({ saved: theme, dark: theme === 'dark', scheme: theme });
}

/** Reveal existing responsive navigation only when collapsed. */
async function openNavigation(page) {
  const menu = page.getByRole('button', { name: /^(Open menu|Open navigation menu)$/ });
  if (await menu.isVisible()) await menu.click();
}

/** Fill a demo registration through native labeled fields. */
async function fillRegistration(page, username, confirmation = 'demo-only') {
  await page.getByLabel('Display Name').fill('Theme Reader');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('demo-only');
  await page.getByLabel('Confirm Password').fill(confirmation);
}

for (const theme of ['light', 'dark']) {
  for (const width of [390, 1280]) {
    test(`${theme} public navigation, validation and identity persistence at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      // Seed only a preference once: reloads must restore what the application persisted.
      await page.addInitScript((initialTheme) => {
        if (!localStorage.getItem('theme-public-initialized')) {
          localStorage.setItem('writespace_theme', initialTheme);
          localStorage.setItem('theme-public-initialized', 'true');
        }
      }, theme);
      await page.goto('/');
      await expectTheme(page, theme);
      await expect(page.getByText('No posts yet — check back soon!')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Write Freely' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Private & Local' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Instant & Fast' })).toBeVisible();
      await page.getByRole('link', { name: 'Start Reading' }).click();
      await expect(page).toHaveURL(/\/login$/);
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveCount(2);
      await expect(page.getByLabel('Username')).toHaveAttribute('aria-invalid', 'true');
      await page.getByLabel('Username').fill('admin');
      await page.getByLabel('Password', { exact: true }).fill('wrong');
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText('Invalid username or password.');
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await expect(page.getByLabel('Password', { exact: true })).toHaveValue('wrong');
      await expect(page.getByRole('alert')).toHaveText('Invalid username or password.');
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await expectTheme(page, theme);
      expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
      await page.getByRole('main').getByRole('link', { name: 'Register', exact: true }).click();
      await expect(page).toHaveURL(/\/register$/);
      await page.getByRole('button', { name: 'Register', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveCount(4);
      await fillRegistration(page, 'admin', 'wrong');
      await page.getByRole('button', { name: 'Register', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText('Passwords must match.');
      await page.getByLabel('Confirm Password').fill('demo-only');
      await page.getByRole('button', { name: 'Register', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('reserved');
      expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBeNull();
      const username = `public-${theme}-${width}`;
      await page.getByLabel('Username', { exact: true }).fill(username);
      await page.getByRole('button', { name: 'Register', exact: true }).click();
      await expect(page).toHaveURL(/\/blogs$/);
      await expectTheme(page, theme);
      const session = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')));
      expect(session).toMatchObject({ username, displayName: 'Theme Reader', role: 'user' });
      const accounts = await page.evaluate(() => localStorage.getItem('writespace_users'));
      expect(JSON.parse(accounts)).toEqual([expect.objectContaining({ username, role: 'user' })]);
      await page.reload();
      await expectTheme(page, theme);
      await page.getByRole('link', { name: 'WriteSpace home' }).click();
      await expect(page.getByRole('img', { name: 'user avatar' })).toHaveText('📚');
      await expect(page.getByRole('link', { name: 'Start Reading' })).toHaveAttribute('href', '/blogs');
      await openNavigation(page);
      await page.getByRole('link', { name: 'Go to Dashboard' }).click();
      await openNavigation(page);
      await page.getByRole('button', { name: /Account options/ }).click();
      await page.getByRole('button', { name: 'Logout' }).click();
      await expect(page).toHaveURL(/\/$/);
      await expectTheme(page, theme);
      expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
      const footer = page.getByRole('navigation', { name: 'Footer navigation' });
      await footer.getByRole('link', { name: 'Register', exact: true }).click();
      await fillRegistration(page, username);
      await page.getByRole('button', { name: 'Register', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('already taken');
      expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBe(accounts);
      await page.getByRole('main').getByRole('link', { name: 'Login', exact: true }).click();
      await page.getByLabel('Username').fill(username);
      await page.getByLabel('Password', { exact: true }).fill('demo-only');
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(page).toHaveURL(/\/blogs$/);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')))).toEqual(session);
      await expectTheme(page, theme);
      await openNavigation(page);
      await page.getByRole('button', { name: /Account options/ }).click();
      await page.getByRole('button', { name: 'Logout' }).click();
      await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'All Blogs' }).click();
      await expect(page).toHaveURL(/\/login$/);
      await expectTheme(page, theme);
      await page.getByRole('main').getByRole('link', { name: 'WriteSpace home' }).click();
      await page.reload();
      await expectTheme(page, theme);
      await page.screenshot({ path: test.info().outputPath(`public-${theme}-${width}.png`), fullPage: true });
    });
  }
}
