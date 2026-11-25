# WriteSpace

A static React 18 / Vite 5 / React Router 6 / Tailwind 3 JavaScript writing demo. Public discovery, local registration/login, owned post CRUD, and administrator account/content management.

## Important limits
This is NOT secure authentication or a shared publishing service. Passwords are plaintext in localStorage; admin/admin is public and permanent. Client-side guards can be bypassed by editing browser data. Never use real passwords or sensitive information. Accounts, posts and sessions belong to this browser and origin; clearing storage loses them. Deleting an account retains posts and names; orphaned authors use book avatars. Corrupt reads degrade gracefully; unsafe writes are refused with inline feedback.

## Theme and writing counter
Use the navigation button labeled **Switch to dark mode** or **Switch to light mode** (also available on mobile). The choice applies across public, authenticated and admin pages, survives refresh/navigation/logout, and is stored separately from the session under `writespace_theme`. Missing, invalid or unavailable theme storage defaults to light; failed preference writes do not block use. The inherited light layout and orange brand remain intact.

Create/edit post forms show an informational live character count below Content. It starts at zero for a new post, includes prefilled edit content, and updates when typing or deleting. It uses JavaScript string length (UTF-16 code units), not words or a maximum length. Save validation, ownership, cancel behavior, and post/account CRUD are unchanged.

No stored account, post or session schema changes, migrations or breaking changes are introduced. `writespace_theme` is the only new storage key. The local plaintext demo security limitations above remain unchanged.

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

## Verification status
The inherited baseline was 331 passing unit/component tests. Current slice checks: theme/navigation 57 passed, identity 30 passed, posts 58 passed, and admin 46 passed (34 admin page tests plus 6 StatCard and 6 UserRow tests). Admin command from `frontend`: `node node_modules/vitest/vitest.mjs run src/pages/AdminPages.test.jsx src/components/StatCard.test.jsx src/components/UserRow.test.jsx`.

Browser specs have been extended for light/dark UI journeys and the live counter while retaining existing regression assertions. Final full-suite regression, independent critic, production build, visual preflight and browser execution for this change are pending the parent delivery stage. No final browser or visual verification is claimed here; inherited browser/build results do not verify these changes.

## Dependency warning
The inherited `npm ci --no-bin-links` audit reported 10 advisories (3 moderate, 5 high, 2 critical), including router/build/test dependencies. No dependencies were upgraded in this run; required stack versions were retained. Review upgrades separately before exposing a deployed demo. Build/dev servers should never be used as public production servers.
