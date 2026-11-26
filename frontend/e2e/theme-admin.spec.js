/** Exercise both appearances on desktop/mobile with real account and dashboard UI.
 * Notes:
 *   Shared fixtures fail on console/page errors; browser execution belongs to the parent.
 */
import { test, expect } from './fixtures';

/** Expand closed responsive navigation without toggling an already open menu. */
async function navigation(page, publicMenu = false) {
  const trigger = page.getByRole('button', { name: publicMenu ? 'Open menu' : 'Open navigation menu', exact: true });
  if (await trigger.isVisible()) await trigger.click();
}

/** Sign in using the real public login form. */
async function login(page, username, password) {
  await navigation(page, true);
  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/admin');
}

/** Use the account dropdown to leave the current identity. */
async function logout(page, name) {
  await navigation(page);
  await page.getByRole('button', { name: `Account options for ${name}` }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL('/');
}

/** Reach the dashboard through the current administrator's account controls. */
async function dashboard(page, name = 'Admin') {
  await navigation(page);
  await page.getByRole('button', { name: `Account options for ${name}` }).click();
  await page.getByRole('link', { name: 'Go to Dashboard', exact: true }).click();
  await expect(page).toHaveURL('/admin');
}

/** Assert the actual shared preference survives navigation and reload. */
async function expectTheme(page, theme) {
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', String(theme === 'dark'));
  expect(await page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    scheme: document.documentElement.style.colorScheme,
    saved: localStorage.getItem('writespace_theme'),
  }))).toEqual({ dark: theme === 'dark', scheme: theme, saved: theme });
}

/** Read persisted records for assertions only, never seed or mutate app data. */
async function records(page) {
  return page.evaluate(() => ({
    users: JSON.parse(localStorage.getItem('writespace_users') ?? '[]'),
    posts: JSON.parse(localStorage.getItem('writespace_posts') ?? '[]'),
    session: localStorage.getItem('writespace_session'),
  }));
}

/** Fill required account fields without bypassing validation or storage. */
async function fill(page, username, role) {
  await page.getByLabel('Display Name').fill(username === 'editor' ? 'Editor' : 'Reader');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('demo-only');
  await page.getByLabel('Role').selectOption(role);
}

/** Locate the single responsive action visible in the current viewport. */
function deleteButton(page, username) {
  return page.locator(`button[aria-label="Delete ${username}"]:visible`);
}

