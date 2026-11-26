/** Capture both-theme desktop/mobile evidence without duplicating journey tests. */
import { test, expect } from './frontend/e2e/fixtures.js';
import { mkdir, writeFile } from 'node:fs/promises';

for (const theme of ['light', 'dark']) {
  test(`visual evidence ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('writespace_theme', value), theme);
    await page.goto('/');
    const userId = '10000000-0000-4000-8000-000000000001';
    const postId = '20000000-0000-4000-8000-000000000001';
    await page.evaluate(({ userId, postId }) => {
      localStorage.setItem('writespace_users', JSON.stringify([{ id: userId, displayName: 'Mira Demo', username: 'mira', password: 'demo-only', role: 'user', createdAt: '2026-01-01T12:00:00.000Z' }]));
      localStorage.setItem('writespace_posts', JSON.stringify([{ id: postId, title: 'A little room to begin', content: 'A blank page is enough to begin.\n\nNon-sensitive demonstration writing saved only in this browser.', authorId: userId, authorName: 'Mira Demo', createdAt: '2026-01-02T12:00:00.000Z' }]));
    }, { userId, postId });
    const output = `frontend/visual-output/${theme}`;
    await mkdir(output, { recursive: true });
    /** Save actual rendered evidence for a meaningful state at both viewport sizes. */
    async function capture(name) {
      await page.locator('main').waitFor();
      for (const [size, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => document.fonts.ready);
        const contrast = await page.evaluate(() => {
          const rgb = (value) => (value.match(/[\d.]+/g) || []).map(Number);
          const luminance = (c) => c.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
          const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          const background = (element) => {
            const layers = [];
            for (let el = element; el; el = el.parentElement) layers.push(rgb(getComputedStyle(el).backgroundColor));
            return layers.reverse().reduce((base, c) => { const a = c[3] ?? 1; return c.slice(0, 3).map((v, i) => v * a + base[i] * (1 - a)); }, [255, 255, 255]);
          };
          return [...document.querySelectorAll('h1,h2,h3,p,label,input,textarea,select,button,a,time,span')].filter((el) => el.getBoundingClientRect().width > 1 && getComputedStyle(el).visibility !== 'hidden').map((el) => {
            const s = getComputedStyle(el), bg = background(el);
            const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
            const textRatio = ratio(rgb(s.color), bg);
            const placeholder = el.hasAttribute('placeholder') ? ratio(rgb(getComputedStyle(el, '::placeholder').color), bg) : null;
            return { tag: el.tagName, text: el.textContent?.trim().slice(0, 60), background: bg, foreground: s.color, textRatio, threshold: large ? 3 : 4.5, placeholderRatio: placeholder, disabled: el.disabled === true, borderRatio: ratio(rgb(s.borderColor), bg), hasBorder: parseFloat(s.borderWidth) > 0 };
          });
        });
        await writeFile(`${output}/${size}-${name}-contrast.json`, JSON.stringify(contrast, null, 2));
        const styles = await page.evaluate(() => ({
          font: getComputedStyle(document.body).fontFamily,
          root: document.documentElement.className,
          width: innerWidth, documentWidth: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll('h1,h2,p,label,input,textarea,select,button,a')].filter((el) => el.getBoundingClientRect().width > 0).map((el) => {
            const s = getComputedStyle(el);
            return { tag: el.tagName, text: el.textContent?.slice(0, 100), color: s.color, background: s.backgroundColor, border: s.borderColor, fontSize: s.fontSize, fontWeight: s.fontWeight };
          }),
        }));
        expect(styles.documentWidth).toBeLessThanOrEqual(width);
        await page.screenshot({ path: `${output}/${size}-${name}.png`, fullPage: true });
        const tree = page.accessibility?.snapshot ? JSON.stringify(await page.accessibility.snapshot()) : await page.locator('body').ariaSnapshot();
        await writeFile(`${output}/${size}-${name}.txt`, `${tree}\n\nSTYLES\n${JSON.stringify(styles, null, 2)}\n\nHTML\n${await page.content()}`);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await page.reload();
    await capture('landing');
    await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Register', exact: true }).click();
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await capture('register-errors');
    await page.getByRole('main').getByRole('link', { name: 'WriteSpace home' }).click();
    await page.getByRole('link', { name: 'Login', exact: true }).first().click();
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await capture('login-errors');
    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('admin');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await capture('admin');
    await page.getByRole('link', { name: 'Users', exact: true }).click();
    await page.getByRole('button', { name: 'Create User', exact: true }).click();
    await capture('users-errors');
    await page.getByRole('link', { name: 'Write', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('A page in progress');
    await capture('write');
    await page.getByRole('link', { name: 'All Blogs', exact: true }).click();
    await capture('blogs');
    await page.locator(`a[href="/blog/${postId}"]`).first().click();
    await capture('read');
    await page.getByRole('link', { name: 'Edit', exact: true }).click();
    await capture('edit');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    await page.screenshot({ path: `${output}/mobile-menu.png`, fullPage: true });
  });
}
