/** Exercise dark admin CRUD with real storage and fixture-owned console/page error assertions.
 * Notes:
 *   Run in the existing desktop and mobile projects; browser execution belongs to the parent.
 *   Only initial entry uses goto. All subsequent navigation uses application controls.
 */
import { test, expect } from './fixtures';

/** Open the public responsive navigation only when needed. */
async function openPublicMenu(page) {
  const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await trigger.isVisible()) await trigger.click();
}

/** Read real persisted records for assertions without seeding browser state. */
async function records(page) {
  return page.evaluate(() => ({
    users: JSON.parse(localStorage.getItem('writespace_users') ?? '[]'),
    posts: JSON.parse(localStorage.getItem('writespace_posts') ?? '[]'),
    session: JSON.parse(localStorage.getItem('writespace_session') ?? 'null'),
    theme: localStorage.getItem('writespace_theme'),
  }));
}

/** Query the visible table or mobile account action. */
function deleteButton(page, username) {
  return page.locator(`button[aria-label="Delete ${username}"]:visible`);
}

test('dark admin validates, creates, cancels/confirms deletion and returns to light dashboard', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Dark mode', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect((await records(page)).theme).toBe('dark');
  await openPublicMenu(page);
  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  await expect(page.getByRole('main')).toHaveCSS('background-color', 'rgb(2, 6, 23)');
  const total = page.getByRole('region', { name: 'Total Users', exact: true });
  await expect(total).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  await expect(total).toHaveText('Total Users1All accounts, including built-in admin');
  expect((await records(page)).session).toMatchObject({ userId: 'default-admin', role: 'admin' });
  await page.getByRole('link', { name: 'Manage Users' }).click();
  await expect(page).toHaveURL('/users');
  await expect(page.locator('form')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  await expect(deleteButton(page, 'admin')).toBeDisabled();
  await expect(deleteButton(page, 'admin')).toHaveAccessibleDescription('Default admin cannot be deleted.');
  await page.getByRole('button', { name: 'Create User', exact: true }).click();
  for (const label of ['Display Name', 'Username', 'Password']) {
    await expect(page.getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel(label)).toHaveAccessibleDescription('This field is required.');
  }
  await expect(page.getByRole('alert').first()).toHaveCSS('color', 'rgb(252, 165, 165)');
  expect((await records(page)).users).toEqual([]);
  await page.getByLabel('Display Name').fill('Theme Reader');
  await page.getByLabel('Username').fill('theme-reader');
  await page.getByLabel('Password').fill('demo-only');
  await page.getByLabel('Role').selectOption('user');
  await page.getByRole('button', { name: 'Create User', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Account theme-reader created.');
  const saved = await records(page);
  expect(saved.users).toHaveLength(1);
  expect(saved.users[0]).toMatchObject({ username: 'theme-reader', displayName: 'Theme Reader', role: 'user' });
  expect(saved.theme).toBe('dark');
  await expect(deleteButton(page, 'theme-reader')).toBeEnabled();
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('table')).toBeHidden();
    await expect(page.getByRole('article', { name: 'Account theme-reader' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Account theme-reader' }))
      .toHaveCSS('background-color', 'rgb(15, 23, 42)');
  } else {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('table').locator('thead')).toHaveCSS('background-color', 'rgb(30, 41, 59)');
  }
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toBe('Delete account theme-reader? Their posts will be retained.');
    await dialog.dismiss();
  });
  await deleteButton(page, 'theme-reader').click();
  expect((await records(page)).users).toEqual(saved.users);
  await expect(deleteButton(page, 'theme-reader')).toBeEnabled();
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('Delete account theme-reader? Their posts will be retained.');
    await dialog.accept();
  });
  await deleteButton(page, 'theme-reader').click();
  await expect(page.getByRole('status')).toHaveText('Account theme-reader deleted. Posts retained.');
  expect((await records(page)).users).toEqual([]);
  expect((await records(page)).posts).toEqual(saved.posts);
  await expect(deleteButton(page, 'theme-reader')).toHaveCount(0);
  await expect(deleteButton(page, 'admin')).toBeDisabled();
  await page.getByRole('link', { name: 'Back to Dashboard' }).click();
  await expect(page).toHaveURL('/admin');
  await expect(total).toHaveText('Total Users1All accounts, including built-in admin');
  await expect(total).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  await expect(page.getByRole('main')).toHaveCSS('background-color', 'rgb(248, 250, 252)');
  await expect(total).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const final = await records(page);
  expect(final.theme).toBe('light');
  expect(final.session).toEqual(saved.session);
  expect(final.posts).toEqual(saved.posts);
});
