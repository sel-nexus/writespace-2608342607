# WriteSpace change run

## Added
- Persistent light/dark preference using the separate `writespace_theme` key, guarded reads/writes, light fallback, pre-paint root class/color-scheme restoration and App-owned state without Context or a theme library.
- Accessible named pressed-state theme button in public/authenticated headers, including auth pages and desktop/mobile navigation.
- Compatible dark appearances for public discovery, login/register, reading/writing/editing, administrator dashboard and user management, including errors, empty/not-found states, forms, metadata, badges and menus.
- Theme helper/App/control tests and four browser feature specs; expanded independent validation/corrupt-account tests.

## Modified
App, index.html and Tailwind class-mode configuration; both headers; Avatar/BlogCard/StatCard/UserRow; all eight existing pages. Browser auth-link locators are scoped to the intended card after the additional auth header. Mobile public journeys open the collapsed menu before asserting its avatar. Source JSX formatting improved. Read-view destructive text changed one shade for contrast.

## Preserved / migration
No route, copy, permission, CRUD, record schema, dependency version, backend, database or deployment configuration change. Existing shipped orange/neutral light appearance wins over stale PRD palette wording, as directed by the harness. Theme switching does not remount forms or modify identity/content. No migration; removing the theme key resets default appearance to light. Native confirmations remain native. This remains a plaintext, client-only browser-local demo—not secure authentication.

## Verification and limits
Baseline 331 tests passed; final unit suite 472 passed. Browser run 90/94 passed initially, then all eight public cases passed after correcting mobile menu test ordering, and all36 post cases passed after the contrast shade fix. Production build passed. Independent critic PASS1.00/high0. Both-theme desktop/mobile evidence captured and representative images inspected. Contrast sampled rendered text with composited solid backgrounds; gradients/emoji require manual interpretation and exhaustive interaction-state certification remains unverified. Emoji font install failed (missing apt package, then apt update timeout). Inherited dependency audit remains 10 advisories (3 moderate,5 high,2 critical); upgrades outside this change.
