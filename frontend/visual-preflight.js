/** Capture representative WriteSpace views without joining the E2E test suite.
 * Notes:
 *   Run manually with node frontend/visual-preflight.js after starting the preview server.
 *   All demonstration records belong to a fresh, disposable browser context.
 *   E2E_BASE_URL defaults to http://127.0.0.1:4173. This script does not start a server.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const outputDirectory = fileURLToPath(new URL('./visual-output/', import.meta.url));
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };

/** Save a screenshot, accessible structure, typography signals, and rendered HTML.
 * Args:
 *   page: The isolated review page at the desired state.
 *   name: Stable filename prefix for this capture.
 * Raises:
 *   Error: When browser capture or writing evidence fails.
 */
async function capture(page, name) {
  await page.locator('main').waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const accessibility = page.accessibility?.snapshot
    ? JSON.stringify(await page.accessibility.snapshot({ interestingOnly: false }), null, 2)
    : await page.locator('body').ariaSnapshot();
  const styles = await page.evaluate(() => {
    /** Describe the typography and layout of one rendered element. */
    function describe(element) {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        id: element.id || undefined,
        text: element === document.body ? undefined : element.textContent,
        value: element.matches('input:not([type="password"]), textarea') ? element.value : undefined,
        role: element.getAttribute('role'),
        ariaInvalid: element.getAttribute('aria-invalid'),
        ariaDescribedBy: element.getAttribute('aria-describedby'),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        outline: style.outline,
        boxShadow: style.boxShadow,
        width: bounds.width,
        height: bounds.height,
      };
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      url: location.href,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      documentWidth: document.documentElement.scrollWidth,
      body: describe(document.body),
      headings: [...document.querySelectorAll('h1, h2, h3')].map(describe),
      surfaces: [...document.querySelectorAll('header, main, section, article, form')].map(describe),
      controls: [...document.querySelectorAll('label, input, textarea, button, a')].map(describe),
      feedback: [...document.querySelectorAll('[role="alert"], [role="status"]')].map(describe),
    };
  });
  await writeFile(`${outputDirectory}${name}.png`, await page.screenshot({ fullPage: true }));
  await writeFile(`${outputDirectory}${name}-accessibility.txt`, accessibility, 'utf8');
  await writeFile(`${outputDirectory}${name}-styles.txt`, JSON.stringify(styles, null, 2), 'utf8');
  await writeFile(`${outputDirectory}${name}-html.txt`, await page.content(), 'utf8');
}

/** Choose a theme through the shared native button, revealing mobile navigation first.
 * Args:
 *   page: Review page on a route with public or authenticated navigation.
 *   theme: Desired light or dark preference.
 */
async function selectTheme(page, theme) {
  const openMenu = page.getByRole('button', { name: /^Open (navigation )?menu$/ });
  if (await openMenu.isVisible()) await openMenu.click();
  const currentTheme = await page.evaluate(() => (
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  ));
  if (currentTheme !== theme) {
    await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
  } else if (await page.evaluate(() => localStorage.getItem('writespace_theme')) !== theme) {
    const other = theme === 'light' ? 'dark' : 'light';
    await page.getByRole('button', { name: `Switch to ${other} mode`, exact: true }).click();
    await page.getByRole('button', { name: `Switch to ${theme} mode`, exact: true }).click();
  }
  await page.waitForFunction((desired) => (
    document.documentElement.classList.contains('dark') === (desired === 'dark')
    && localStorage.getItem('writespace_theme') === desired
  ), theme);
  await page.getByRole('button', {
    name: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, exact: true,
  }).waitFor({ state: 'visible' });
  const closeMenu = page.getByRole('button', { name: /^Close (navigation )?menu$/ });
  if (await closeMenu.isVisible()) await closeMenu.click();
}

/** Capture the same route and form state at both review widths without reloading it. */
async function captureResponsive(page, theme, name) {
  for (const [size, viewport] of [['desktop', desktop], ['mobile', mobile]]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction((desired) => (
      document.documentElement.classList.contains('dark') === (desired === 'dark')
    ), theme);
    await capture(page, `${size}-${theme}-${name}`);
  }
}

