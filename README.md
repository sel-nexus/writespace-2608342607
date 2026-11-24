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
Change run: 380 unit/component tests passed (baseline 331). All 62 distinct desktop/mobile browser cases passed across a full run (60 passed, two equivalent CSS-serialization expectation errors) and corrected targeted rerun (2 passed). Independent critic final PASS, score 1.00, no high failures. Production build passed. Representative light/dark screenshots, accessibility, styles and HTML were captured and inspected. Docker image execution was not claimed.

## Appearance
Use the moon button in either navbar to switch light/dark appearance. The pressed state indicates dark mode. A valid `writespace_theme` choice persists across reload, navigation and logout; otherwise startup uses the OS preference or light fallback. Storage-denied browsers can still switch in the current page. Login/register inherit the mode and keep their existing header-free layout; their home logo returns to the public toggle. No account/post data is changed.

This theme-only change preserves the shipped orange/slate design. Its hero/auth/dashboard treatments differ from the PRD gradient descriptions; they are retained baseline exceptions, not a claim of full visual fidelity. See CHANGELOG.md.

## Dependency warning
Pinned dependency audit reported 10 advisories (3 moderate, 5 high, 2 critical), including router/build/test dependencies. Required stack versions were retained; review upgrades before exposing a deployed demo. Build/dev servers should never be used as public production servers.
