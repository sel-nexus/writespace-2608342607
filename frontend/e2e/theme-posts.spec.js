/** Exercise themed post journeys with UI mutations and shared console monitoring.
 * Notes:
 *   Browser execution is deferred to the lead's final verification run.
 */
import { test, expect } from './fixtures.js';

/** Check the named toggle, persisted preference and document appearance. */
async function expectTheme(page, theme) {
  await expect(page.getByRole('button', { name: 'Dark mode' }))
    .toHaveAttribute('aria-pressed', String(theme === 'dark'));
  await expect.poll(() => page.evaluate(() => ({
    saved: localStorage.getItem('writespace_theme'),
    dark: document.documentElement.classList.contains('dark'),
    scheme: document.documentElement.style.colorScheme,
  }))).toEqual({ saved: theme, dark: theme === 'dark', scheme: theme });
}

/** Reveal the existing responsive navigation when collapsed. */
async function openNavigation(page) {
  const menu = page.getByRole('button', { name: /^(Open menu|Open navigation menu)$/ });
  if (await menu.isVisible()) await menu.click();
}

/** Create an actual demo account through the registration screen. */
async function registerReader(page, name) {
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await page.getByLabel('Display Name').fill(name);
  await page.getByLabel('Username').fill(name.toLowerCase());
  await page.getByLabel('Password', { exact: true }).fill('demo-only');
  await page.getByLabel('Confirm Password').fill('demo-only');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
}

/** Sign out through the responsive account menu. */
async function logout(page) {
  await openNavigation(page);
  await page.getByRole('button', { name: /Account options/ }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** Read records written by the UI without bypassing its mutations. */
async function readPosts(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts') ?? '[]'));
}

for (const theme of ['light', 'dark']) {
  for (const width of [390, 1280]) {
    test(`${theme} post CRUD, draft validation and ownership at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      // Select appearance with the real control, not an injected root class.
      if (theme === 'dark') await page.getByRole('button', { name: 'Dark mode' }).click();
      else {
        await page.getByRole('button', { name: 'Dark mode' }).click();
        await page.getByRole('button', { name: 'Dark mode' }).click();
      }
      await expectTheme(page, theme);
      await registerReader(page, 'ThemeWriter');
      await expect(page.getByText('No blogs yet. Be the first to write one!')).toBeVisible();
      const session = await page.evaluate(() => localStorage.getItem('writespace_session'));
      const accounts = await page.evaluate(() => localStorage.getItem('writespace_users'));
      await page.getByRole('link', { name: 'Write your first post' }).click();
      await page.getByLabel('Title').fill('Unsaved themed draft');
      await page.getByRole('button', { name: 'Publish Post' }).click();
      await expect(page.getByLabel('Content')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByRole('alert')).toHaveText('This field is required.');
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await expectTheme(page, theme === 'dark' ? 'light' : 'dark');
      await expect(page.getByLabel('Title')).toHaveValue('Unsaved themed draft');
      await expect(page.getByRole('alert')).toHaveText('This field is required.');
      expect(await readPosts(page)).toEqual([]);
      expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBe(session);
      expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBe(accounts);
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page).toHaveURL(/\/blogs$/);
      expect(await readPosts(page)).toEqual([]);
      await page.getByRole('link', { name: 'Write New Post', exact: true }).click();
      const content = 'First line\n\n  <script>plain text</script>';
      await page.getByLabel('Title').fill('Themed local writing');
      await page.getByLabel('Content').fill(content);
      await expect(page.getByText(`${content.length} characters`, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Publish Post' }).click();
      await expect(page.getByRole('heading', { name: 'Themed local writing' })).toBeVisible();
      const saved = (await readPosts(page))[0];
      expect(saved).toMatchObject({ title: 'Themed local writing', content, authorName: 'ThemeWriter' });
      expect(saved.authorId).toBe(JSON.parse(session).userId);
      await page.reload();
      await expectTheme(page, theme);
      expect(await page.locator('article p.whitespace-pre-wrap').textContent()).toBe(content);
      await expect(page.locator('article script')).toHaveCount(0);
      await page.getByRole('link', { name: 'Back to All Posts' }).click();
      await expect(page.getByRole('article')).toContainText(saved.authorName);
      await page.getByRole('link', { name: `Edit ${saved.title}` }).click();
      await expect(page.getByLabel('Title')).toHaveValue(saved.title);
      await page.getByLabel('Content').fill('');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await expect(page.getByLabel('Content')).toHaveValue('');
      await expect(page.getByRole('alert')).toHaveText('This field is required.');
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await page.getByRole('button', { name: 'Cancel' }).click();
      expect(await readPosts(page)).toEqual([saved]);
      await page.getByRole('link', { name: saved.title, exact: true }).click();
      await page.getByRole('link', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Title').fill('Edited themed writing');
      await page.getByLabel('Content').fill('Edited\n  whitespace');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      const updated = { ...saved, title: 'Edited themed writing', content: 'Edited\n  whitespace' };
      await expect(page.getByRole('heading', { name: updated.title })).toBeVisible();
      expect(await readPosts(page)).toEqual([updated]);
      await page.reload();
      await expectTheme(page, theme);
      await expect(page.getByRole('heading', { name: updated.title })).toBeVisible();
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toBe('Delete this post? This cannot be undone.');
        await dialog.dismiss();
      });
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      expect(await readPosts(page)).toEqual([updated]);
      await logout(page);
      await registerReader(page, 'OtherReader');
      await expect(page.getByRole('link', { name: `Edit ${updated.title}` })).toHaveCount(0);
      await page.getByRole('link', { name: updated.title, exact: true }).click();
      await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
      expect(await readPosts(page)).toEqual([updated]);
      await logout(page);
      await openNavigation(page);
      await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Login', exact: true }).click();
      await page.getByLabel('Username').fill('admin');
      await page.getByLabel('Password').fill('admin');
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(page).toHaveURL(/\/admin$/);
      await openNavigation(page);
      await page.getByRole('link', { name: 'All Blogs', exact: true }).click();
      await page.getByRole('link', { name: updated.title, exact: true }).click();
      await page.getByRole('link', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Title').fill('Admin revision');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByRole('heading', { name: 'Admin revision' })).toBeVisible();
      expect(await readPosts(page)).toEqual([{ ...updated, title: 'Admin revision' }]);
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page).toHaveURL(/\/blogs$/);
      expect(await readPosts(page)).toEqual([]);
      await page.reload();
      await expect(page.getByText('No blogs yet. Be the first to write one!')).toBeVisible();
      await expectTheme(page, theme);
      await page.screenshot({ path: test.info().outputPath(`posts-${theme}-${width}.png`), fullPage: true });
    });
  }

  for (const path of ['/blog/missing', '/edit/missing']) {
    test(`${theme} direct missing state at ${path}`, async ({ page }) => {
      // Isolated direct-link boundary: no missing-post navigation link exists by design.
      await page.addInitScript((appearance) => {
        localStorage.setItem('writespace_theme', appearance);
        localStorage.setItem('writespace_session', JSON.stringify({
          userId: 'default-admin', username: 'admin', displayName: 'Admin', role: 'admin',
        }));
      }, theme);
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();
      await expectTheme(page, theme);
      await page.getByRole('button', { name: 'Dark mode' }).click();
      await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();
      await page.getByRole('link', { name: 'Back to All Posts' }).click();
      await expect(page).toHaveURL(/\/blogs$/);
      expect(await readPosts(page)).toEqual([]);
    });
  }
}