for (const theme of ['light', 'dark']) {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    test(`${theme} admin account and recent-content journey at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      // Select both preferences through the actual toggle, including explicit saved light.
      await page.getByRole('button', { name: 'Dark mode' }).click();
      if (theme === 'light') await page.getByRole('button', { name: 'Dark mode' }).click();
      await expectTheme(page, theme);
      await login(page, 'admin', 'admin');
      await expectTheme(page, theme);
      await expect(page.getByRole('region', { name: 'Total Users', exact: true }))
        .toHaveText('Total Users1All accounts, including built-in admin');
      await expect(page.getByText('No posts yet. Make room for the first thought.')).toBeVisible();
      await page.getByRole('link', { name: 'Manage Users' }).click();
      await expect(deleteButton(page, 'admin')).toBeDisabled();
      await expect(deleteButton(page, 'admin')).toHaveAttribute('title', 'Default admin cannot be deleted.');
      await expect(deleteButton(page, 'admin')).toHaveAccessibleDescription('Default admin cannot be deleted.');
      if (viewport.width < 640) {
        await expect(page.getByRole('article', { name: 'Account admin' })).toBeVisible();
        await expect(page.getByRole('table')).toHaveCount(0);
      } else {
        await expect(page.getByRole('table')).toBeVisible();
        await expect(page.getByRole('article', { name: 'Account admin' })).toHaveCount(0);
      }
      await page.getByRole('button', { name: 'Create User', exact: true }).click();
      for (const label of ['Display Name', 'Username', 'Password']) {
        await expect(page.getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
        await expect(page.getByLabel(label)).toHaveAccessibleDescription('This field is required.');
      }
      await fill(page, 'editor', 'admin');
      const before = await records(page);
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await expectTheme(page, theme === 'dark' ? 'light' : 'dark');
      await expect(page).toHaveURL('/users');
      await expect(page.getByLabel('Display Name')).toHaveValue('Editor');
      await expect(page.getByLabel('Username')).toHaveValue('editor');
      await expect(page.getByLabel('Password')).toHaveValue('demo-only');
      await expect(page.getByLabel('Role')).toHaveValue('admin');
      await expect(page.getByRole('alert')).toHaveCount(3);
      expect(await records(page)).toEqual(before);
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await page.getByRole('button', { name: 'Create User', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('Account editor created.');
      await fill(page, 'reader', 'user');
      await page.getByRole('button', { name: 'Create User', exact: true }).click();
      await expect(page.getByRole('status')).toHaveText('Account reader created.');
      const saved = await records(page);
      expect(saved.users.map((account) => account.role)).toEqual(['admin', 'user']);
      await fill(page, 'READER', 'user');
      await page.getByRole('button', { name: 'Create User', exact: true }).click();
      await expect(page.getByLabel('Username')).toHaveAccessibleDescription('That username is already taken.');
      await page.getByLabel('Username').fill('ADMIN');
      await page.getByRole('button', { name: 'Create User', exact: true }).click();
      await expect(page.getByLabel('Username')).toHaveAccessibleDescription('The username admin is reserved.');
      expect((await records(page)).users).toEqual(saved.users);
      await page.reload();
      await expectTheme(page, theme);
      await page.getByRole('link', { name: 'Back to Dashboard' }).click();
      await expect(page.getByRole('region', { name: 'Total Users', exact: true }))
        .toHaveText('Total Users3All accounts, including built-in admin');
      await expect(page.getByRole('region', { name: 'Total Admins', exact: true }))
        .toHaveText('Total Admins2Administrators, including built-in admin');
      await expect(page.getByRole('region', { name: 'Total users', exact: true }))
        .toHaveText('Total users1Regular users only, excluding admins');
      await logout(page, 'Admin');
      await login(page, 'editor', 'demo-only');
      await page.getByRole('link', { name: 'Manage Users' }).click();
      await expect(deleteButton(page, 'editor')).toBeDisabled();
      await expect(deleteButton(page, 'editor')).toHaveAccessibleDescription('Your current account cannot be deleted.');
      await expect(deleteButton(page, 'admin')).toBeDisabled();
      await expectTheme(page, theme);
      await page.getByRole('link', { name: 'Back to Dashboard' }).click();
      await page.getByRole('link', { name: 'Write New Post' }).click();
      await page.getByLabel('Title').fill('Editor retained words');
      await page.getByLabel('Content').fill('Local editorial content remains after account removal.');
      await page.getByRole('button', { name: 'Publish Post' }).click();
      const retained = (await records(page)).posts[0];
      expect(retained.authorId).toBe(saved.users[0].id);
      await logout(page, 'Editor');
      await login(page, 'admin', 'admin');
      await page.getByRole('link', { name: 'Manage Users' }).click();
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toBe('Delete account editor? Their posts will be retained.');
        await dialog.dismiss();
      });
      await deleteButton(page, 'editor').click();
      expect((await records(page)).users).toEqual(saved.users);
      page.once('dialog', async (dialog) => dialog.accept());
      await deleteButton(page, 'editor').click();
      await expect(page.getByRole('status')).toHaveText('Account editor deleted. Posts retained.');
      expect((await records(page)).users.map((account) => account.username)).toEqual(['reader']);
      expect((await records(page)).posts).toEqual([retained]);
      await page.reload();
      await expect(deleteButton(page, 'editor')).toHaveCount(0);
      await expect(deleteButton(page, 'admin')).toBeDisabled();
      await page.getByRole('link', { name: 'Back to Dashboard' }).click();
      await expectTheme(page, theme);
      await expect(page.getByRole('article')).toContainText('Editor retained words');
      await expect(page.getByRole('article')).toContainText('Editor');
      await expect(page.getByRole('article').getByRole('img', { name: 'user avatar' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Edit Editor retained words' })).toBeVisible();
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toBe('Delete "Editor retained words"? This cannot be undone.');
        await dialog.dismiss();
      });
      await page.getByRole('button', { name: 'Delete Editor retained words' }).click();
      expect((await records(page)).posts).toEqual([retained]);
      page.once('dialog', async (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Delete Editor retained words' }).click();
      await expect(page.getByText('No posts yet. Make room for the first thought.')).toBeVisible();
      await expect(page.getByRole('region', { name: 'Total Posts', exact: true }))
        .toHaveText('Total Posts0All locally saved posts');
      expect((await records(page)).posts).toEqual([]);
      await page.reload();
      await expectTheme(page, theme);
      await expect(page.getByText('No posts yet. Make room for the first thought.')).toBeVisible();
      await dashboard(page);
    });
  }
}
