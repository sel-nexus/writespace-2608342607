/** Exercise public discovery against real browser storage on desktop and mobile. */
import { test, expect } from './fixtures';

/** Open the public disclosure only when the responsive menu is closed and visible. */
async function openPublicMenu(page) {
  const publicNav = page.getByRole('navigation', { name: 'Public navigation' });
  const openMenu = publicNav.getByRole('button', { name: 'Open menu' });
  if (await openMenu.isVisible()) {
    await openMenu.click();
    await expect(publicNav.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
  }
}

test('guest sees the empty landing and follows public auth actions', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('WriteSpace.');
  await expect(page.getByText('Your thoughts. Your space. Beautifully simple.')).toBeVisible();
  await expect(page.getByText('No posts yet — check back soon!')).toBeVisible();
  for (const title of ['Write Freely', 'Private & Local', 'Instant & Fast']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }
  const footer = page.getByRole('navigation', { name: 'Footer navigation' });
  for (const [name, path] of [['Home', '/'], ['All Blogs', '/blogs'], ['Login', '/login'], ['Register', '/register']]) {
    await expect(footer.getByRole('link', { name })).toHaveAttribute('href', path);
  }
  await page.screenshot({ path: testInfo.outputPath('discovery-empty.png'), fullPage: true });
  const publicNav = page.getByRole('navigation', { name: 'Public navigation' });
  if (testInfo.project.name === 'mobile') {
    await openPublicMenu(page);
    await expect(publicNav.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    await page.screenshot({ path: testInfo.outputPath('discovery-menu.png') });
    await publicNav.getByRole('button', { name: 'Close menu' }).click();
    await expect(publicNav.getByRole('link', { name: 'Login' })).toBeHidden();
  }
  await openPublicMenu(page);
  await publicNav.getByRole('link', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('main').getByRole('link', { name: 'WriteSpace home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('main').getByRole('link', { name: 'WriteSpace home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole('main').getByRole('link', { name: 'WriteSpace home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await openPublicMenu(page);
  await publicNav.getByRole('link', { name: 'Get Started', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole('main').getByRole('link', { name: 'WriteSpace home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  for (const [name, destination, heading] of [
    ['Home', /\/$/, 'WriteSpace.'],
    ['All Blogs', /\/login$/, 'Welcome back.'],
    ['Login', /\/login$/, 'Welcome back.'],
    ['Register', /\/register$/, 'Make room to write.'],
  ]) {
    await footer.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(destination);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    if (name !== 'Home') {
      await page.getByRole('main').getByRole('link', { name: 'WriteSpace home', exact: true }).click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('WriteSpace.');
    }
  }
});

test('latest previews come only from real local storage, newest first and limited to three', async ({ page }, testInfo) => {
  await page.goto('/');
  const seededPosts = await page.evaluate(() => {
    const posts = [1, 4, 2, 3].map((day) => ({
      id: `${String(day).padStart(8, '0')}-1111-4111-8111-111111111111`,
      title: `Local story ${day}`,
      content: `Browser-local words ${day}. ${'A'.repeat(130)}`,
      createdAt: `2026-03-${String(day).padStart(2, '0')}T12:00:00.000Z`,
      authorId: 'default-admin',
      authorName: 'Admin',
    }));
    const dataset = JSON.stringify(posts);
    localStorage.setItem('writespace_posts', dataset);
    return dataset;
  });
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('main').getByRole('link', { name: 'WriteSpace home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBe(seededPosts);
  const latest = page.getByRole('region', { name: 'Latest from the Blog' });
  await expect(latest.getByRole('heading', { level: 3 })).toHaveText(['Local story 4', 'Local story 3', 'Local story 2']);
  await expect(latest.getByText('Local story 1')).toHaveCount(0);
  await expect(latest.getByText('Mar 04, 2026')).toBeVisible();
  await expect(latest.getByText(`Browser-local words 4. ${'A'.repeat(97)}…`, { exact: true })).toBeVisible();
  await expect(latest.getByRole('link', { name: 'Local story 4' })).toHaveAttribute('href', '/blog/00000004-1111-4111-8111-111111111111');
  await page.screenshot({ path: testInfo.outputPath('discovery-local-previews.png'), fullPage: true });
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBe(seededPosts);
  await expect(latest.getByRole('heading', { level: 3 })).toHaveText(['Local story 4', 'Local story 3', 'Local story 2']);
  await expect(latest.getByText('Local story 1')).toHaveCount(0);
  await expect(latest.getByText('Mar 04, 2026')).toBeVisible();
  await expect(latest.getByText(`Browser-local words 4. ${'A'.repeat(97)}…`, { exact: true })).toBeVisible();
  // The completed identity slice owns the guard at the preview destination.
  await latest.getByRole('link', { name: 'Local story 4' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('corrupt browser records degrade to the empty discovery state', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('writespace_posts', '{invalid'));
  await page.goto('/');
  await expect(page.getByText('No posts yet — check back soon!')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start Reading' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('discovery-corrupt-storage.png'), fullPage: true });
});
