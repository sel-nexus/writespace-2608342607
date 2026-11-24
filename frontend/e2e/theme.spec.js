/** Exercise appearance across public/auth navigation with fixture-owned error capture. */
import { test, expect } from './fixtures';

/** Open a collapsed responsive disclosure only when its trigger is visible. */
async function openMenu(page, authenticated = false) {
  const trigger = page.getByRole('button', {
    name: authenticated ? 'Open navigation menu' : 'Open menu', exact: true,
  });
  if (await trigger.isVisible()) await trigger.click();
}

/** Assert root appearance and saved choice independently of route chrome.
 * Args:
 *   page: The monitored browser page.
 *   theme: Expected light or dark appearance.
 *   saved: Whether an explicit choice has been persisted.
 */
async function expectTheme(page, theme, saved = true) {
  const root = page.locator('html');
  if (theme === 'dark') await expect(root).toHaveClass(/\bdark\b/);
  else await expect(root).not.toHaveClass(/\bdark\b/);
  await expect(root).toHaveCSS('color-scheme', theme);
  expect(await page.evaluate(() => localStorage.getItem('writespace_theme')))
    .toBe(saved ? theme : null);
}

/** Assert appearance and real navbar styles only on routes with a toggle. */
async function expectNavbarTheme(page, theme, saved = true) {
  await expectTheme(page, theme, saved);
  await expect(page.getByRole('button', { name: 'Dark mode', exact: true }))
    .toHaveAttribute('aria-pressed', String(theme === 'dark'));
  await expect(page.locator('header').first()).toHaveCSS(
    'background-color', theme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)',
  );
}

/** Assert inherited appearance on the actual auth card and every form field. */
async function expectAuthTheme(page, theme) {
  await expectTheme(page, theme);
  await expect(page.locator('header')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dark mode', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main')).toHaveCSS(
    'background-color', theme === 'dark' ? 'rgb(2, 6, 23)' : 'rgb(248, 250, 252)',
  );
  const card = page.locator('section[aria-labelledby="auth-title"]');
  const background = theme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)';
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('background-color', background);
  const fields = card.locator('input');
  await expect(fields).toHaveCount(new URL(page.url()).pathname === '/register' ? 4 : 2);
  for (const field of await fields.all()) {
    await expect(field).toBeVisible();
    await expect(field).toHaveCSS('background-color', background);
    await expect(field).toHaveCSS('color', theme === 'dark' ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)');
    await expect(field).toHaveCSS('border-color', theme === 'dark' ? 'rgb(71, 85, 105)' : 'rgb(203, 213, 225)');
  }
}

test('appearance survives auth routes, both navbar entry points, reload and logout', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Dark mode', exact: true });
  await expectNavbarTheme(page, 'light', false);
  await expect(toggle).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  }
  await toggle.click();
  await expectNavbarTheme(page, 'dark');
  await page.reload();
  await expectNavbarTheme(page, 'dark');
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expectNavbarTheme(page, 'light');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Space');
  await expectNavbarTheme(page, 'dark');
  await expect(toggle).toBeFocused();
  await openMenu(page);
  await page.getByRole('navigation', { name: 'Public navigation' })
    .getByRole('link', { name: 'Get Started', exact: true }).click();
  await expect(page).toHaveURL('/register');
  await expectAuthTheme(page, 'dark');
  await page.getByRole('link', { name: 'WriteSpace home', exact: true }).click();
  await openMenu(page);
  await page.getByRole('navigation', { name: 'Public navigation' })
    .getByRole('link', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await expectAuthTheme(page, 'dark');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await expect(page.getByRole('navigation', { name: 'Authenticated navigation' })).toBeVisible();
  await expectNavbarTheme(page, 'dark');
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false');
  }
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expectNavbarTheme(page, 'light');
  await page.reload();
  await expectNavbarTheme(page, 'light');
  await toggle.click();
  await openMenu(page, true);
  await page.getByRole('link', { name: 'All Blogs', exact: true }).click();
  await expect(page).toHaveURL('/blogs');
  await expectNavbarTheme(page, 'dark');
  await openMenu(page, true);
  await page.getByRole('button', { name: 'Account options for Admin' }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expectNavbarTheme(page, 'dark');
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  await page.reload();
  await expectNavbarTheme(page, 'dark');
});

test('OS dark preference initializes appearance but explicit light overrides it on reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expectNavbarTheme(page, 'dark', false);
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expectNavbarTheme(page, 'light');
  await page.reload();
  await expectNavbarTheme(page, 'light');
});
