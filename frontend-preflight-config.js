/** Run the evidence-only captures against an owned application server. */
import { defineConfig } from './frontend/node_modules/@playwright/test/index.mjs';
export default defineConfig({ testDir: '.', testMatch: 'theme-preflight.spec.js', workers: 1, use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4173', channel: 'chromium' }, webServer: { cwd: 'frontend', command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false } });
