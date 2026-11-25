/** Exercise local identity journeys after the later role-home slices are wired.
 * Notes:
 *   Written now, intentionally not run during the identity slice.
 *   Use only plaintext demonstration credentials, never real passwords.
 */
import { test, expect } from './fixtures';

/** Open responsive navigation only when the hamburger is displayed. */
async function openNavigation(page) {
  const button = page.getByRole('button', { name: 'Open navigation menu', exact: true });
  if (await button.isVisible()) await button.click();
}

/** Open the responsive public menu when necessary. */
async function openPublicMenu(page) {
  const button = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await button.isVisible()) await button.click();
}

/** Logout using the account disclosure, not programmatic storage changes. */
async function logout(page, displayName) {
  await openNavigation(page);
  await page.getByRole('button', { name: `Account options for ${displayName}` }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL('/');
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
}

for (const theme of ['light', 'dark']) {
  test(`invalid then valid registration, reload, logout and persisted login journey in ${theme} mode`, async ({ page }) => {
    await page.goto('/');
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    }
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^$/);
    await openPublicMenu(page);
    await page.getByRole('link', { name: 'Get Started', exact: true }).click();
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByLabel('Display Name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Display Name')).toHaveCSS('background-color',
      theme === 'dark' ? 'rgb(2, 6, 23)' : 'rgb(255, 255, 255)');
    await expect(page.getByRole('alert').first()).toHaveCSS('color',
      theme === 'dark' ? 'rgb(252, 165, 165)' : 'rgb(185, 28, 28)');
    await page.getByLabel('Display Name').fill('Journey Reader');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('demo-password');
    await page.getByLabel('Confirm Password').fill('different');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Passwords must match.');
    await page.getByLabel('Confirm Password').fill('demo-password');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('reserved');
    await page.getByLabel('Username').fill('journey-reader');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page).toHaveURL('/blogs');
    const saved = await page.evaluate(() => ({
      users: JSON.parse(localStorage.getItem('writespace_users')),
      session: JSON.parse(localStorage.getItem('writespace_session')),
    }));
    expect(saved.users).toHaveLength(1);
    expect(saved.session).toMatchObject({ username: 'journey-reader', displayName: 'Journey Reader', role: 'user' });
    expect(saved.users[0].id).toBe(saved.session.userId);
    const accounts = await page.evaluate(() => localStorage.getItem('writespace_users'));
    const savedTheme = await page.evaluate(() => localStorage.getItem('writespace_theme'));
    if (theme === 'dark') expect(savedTheme).toBe('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^$/);
    await openNavigation(page);
    await expect(page.getByRole('button', { name: 'Account options for Journey Reader' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
    await logout(page, 'Journey Reader');
    await openPublicMenu(page);
    await page.getByRole('link', { name: 'Get Started', exact: true }).click();
    await page.getByLabel('Display Name').fill('Duplicate Reader');
    await page.getByLabel('Username').fill('journey-reader');
    await page.getByLabel('Password', { exact: true }).fill('demo-password');
    await page.getByLabel('Confirm Password').fill('demo-password');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('already taken');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await page.getByLabel('Username').fill('journey-reader');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid username or password.');
    await expect(page.getByRole('alert')).toHaveCSS('background-color',
      theme === 'dark' ? 'rgb(69, 10, 10)' : 'rgb(254, 242, 242)');
    await expect(page.getByRole('alert')).toHaveCSS('color',
      theme === 'dark' ? 'rgb(252, 165, 165)' : 'rgb(185, 28, 28)');
    await page.getByLabel('Password').focus();
    await expect(page.getByLabel('Password')).toBeFocused();
    await expect(page.getByLabel('Password')).toHaveCSS('color',
      theme === 'dark' ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)');
    await page.getByLabel('Password').fill('demo-password');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL('/blogs');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')))).toEqual(saved.session);
    await openNavigation(page);
    await page.getByRole('link', { name: 'WriteSpace home' }).click();
    await openPublicMenu(page);
    await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/blogs');
    await page.getByRole('link', { name: 'Go to Dashboard' }).click();
    await logout(page, 'Journey Reader');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')).length)).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBe(accounts);
    expect(await page.evaluate(() => localStorage.getItem('writespace_theme'))).toBe(savedTheme);
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^$/);
  });
}

