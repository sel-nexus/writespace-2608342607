/** Exercise admin account/content management through real UI and persistent browser storage.
 * Notes:
 *   Shared fixtures capture console/page errors. Browser execution belongs to the parent.
 *   Only the initial entry uses goto; subsequent navigation uses application controls.
 */
import { test, expect } from './fixtures';

/** Expand responsive navigation only when its closed trigger is visible. */
async function navigation(page, publicMenu = false) {
  const trigger = page.getByRole('button', { name: publicMenu ? 'Open menu' : 'Open navigation menu', exact: true });
  if (await trigger.isVisible()) await trigger.click();
}

/** Sign in through the public navigation and actual demo credentials. */
async function login(page, username, password, destination) {
  await navigation(page, true);
  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(destination);
}

/** Sign out through actual account actions rather than removing storage directly. */
async function logout(page, displayName) {
  await navigation(page);
  await page.getByRole('button', { name: `Account options for ${displayName}` }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL('/');
}

/** Reach administrator overview through the authenticated account dropdown. */
async function dashboard(page, displayName = 'Admin') {
  await navigation(page);
  await page.getByRole('button', { name: `Account options for ${displayName}` }).click();
  await page.getByRole('link', { name: 'Go to Dashboard', exact: true }).click();
  await expect(page).toHaveURL('/admin');
}

/** Create a required account using both explicit dropdown options. */
async function createAccount(page, username, displayName, role) {
  await page.getByLabel('Display Name').fill(displayName);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('demo-only');
  await page.getByLabel('Role').selectOption(role);
  await page.getByRole('button', { name: 'Create User', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(`Account ${username} created.`);
}

/** Return the single visible desktop/mobile deletion action. */
function deleteButton(page, username) {
  return page.locator(`button[aria-label="Delete ${username}"]:visible`);
}

/** Read persisted records only for assertions, without seeding or mutating storage. */
async function records(page) {
  return page.evaluate(() => ({
    users: JSON.parse(localStorage.getItem('writespace_users') ?? '[]'),
    posts: JSON.parse(localStorage.getItem('writespace_posts') ?? '[]'),
  }));
}

for (const theme of ['light', 'dark']) {
  test(`admin creates both roles, protects current/default, retains author posts and manages recent writing persistently in ${theme}`, async ({ page }) => {
    await page.goto('/');
    await navigation(page, true);
    if (theme === 'dark') await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await login(page, 'admin', 'admin', '/admin');
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
    await expect(page.getByRole('main')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(2, 6, 23)' : 'rgb(248, 250, 252)');
    await expect(page.getByRole('region', { name: 'Total Users', exact: true })).toContainText('1');
    await expect(page.getByRole('region', { name: 'Total Posts' })).toContainText('0');
    await page.getByRole('link', { name: 'Manage Users' }).click();
    await expect(deleteButton(page, 'admin')).toBeDisabled();
    await expect(deleteButton(page, 'admin')).toHaveAttribute('title', 'Default admin cannot be deleted.');
    await page.getByRole('button', { name: 'Create User', exact: true }).click();
    await expect(page.getByLabel('Username')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Username')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)');
    await createAccount(page, 'editor', 'Editor', 'admin');
    await createAccount(page, 'reader', 'Reader', 'user');
    let saved = await records(page);
    expect(saved.users.map((account) => account.role)).toEqual(['admin', 'user']);
    for (const account of saved.users) {
      expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(new Date(account.createdAt).toISOString()).toBe(account.createdAt);
    }
    await page.getByLabel('Display Name').fill('Duplicate');
    await page.getByLabel('Username').fill('READER');
    await page.getByLabel('Password').fill('demo-only');
    await page.getByRole('button', { name: 'Create User', exact: true }).click();
    await expect(page.getByLabel('Username')).toHaveAccessibleDescription('That username is already taken.');
    await page.getByLabel('Username').fill('ADMIN');
    await page.getByRole('button', { name: 'Create User', exact: true }).click();
    await expect(page.getByLabel('Username')).toHaveAccessibleDescription('The username admin is reserved.');
    expect((await records(page)).users).toEqual(saved.users);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
    await expect(deleteButton(page, 'editor')).toBeEnabled();
    await expect(deleteButton(page, 'reader')).toBeEnabled();
    await page.getByRole('link', { name: 'Back to Dashboard' }).click();
    await expect(page.getByRole('region', { name: 'Total Users', exact: true })).toContainText('3');
    await expect(page.getByRole('region', { name: 'Total Admins' })).toContainText('2');
    await expect(page.getByRole('region', { name: 'Total users', exact: true })).toContainText('1');
    await logout(page, 'Admin');
    await login(page, 'editor', 'demo-only', '/admin');
    await page.getByRole('link', { name: 'Manage Users' }).click();
    await expect(deleteButton(page, 'editor')).toBeDisabled();
    await expect(deleteButton(page, 'editor')).toHaveAccessibleDescription('Your current account cannot be deleted.');
    await expect(deleteButton(page, 'admin')).toBeDisabled();
    await page.getByRole('link', { name: 'Back to Dashboard' }).click();
    await page.getByRole('link', { name: 'Write New Post' }).click();
    await page.getByLabel('Title').fill('Editor retained writing');
    await page.getByLabel('Content').fill('First line\n\n  Retain this author and writing.');
    await page.getByRole('button', { name: 'Publish Post' }).click();
    const retained = (await records(page)).posts[0];
    expect(retained.authorId).toBe(saved.users.find((account) => account.username === 'editor').id);
    await logout(page, 'Editor');
    await login(page, 'reader', 'demo-only', '/blogs');
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Edit Editor retained writing' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Editor retained writing', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
    await logout(page, 'Reader');
    await login(page, 'admin', 'admin', '/admin');
    await page.getByRole('link', { name: 'Manage Users' }).click();
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('posts will be retained');
      await dialog.dismiss();
    });
    await deleteButton(page, 'editor').click();
    expect((await records(page)).users).toEqual(saved.users);
    page.once('dialog', async (dialog) => dialog.accept());
    await deleteButton(page, 'editor').click();
    await expect(page.getByRole('status')).toHaveText('Account editor deleted. Posts retained.');
    saved = await records(page);
    expect(saved.users.map((account) => account.username)).toEqual(['reader']);
    expect(saved.posts).toEqual([retained]);
    await page.reload();
    await expect(deleteButton(page, 'editor')).toHaveCount(0);
    await expect(deleteButton(page, 'admin')).toBeDisabled();
    await page.getByRole('link', { name: 'Back to Dashboard' }).click();
    await expect(page.getByRole('article').getByRole('img', { name: 'user avatar' })).toBeVisible();
    await expect(page.getByRole('article')).toContainText('Editor');
    await page.getByRole('link', { name: 'Edit Editor retained writing' }).click();
    await expect(page.getByLabel('Content')).toHaveValue(retained.content);
    await page.getByLabel('Title').fill('Admin revised retained writing');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    expect((await records(page)).posts).toEqual([{ ...retained, title: 'Admin revised retained writing' }]);
    await dashboard(page);
    await page.getByRole('link', { name: 'Write New Post' }).click();
    await page.getByLabel('Title').fill('Built-in admin writing');
    await page.getByLabel('Content').fill('New editorial note.');
    await page.getByRole('button', { name: 'Publish Post' }).click();
    const adminPost = (await records(page)).posts.find((post) => post.authorId === 'default-admin');
    expect(adminPost.authorName).toBe('Admin');
    await dashboard(page);
    await expect(page.getByRole('article').first()).toContainText('Built-in admin writing');
    await expect(page.getByRole('region', { name: 'Total Posts' })).toContainText('2');
    page.once('dialog', async (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Delete Built-in admin writing' }).click();
    expect((await records(page)).posts).toHaveLength(2);
    page.once('dialog', async (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Built-in admin writing' }).click();
    expect((await records(page)).posts).toEqual([{ ...retained, title: 'Admin revised retained writing' }]);
    page.once('dialog', async (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Admin revised retained writing' }).click();
    await expect(page.getByText('No posts yet. Make room for the first thought.')).toBeVisible();
    await page.reload();
    expect((await records(page)).posts).toEqual([]);
    await expect(page.getByRole('region', { name: 'Total Posts' })).toContainText('0');
    await expect(page.getByRole('region', { name: 'Total Users', exact: true })).toContainText('2');
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
    expect(await page.evaluate(() => localStorage.getItem('writespace_theme'))).toBe(theme);
  });
}

test('admin dashboard shows only the five newest UI-created posts while counting all six', async ({ page }) => {
  await page.goto('/');
  await login(page, 'admin', 'admin', '/admin');
  const totalPosts = page.getByRole('region', { name: 'Total Posts', exact: true });
  await expect(totalPosts).toHaveText('Total Posts0All locally saved posts');
  const titles = [
    'Oldest editorial note',
    'Second editorial note',
    'Third editorial note',
    'Fourth editorial note',
    'Fifth editorial note',
    'Newest editorial note',
  ];

  for (const title of titles) {
    await page.getByRole('link', { name: 'Write New Post', exact: true }).click();
    await expect(page).toHaveURL('/write');
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Content').fill(`Non-sensitive demo writing for ${title}.`);
    await page.getByRole('button', { name: 'Publish Post', exact: true }).click();
    await expect(page).toHaveURL(/\/blog\/[^/]+$/);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await dashboard(page);
  }

  const recent = page.getByRole('region', { name: 'Recent Posts', exact: true });
  await expect(recent.getByRole('article')).toHaveCount(5);
  await expect(recent.getByRole('heading', { level: 3 })).toHaveText([...titles].reverse().slice(0, 5));
  await expect(recent.getByRole('link', { name: titles[0], exact: true })).toHaveCount(0);
  await expect(totalPosts).toHaveText('Total Posts6All locally saved posts');
  expect((await records(page)).posts.map((post) => post.title)).toEqual(titles);
});
