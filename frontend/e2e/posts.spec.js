/** Exercise persisted writing with real UI-created accounts and no mocked storage.
 * Notes:
 *   Written for the parent's final E2E run; not executed during this slice.
 *   Shared fixtures attach browser error capture before the first navigation.
 */
import { test, expect } from './fixtures';

/** Expand responsive authenticated navigation when it is closed. */
async function openNavigation(page) {
  const button = page.getByRole('button', { name: 'Open navigation menu', exact: true });
  if (await button.isVisible()) await button.click();
}

/** Expand responsive public navigation when it is closed. */
async function openPublicMenu(page) {
  const button = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await button.isVisible()) await button.click();
}

/** Register a real demonstration account from the public navigation.
 * Args:
 *   page: Error-monitored browser page at the landing route.
 *   name: Unique display name and username within this browser.
 */
async function registerReader(page, name) {
  await openPublicMenu(page);
  await page.getByRole('link', { name: 'Get Started', exact: true }).click();
  await page.getByLabel('Display Name').fill(name);
  await page.getByLabel('Username').fill(name.toLowerCase());
  await page.getByLabel('Password', { exact: true }).fill('demo-only');
  await page.getByLabel('Confirm Password').fill('demo-only');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL('/blogs');
}

/** Sign out through account actions without changing storage programmatically. */
async function logout(page, name) {
  await openNavigation(page);
  await page.getByRole('button', { name: `Account options for ${name}` }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL('/');
}

/** Login through public navigation with real demo credentials. */
async function login(page, username, password) {
  await openPublicMenu(page);
  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(username === 'admin' ? '/admin' : '/blogs');
}

/** Open the editor through the authenticated Write link. */
async function openWriter(page) {
  await openNavigation(page);
  await page.getByRole('link', { name: 'Write', exact: true }).click();
  await expect(page).toHaveURL('/write');
}

/** Read persisted records without seeding or bypassing application mutations.
 * Returns:
 *   Actual posts saved by the UI.
 */
async function readPosts(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts') ?? '[]'));
}

test('both list writing CTAs open the editor and cancel drafts without changing storage', async ({ page }) => {
  await page.goto('/');
  await registerReader(page, 'ListCtaWriter');
  await expect(page.getByRole('heading', { name: 'All Blogs', exact: true })).toBeVisible();
  await expect(page.getByText('No blogs yet. Be the first to write one!')).toBeVisible();
  const storedPosts = await page.evaluate(() => localStorage.getItem('writespace_posts'));
  expect(await readPosts(page)).toEqual([]);

  for (const cta of ['Write New Post', 'Write your first post']) {
    const link = page.getByRole('main').getByRole('link', { name: cta, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL('/write');
    await expect(page.getByRole('heading', { name: 'Write a Post', exact: true })).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue('');
    await expect(page.getByLabel('Content')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Publish Post', exact: true })).toBeVisible();
    await page.getByLabel('Title').fill(`Discarded draft from ${cta}`);
    await page.getByLabel('Content').fill('Cancel this draft without publishing it.');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL('/blogs');
    await expect(page.getByRole('heading', { name: 'All Blogs', exact: true })).toBeVisible();
    await expect(page.getByText('No blogs yet. Be the first to write one!')).toBeVisible();
    expect(await readPosts(page)).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBe(storedPosts);
  }
});

test('register, validate, write, reload, read, edit, cancel delete and delete persisted writing', async ({ page }) => {
  await page.goto('/');
  await registerReader(page, 'PostWriter');
  await expect(page.getByText('No blogs yet. Be the first to write one!')).toBeVisible();
  await openWriter(page);
  await page.getByRole('button', { name: 'Publish Post' }).click();
  await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Content')).toHaveAttribute('aria-invalid', 'true');
  expect(await readPosts(page)).toEqual([]);
  const content = 'First line\n\n  Keep these spaces  \n<script>alert("plain text")</script>';
  await page.getByLabel('Title').fill('A local thought');
  await page.getByLabel('Content').fill(content);
  await expect(page.getByText(`${content.length} characters`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Publish Post' }).click();
  const saved = (await readPosts(page))[0];
  await expect(page).toHaveURL(`/blog/${saved.id}`);
  expect(saved).toMatchObject({ title: 'A local thought', content, authorName: 'PostWriter' });
  expect(saved.authorId).toBe(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')).userId));
  expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(new Date(saved.createdAt).toISOString()).toBe(saved.createdAt);
  await page.reload();
  await expect(page.getByRole('heading', { name: saved.title })).toBeVisible();
  expect(await page.locator('article p.whitespace-pre-wrap').textContent()).toBe(content);
  await expect(page.locator('article script')).toHaveCount(0);
  expect(await readPosts(page)).toEqual([saved]);
  await page.getByRole('link', { name: 'Back to All Posts' }).click();
  await page.getByRole('link', { name: saved.title, exact: true }).click();
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Title')).toHaveValue(saved.title);
  await expect(page.getByLabel('Content')).toHaveValue(content);
  await page.getByLabel('Title').fill('Discarded title');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(`/blog/${saved.id}`);
  expect(await readPosts(page)).toEqual([saved]);
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Title').fill('An edited thought');
  await page.getByLabel('Content').fill('Edited\n\n  whitespace retained  ');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  const updated = { ...saved, title: 'An edited thought', content: 'Edited\n\n  whitespace retained  ' };
  await expect(page).toHaveURL(`/blog/${saved.id}`);
  expect(await readPosts(page)).toEqual([updated]);
  await page.reload();
  await expect(page.getByRole('heading', { name: updated.title })).toBeVisible();
  expect(await page.locator('article p.whitespace-pre-wrap').textContent()).toBe(updated.content);
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL(`/blog/${saved.id}`);
  expect(await readPosts(page)).toEqual([updated]);
  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL('/blogs');
  expect(await readPosts(page)).toEqual([]);
  await page.reload();
  await expect(page.getByText('No blogs yet. Be the first to write one!')).toBeVisible();
});

test('two real accounts respect ownership while administrator edits, creates and deletes', async ({ page }) => {
  await page.goto('/');
  await registerReader(page, 'FirstAuthor');
  await openWriter(page);
  await page.getByLabel('Title').fill('First author post');
  await page.getByLabel('Content').fill('Writing belongs to the first author.');
  await page.getByRole('button', { name: 'Publish Post' }).click();
  const first = (await readPosts(page))[0];
  await logout(page, 'FirstAuthor');
  await registerReader(page, 'SecondAuthor');
  await expect(page.getByRole('link', { name: 'Edit First author post', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'First author post', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to All Posts' }).click();
  await openWriter(page);
  await page.getByLabel('Title').fill('Second author post');
  await page.getByLabel('Content').fill('A second account can write its own post.');
  await page.getByRole('button', { name: 'Publish Post' }).click();
  const second = (await readPosts(page)).find((post) => post.id !== first.id);
  expect(second.authorId).not.toBe(first.authorId);
  await page.getByRole('link', { name: 'Back to All Posts' }).click();
  await expect(page.getByRole('link', { name: 'Edit Second author post', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit First author post', exact: true })).toHaveCount(0);
  await logout(page, 'SecondAuthor');
  await login(page, 'firstauthor', 'demo-only');
  await expect(page.getByRole('link', { name: 'Edit First author post', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Second author post', exact: true })).toHaveCount(0);
  await logout(page, 'FirstAuthor');
  await login(page, 'admin', 'admin');
  await openNavigation(page);
  await page.getByRole('link', { name: 'All Blogs', exact: true }).click();
  await page.getByRole('link', { name: 'Edit First author post', exact: true }).click();
  await page.getByLabel('Title').fill('Administrator revised title');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  expect((await readPosts(page)).find((post) => post.id === first.id)).toEqual({ ...first, title: 'Administrator revised title' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Administrator revised title' })).toBeVisible();
  page.once('dialog', async (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL('/blogs');
  expect(await readPosts(page)).toEqual([second]);
  await openWriter(page);
  await page.getByLabel('Title').fill('Administrator writing');
  await page.getByLabel('Content').fill('Admins can also create their own writing.');
  await page.getByRole('button', { name: 'Publish Post' }).click();
  const adminPost = (await readPosts(page)).find((post) => post.authorId === 'default-admin');
  expect(adminPost.authorName).toBe('Admin');
  await expect(page.getByRole('article').getByRole('img', { name: 'admin avatar' })).toBeVisible();
  await page.reload();
  expect(await readPosts(page)).toEqual([second, adminPost]);
});

// Direct-entry access boundaries are isolated from the link-only writing journeys above.
for (const path of ['/blogs', '/blog/missing', '/write', '/edit/missing']) {
  test(`guest cannot directly enter posts route ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL('/login');
    await expect(page.getByLabel('Username')).toBeVisible();
  });
}

test('direct nonowner edit redirects without changing retained orphaned writing', async ({ page }) => {
  await page.addInitScript(() => {
    const ownerId = '11111111-1111-4111-8111-111111111111';
    const reader = {
      id: '22222222-2222-4222-8222-222222222222', displayName: 'Boundary Reader', username: 'boundary',
      password: 'demo-only', role: 'user', createdAt: '2026-03-04T12:00:00.000Z',
    };
    localStorage.setItem('writespace_users', JSON.stringify([reader]));
    localStorage.setItem('writespace_session', JSON.stringify({
      userId: reader.id, username: reader.username, displayName: reader.displayName, role: reader.role,
    }));
    localStorage.setItem('writespace_posts', JSON.stringify([{
      id: '33333333-3333-4333-8333-333333333333', title: 'Other author', content: 'Retained writing',
      authorId: ownerId, authorName: 'Deleted author', createdAt: '2026-03-04T12:00:00.000Z',
    }]));
  });
  await page.goto('/edit/33333333-3333-4333-8333-333333333333');
  await expect(page).toHaveURL('/blogs');
  expect((await readPosts(page))[0].title).toBe('Other author');
});

for (const path of ['/blog/missing', '/edit/missing']) {
  test(`signed-in missing post boundary at ${path}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('writespace_session', JSON.stringify({
      userId: 'default-admin', username: 'admin', displayName: 'Admin', role: 'admin',
    })));
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to All Posts' }).click();
    await expect(page).toHaveURL('/blogs');
  });
}
