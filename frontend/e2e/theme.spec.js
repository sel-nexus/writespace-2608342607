/** Exercise real theme journeys with the shared browser error-capture fixture. */
import { test, expect } from './fixtures';

/** Open a responsive navigation disclosure only when its trigger is visible. */
async function openMenu(page, authenticated = false) {
  const button = page.getByRole('button', {
    name: authenticated ? 'Open navigation menu' : 'Open menu', exact: true,
  });
  if (await button.isVisible()) await button.click();
}

/** Reach the theme action through keyboard traversal, including mobile disclosures. */
async function focusToggle(page, name) {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeVisible();
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press('Tab');
    if (await button.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(button).toBeFocused();
  expect(await button.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
}

test('keyboard toggles in both navs persist across login, navigation, refresh and logout', async ({ page }, testInfo) => {
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).not.toHaveClass(/dark/);
  await openMenu(page);
  await focusToggle(page, 'Switch to dark mode');
  await page.keyboard.press('Enter');
  await expect(root).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('writespace_theme'))).toBe('dark');
  await page.screenshot({ path: testInfo.outputPath('theme-public-dark.png'), fullPage: true });
  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await expect(root).toHaveClass(/dark/);
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await openMenu(page, true);
  await focusToggle(page, 'Switch to light mode');
  await page.keyboard.press('Space');
  await expect(root).not.toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_theme'))).toBe('light');
  await page.keyboard.press('Enter');
  await expect(root).toHaveClass(/dark/);
  await page.getByRole('link', { name: 'All Blogs', exact: true }).click();
  await expect(page).toHaveURL('/blogs');
  await expect(root).toHaveClass(/dark/);
  await page.reload();
  await expect(root).toHaveClass(/dark/);
  await openMenu(page, true);
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await page.getByRole('button', { name: 'Account options for Admin' }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(root).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('writespace_theme'))).toBe('dark');
  await page.reload();
  await expect(root).toHaveClass(/dark/);
  await openMenu(page);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(root).not.toHaveClass(/dark/);
  await page.screenshot({ path: testInfo.outputPath('theme-public-light.png'), fullPage: true });
});

for (const preference of ['', 'system', 'DARK', '"dark"', '{invalid']) {
  test(`invalid preference ${JSON.stringify(preference)} falls back to light without following OS dark mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript((value) => localStorage.setItem('writespace_theme', value), preference);
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await openMenu(page);
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('writespace_theme'))).toBe('dark');
  });
}

test('theme read failure defaults to light while the control remains usable', async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function readWithThemeFailure(key) {
      if (key === 'writespace_theme') throw new Error('Theme read denied');
      return getItem.call(this, key);
    };
  });
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await openMenu(page);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await expect(page).toHaveURL('/login');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('theme write failure keeps UI usable without changing any saved records', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('writespace_theme', 'light');
    localStorage.setItem('writespace_posts', '[]');
    localStorage.setItem('writespace_users', '[]');
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function writeWithThemeFailure(key, value) {
      if (key === 'writespace_theme') throw new Error('Theme write denied');
      return setItem.call(this, key, value);
    };
  });
  await page.goto('/');
  await openMenu(page);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(() => ({
    theme: localStorage.getItem('writespace_theme'), posts: localStorage.getItem('writespace_posts'),
    users: localStorage.getItem('writespace_users'), session: localStorage.getItem('writespace_session'),
  }))).toEqual({ theme: 'light', posts: '[]', users: '[]', session: null });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});
