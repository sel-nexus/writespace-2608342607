# WriteSpace

A static React 18 / Vite 5 / React Router 6 / Tailwind 3 JavaScript writing demo. Public discovery, local registration/login, owned post CRUD, and administrator account/content management.

## Important limits
This is NOT secure authentication or a shared publishing service. Passwords are plaintext in localStorage; admin/admin is public and permanent. Client-side guards can be bypassed by editing browser data. Never use real passwords or sensitive information. Accounts, posts and sessions belong to this browser and origin; clearing storage loses them. Deleting an account retains posts and names; orphaned authors use book avatars. Corrupt reads degrade gracefully; unsafe writes are refused with inline feedback.

## Run
Node 20+ and npm required.

```sh
cd frontend
npm ci --no-bin-links
cp .env.example .env
npm run dev
```

## Verify
```sh
cd frontend
npm test
npm run build
TMPDIR=/tmp npm run test:e2e
```
Playwright is pinned to 1.64.1 with full Chromium channel. Install the matching browser using `node node_modules/@playwright/test/cli.js install --no-shell chromium` if absent. In the task sandbox set PLAYWRIGHT_BROWSERS_PATH to NEXUS_PLAYWRIGHT_BROWSERS_PATH and TMPDIR=/tmp to avoid Unix socket path-length limits. Visual script: start Vite on E2E_BASE_URL then `node visual-preflight.js`; evidence is saved in visual-output. Linux needs fonts-noto-color-emoji for the explicitly requested crown/book avatars.

## Deploy
`npm run build` emits frontend/dist. Serve static files with SPA fallback. frontend/Dockerfile builds and nginx.conf provides deep-link fallback; Docker context is frontend. Container listens on port 80, health is `/`. No API, database or reverse proxy is required.

Vercel: select Root Directory `frontend`, Vite preset, output `dist`; copy the repository's exact rewrite-only vercel.json into the deployment root (frontend) before deployment. It contains no prohibited build/framework keys. Root settings are managed in Vercel project settings, not extra JSON keys. Hosting deployment itself was not performed.

## Verification outcome
Theme revision: 472 unit/component tests passed. All 94 desktop/mobile browser cases are green across the full run and focused correction runs (initial full run 90 passed/4 mobile menu test-order failures; public rerun 8 passed; post rerun 36 passed after a contrast shade correction). Independent critic PASS, score 1.00, no high failures. Production build passed. Both-theme screenshots/accessibility/styles/HTML captured; representative screenshots inspected. Contrast sampling found and corrected the read-view destructive text shade; complete interaction-state WCAG certification is not claimed. Sandbox emoji font provisioning failed, so captures show missing crown/book glyphs despite correct semantic labels. Docker image execution was not claimed.

## Appearance
The Dark mode button is available in public and authenticated headers, including login/register and mobile. The separate writespace_theme key stores light/dark; absent/invalid/unreadable preference defaults to light. Restoration runs before rendering. A failed preference write keeps the current app-session selection usable without changing accounts, posts or sessions. Existing light layouts and colors are preserved; dark slate surfaces are added. No migration is needed.

## Dependency warning
Pinned dependency audit reported 10 advisories (3 moderate, 5 high, 2 critical), including router/build/test dependencies. Required stack versions were retained; review upgrades before exposing a deployed demo. Build/dev servers should never be used as public production servers.
