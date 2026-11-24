/** Exercise appearance across public/auth navigation with fixture-owned error capture. */
import { test, expect } from './fixtures';

/** Open a collapsed responsive disclosure only when its trigger is visible. */
async function openMenu(page, authenticated = false) {
  const trigger = page.getByRole('button', {
    name: authenticated ? 'Open navigation menu' : 'Open menu', exact: true,
  });
  if (await trigger.isVisible()) await trigger.click();
}

/** Assert root appearance, real navbar styles, pressed state and saved choice.
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
  await expect(page.getByRole('button', { name: 'Dark mode', exact: true }))
    .toHaveAttribute('aria-pressed', String(theme === 'dark'));
  await expect(page.locator('header').first()).toHaveCSS(
    'background-color', theme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)',
  );
  expect(await page.evaluate(() => localStorage.getItem('writespace_theme')))
    .toBe(saved ? theme : null);
}

test('appearance survives auth routes, both navbar entry points, reload and logout', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Dark mode', exact: true });
  await expectTheme(page, 'light', false);
  await expect(toggle).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  }
  await toggle.click();
  await expectTheme(page, 'dark');
  await page.reload();
  await expectTheme(page, 'dark');
  await openMenu(page);
  await page.getByRole('navigation', { name: 'Public navigation' })
    .getByRole('link', { name: 'Get Started', exact: true }).click();
  await expect(page).toHaveURL('/register');
  await expectTheme(page, 'dark');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expectTheme(page, 'light');
  await page.keyboard.press('Space');
  await expectTheme(page, 'dark');
  await page.getByRole('link', { name: 'WriteSpace home', exact: true }).click();
  await openMenu(page);
  await page.getByRole('navigation', { name: 'Public navigation' })
    .getByRole('link', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await expectTheme(page, 'dark');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await expect(page.getByRole('navigation', { name: 'Authenticated navigation' })).toBeVisible();
  await expectTheme(page, 'dark');
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false');
  }
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expectTheme(page, 'light');
  await page.reload();
  await expectTheme(page, 'light');
  await toggle.click();
  await openMenu(page, true);
  await page.getByRole('link', { name: 'All Blogs', exact: true }).click();
  await expect(page).toHaveURL('/blogs');
  await expectTheme(page, 'dark');
  await openMenu(page, true);
  await page.getByRole('button', { name: 'Account options for Admin' }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expectTheme(page, 'dark');
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  await page.reload();
  await expectTheme(page, 'dark');
});

test('OS dark preference initializes appearance but explicit light overrides it on reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expectTheme(page, 'dark', false);
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expectTheme(page, 'light');
  await page.reload();
  await expectTheme(page, 'light');
});
