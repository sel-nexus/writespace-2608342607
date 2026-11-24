/** Exercise public discovery against real browser storage on desktop and mobile. */
import { test, expect } from './fixtures';

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
    await publicNav.getByRole('button', { name: 'Open menu' }).click();
    await expect(publicNav.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    await page.screenshot({ path: testInfo.outputPath('discovery-menu.png') });
    await publicNav.getByRole('button', { name: 'Close menu' }).click();
    await expect(publicNav.getByRole('link', { name: 'Login' })).toBeHidden();
    await publicNav.getByRole('button', { name: 'Open menu' }).click();
  }
  await publicNav.getByRole('link', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await page.getByRole('link', { name: 'Start Reading' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await page.getByRole('link', { name: 'Get Started Free' }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.goBack();
  if (testInfo.project.name === 'mobile') {
    await publicNav.getByRole('button', { name: 'Open menu' }).click();
  }
  await publicNav.getByRole('link', { name: 'Get Started', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test('latest previews come only from real local storage, newest first and limited to three', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const posts = [1, 4, 2, 3].map((day) => ({
      id: `${String(day).padStart(8, '0')}-1111-4111-8111-111111111111`,
      title: `Local story ${day}`,
      content: `Browser-local words ${day}. ${'A'.repeat(130)}`,
      createdAt: `2026-03-${String(day).padStart(2, '0')}T12:00:00.000Z`,
      authorId: 'default-admin',
      authorName: 'Admin',
    }));
    localStorage.setItem('writespace_posts', JSON.stringify(posts));
  });
  await page.goto('/');
  const latest = page.getByRole('region', { name: 'Latest from the Blog' });
  await expect(latest.getByRole('heading', { level: 3 })).toHaveText(['Local story 4', 'Local story 3', 'Local story 2']);
  await expect(latest.getByText('Local story 1')).toHaveCount(0);
  await expect(latest.getByText('Mar 04, 2026')).toBeVisible();
  await expect(latest.getByText(`Browser-local words 4. ${'A'.repeat(98)}…`, { exact: true })).toBeVisible();
  await expect(latest.getByRole('link', { name: 'Local story 4' })).toHaveAttribute('href', '/blog/00000004-1111-4111-8111-111111111111');
  await page.screenshot({ path: testInfo.outputPath('discovery-local-previews.png'), fullPage: true });
  await page.reload();
  await expect(latest.getByRole('heading', { level: 3 })).toHaveText(['Local story 4', 'Local story 3', 'Local story 2']);
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