/** End the demo session using account controls without resetting the shared theme. */
async function logout(page) {
  await page.setViewportSize(desktop);
  await page.getByRole('button', { name: /^Account options for / }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

/** Cover every implemented route in both themes, including real form feedback. */
async function captureThemeMatrix(page, postId) {
  await logout(page);
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize(mobile);
    await selectTheme(page, theme);
    await captureResponsive(page, theme, 'landing');
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await capture(page, `mobile-${theme}-landing-open-nav`);
    await page.getByRole('link', { name: 'Login', exact: true }).first().click();
    await page.waitForURL('**/login');
    await captureResponsive(page, theme, 'login');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.locator('#username-error').waitFor({ state: 'visible' });
    await captureResponsive(page, theme, 'login-validation');
    await page.getByRole('link', { name: 'Register', exact: true }).click();
    await page.waitForURL('**/register');
    await captureResponsive(page, theme, 'register');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.locator('#displayName-error').waitFor({ state: 'visible' });
    await captureResponsive(page, theme, 'register-validation');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await page.waitForURL('**/login');
    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('admin');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('**/admin');
    // Exercise the authenticated instance of the shared control on a small screen too.
    await selectTheme(page, theme === 'light' ? 'dark' : 'light');
    await selectTheme(page, theme);
    await captureResponsive(page, theme, 'admin');
    for (const [route, name] of [
      ['/users', 'users'], ['/blogs', 'list'], [`/blog/${postId}`, 'read'],
      [`/edit/${postId}`, 'edit'], ['/write', 'write'],
    ]) {
      await page.goto(route);
      await page.waitForURL((url) => url.pathname === route);
      if (name === 'edit') {
        await page.getByRole('heading', { name: 'Edit Post', exact: true }).waitFor();
        await page.locator('#content-counter').filter({ hasText: /^[1-9]\d* characters$/ }).waitFor();
      }
      if (name === 'write') {
        await page.getByLabel('Title', { exact: true }).fill('A page in progress');
        await page.getByLabel('Content', { exact: true }).fill(
          'A non-sensitive demonstration draft.\n\nThe writing form keeps room for thoughts, one paragraph at a time.',
        );
      }
      await captureResponsive(page, theme, name);
      if (name === 'users') {
        await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
        await capture(page, `mobile-${theme}-users-open-nav`);
        await page.getByRole('button', { name: 'Close navigation menu', exact: true }).click();
      }
      if (name === 'write') {
        // A missing title leaves a meaningful draft and nonzero live counter intact.
        await page.getByLabel('Title', { exact: true }).fill('');
        await page.getByRole('button', { name: 'Publish Post', exact: true }).click();
        await page.locator('#title-error').waitFor({ state: 'visible' });
        await page.locator('#content-counter').filter({ hasText: /^[1-9]\d* characters$/ }).waitFor();
        await captureResponsive(page, theme, 'write-validation-counter');
      }
    }
    await logout(page);
  }
}

/** Persist schema-valid demonstration accounts and writing in this context only.
 * Args:
 *   page: Review page already loaded at the application origin.
 * Returns:
 *   The newest persisted post ID for the populated reading capture.
 */
async function createLocalRecords(page) {
  return page.evaluate(() => {
    const createdAt = new Date().toISOString();
    const users = [
      { displayName: 'Mira Solano', username: 'mira-demo', role: 'user' },
      { displayName: 'Theo Okafor', username: 'theo-demo', role: 'user' },
      { displayName: 'Leonie Park', username: 'leonie-demo', role: 'admin' },
    ].map((user) => ({ ...user, id: crypto.randomUUID(), password: 'visual-demo-only', createdAt }));
    const writing = [
      {
        title: 'A little room to begin',
        content: 'Today I made a little room for writing. A blank page is enough to begin.\n\n'
          + 'This is demonstration writing, saved only in this review browser. No private information belongs here.',
      },
      {
        title: 'The walk home',
        content: 'The evening light changed while I walked home. I stopped for a moment to notice it.\n\n'
          + 'A short local demonstration post can hold a simple observation without needing a publishing service.',
      },
      {
        title: 'Keeping a daily page',
        content: 'A daily page does not need to be perfect. It only needs a few words worth returning to.\n\n'
          + 'These records exist solely for visual review and will disappear when this browser context closes.',
      },
    ];
    const posts = writing.map((post, index) => ({
      ...post,
      id: crypto.randomUUID(),
      authorId: users[index].id,
      authorName: users[index].displayName,
      createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    }));
    localStorage.setItem('writespace_users', JSON.stringify(users));
    localStorage.setItem('writespace_posts', JSON.stringify(posts));
    return posts[0].id;
  });
}

/** Review public, authenticated, populated, and small-screen navigation states.
 * Raises:
 *   Error: When the preview origin, browser, page state, or evidence capture fails.
 * Notes:
 *   Close the owned context and browser even when a capture fails.
 */
async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ channel: 'chromium' });
  let context;
  try {
    context = await browser.newContext({ viewport: desktop, baseURL });
    const page = await context.newPage();
    await page.goto('/');
    await capture(page, 'desktop-landing-empty');
    const postId = await createLocalRecords(page);
    await page.reload();
    await capture(page, 'desktop-landing');
    await page.setViewportSize(mobile);
    await capture(page, 'mobile-landing');
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await capture(page, 'mobile-landing-open-nav');
    await page.getByRole('link', { name: 'Login', exact: true }).first().click();
    await page.setViewportSize(desktop);
    await capture(page, 'desktop-login');
    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('admin');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL('**/admin');
    await capture(page, 'desktop-admin');
    await page.getByRole('link', { name: 'Users', exact: true }).click();
    await page.waitForURL('**/users');
    await capture(page, 'desktop-users');
    await page.setViewportSize(mobile);
    await capture(page, 'mobile-users');
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    await capture(page, 'mobile-users-open-nav');
    await page.getByRole('link', { name: 'Write', exact: true }).click();
    await page.waitForURL('**/write');
    await page.setViewportSize(desktop);
    await page.getByLabel('Title', { exact: true }).fill('A page in progress');
    await page.getByLabel('Content', { exact: true }).fill(
      'A non-sensitive demonstration draft.\n\nThe writing form keeps room for thoughts, one paragraph at a time.',
    );
    await capture(page, 'desktop-write');
    await page.getByRole('link', { name: 'All Blogs', exact: true }).click();
    await page.waitForURL('**/blogs');
    await page.locator(`a[href="/blog/${postId}"]`).first().click();
    await page.waitForURL(`**/blog/${postId}`);
    await capture(page, 'desktop-read');
    await captureThemeMatrix(page, postId);
    console.log(`Visual preflight evidence saved to ${outputDirectory}`);
  } finally {
    try {
      await context?.close();
    } finally {
      await browser.close();
    }
  }
}

main().catch((error) => {
  console.error('Visual preflight failed:', error);
  process.exitCode = 1;
});
