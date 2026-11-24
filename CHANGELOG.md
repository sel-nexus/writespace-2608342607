# WriteSpace change run

## Added
- Accessible Dark mode button in public and authenticated navbars, including collapsed mobile navigation. Its pressed state indicates dark appearance; native keyboard activation is supported.
- Browser preference `writespace_theme` stores `light` or `dark`. Startup uses a valid saved choice, otherwise the OS preference, otherwise light. Denied storage does not prevent switching in the current page; preference is independent of accounts, posts and sessions.
- Class-based Tailwind dark styling across landing, authentication, post listing/reading/writing/editing, dashboard and account-management states, including fields, validation, metadata and destructive actions.
- 49 new unit/component cases and 8 desktop/mobile browser cases for appearance and preserved writing/admin journeys.

## Modified files
- New `frontend/src/utils/theme.js` and tests; new `frontend/src/components/ThemeToggle.jsx` and tests.
- `frontend/src/main.jsx` initializes appearance before mounting React; `frontend/tailwind.config.js` enables class dark mode; `frontend/src/App.jsx` themes the shell.
- `frontend/src/components/{Navbar,PublicNavbar,BlogCard,StatCard,UserRow}.jsx` and all eight existing page components receive additive dark treatment. Navbar JSX is reformatted without behavior changes.
- New `ThemeSurfaces.test.jsx`, `AdminTheme.test.jsx`, `e2e/theme.spec.js`, `e2e/theme-surfaces.spec.js`, `e2e/admin-theme.spec.js`.
- `frontend/visual-preflight.js` captures deterministic light/dark evidence and waits for transitions to settle; README and final code graph updated.

## Compatibility and migration
No breaking API, storage-record or routing changes; no migration required. To reset appearance only, remove `writespace_theme` from this browser origin. Auth screens inherit the chosen mode but retain their existing header-free layout; return home to change appearance before signing in.

## Verification and retained limitations
Baseline 331 tests passed; final 380 unit/component tests passed. Browser suite initially passed 60/62; two exact CSS serialization expectations were corrected from hex to equivalent RGB, then both affected cases passed. All 62 distinct desktop/mobile cases therefore passed across the full and targeted runs. Vite production build passed. Independent critic final PASS 1.00, zero high failures.

The existing orange/slate visual language is deliberately preserved for this theme-only delta. It differs from PRD hero/auth/dashboard gradient prescriptions; this run does not claim complete baseline visual fidelity or redesign them. The existing 10 dependency advisories remain (3 moderate, 5 high, 2 critical). Browser-local plaintext credentials and client-only guards remain a demo, not production authentication. Hosting deployment and Docker image execution were not performed.