for (const role of ['user', 'admin']) {
  test(`signed-in ${role} follows landing footer auth links back to role home`, async ({ page }) => {
    await page.goto('/');
    const home = role === 'admin' ? '/admin' : '/blogs';
    const displayName = role === 'admin' ? 'Admin' : 'Footer Reader';
    const footer = page.getByRole('navigation', { name: 'Footer navigation' });
    if (role === 'user') {
      await footer.getByRole('link', { name: 'Register', exact: true }).click();
      await page.getByLabel('Display Name').fill(displayName);
      await page.getByLabel('Username').fill('footer-reader');
      await page.getByLabel('Password', { exact: true }).fill('demo-only');
      await page.getByLabel('Confirm Password').fill('demo-only');
      await page.getByRole('button', { name: 'Register', exact: true }).click();
    } else {
      await footer.getByRole('link', { name: 'Login', exact: true }).click();
      await page.getByLabel('Username').fill('admin');
      await page.getByLabel('Password').fill('admin');
      await page.getByRole('button', { name: 'Login', exact: true }).click();
    }
    await expect(page).toHaveURL(home);
    const session = await page.evaluate(() => localStorage.getItem('writespace_session'));
    for (const link of ['Login', 'Register']) {
      await page.getByRole('link', { name: 'WriteSpace home', exact: true }).click();
      await expect(page).toHaveURL('/');
      await footer.getByRole('link', { name: link, exact: true }).click();
      await expect(page).toHaveURL(home);
      await expect(page.getByLabel('Username', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Display Name', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^(Login|Register)$/ })).toHaveCount(0);
      await openNavigation(page);
      await expect(page.getByRole('button', { name: `Account options for ${displayName}`, exact: true })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBe(session);
    }
  });
}

test('permanent default admin login and role navigation persist across reload', async ({ page }) => {
  await page.goto('/');
  await openPublicMenu(page);
  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')))).toEqual({
    userId: 'default-admin', username: 'admin', displayName: 'Admin', role: 'admin',
  });
  await openNavigation(page);
  await expect(page.getByRole('img', { name: 'admin avatar' })).toHaveText('👑');
  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(page).toHaveURL('/users');
  await openNavigation(page);
  await page.getByRole('link', { name: 'All Blogs', exact: true }).click();
  await expect(page).toHaveURL('/blogs');
  await logout(page, 'Admin');
});

// Explicit isolated direct-entry boundary tests are the exception to link-only journeys.
for (const path of ['/blogs', '/blog/missing', '/write', '/edit/missing', '/admin', '/users']) {
  test(`guest direct-entry guard at ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL('/login');
    await expect(page.getByLabel('Username')).toBeVisible();
  });
}
for (const path of ['/admin', '/users']) {
  test(`regular-user direct-entry guard at ${path}`, async ({ page }) => {
    await page.addInitScript(() => {
      const account = {
        id: '11111111-1111-4111-8111-111111111111', displayName: 'Boundary Reader',
        username: 'boundary-reader', password: 'demo-only', role: 'user', createdAt: '2026-03-04T12:00:00.000Z',
      };
      localStorage.setItem('writespace_users', JSON.stringify([account]));
      localStorage.setItem('writespace_session', JSON.stringify({
        userId: account.id, username: account.username, displayName: account.displayName, role: account.role,
      }));
    });
    await page.goto(path);
    await expect(page).toHaveURL('/blogs');
    await openNavigation(page);
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Account options for Boundary Reader' })).toBeVisible();
  });
}
