/** Capture both-theme rendered evidence using the existing visual review script. */
import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile('frontend/visual-preflight.js', 'utf8');
for (const theme of ['light', 'dark']) {
  const adapted = source
    .replace("const outputDirectory = fileURLToPath(new URL('./visual-output/', import.meta.url));", `const outputDirectory = fileURLToPath(new URL('./visual-output/${theme}/', import.meta.url));`)
    .replace('const page = await context.newPage();', `await context.addInitScript(() => { if (!localStorage.getItem('writespace_theme')) localStorage.setItem('writespace_theme', '${theme}'); });\n    const page = await context.newPage();`);
  await writeFile(`frontend/theme-visual-${theme}.js`, adapted);
}
