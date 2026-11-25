# Changelog

## Unreleased — persistent theme and live writing counter

### Added and changed
- Shared root-owned light/dark preference with accessible public/authenticated/mobile navigation controls and safe best-effort persistence under `writespace_theme`.
- Paired dark surfaces for discovery, login/registration, blog lists/cards/readers/writer forms, and admin statistics/account forms/tables/mobile rows. Preserve the inherited light layout, orange editorial brand and role avatars.
- Informational live Content character counter for create/edit, including prefilled content and deletion. Uses JavaScript string length; adds no maximum or save restriction.
- Extended unit and fixture-backed browser journeys for themed navigation, identity, posts/counter and admin CRUD. Existing assertions and account protections are retained.

### Files in this run
All application paths are in the existing root `frontend/`, not uploads.

- Theme/navigation/public: `frontend/src/utils/theme.js`, `frontend/src/utils/theme.test.js`, `frontend/src/components/ThemeToggle.jsx`, `frontend/src/components/ThemeToggle.test.jsx`, `frontend/src/App.jsx`, `frontend/src/App.test.jsx`, `frontend/src/components/PublicNavbar.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/pages/LandingPage.jsx`, `frontend/tailwind.config.js`, `frontend/e2e/theme.spec.js`.
- Auth: `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/RegisterPage.jsx`, `frontend/src/pages/AuthPages.test.jsx`, `frontend/e2e/identity.spec.js`.
- Posts: `frontend/src/pages/Home.jsx`, `frontend/src/pages/ReadBlog.jsx`, `frontend/src/pages/WriteBlog.jsx`, `frontend/src/components/BlogCard.jsx`, `frontend/src/pages/PostsPages.test.jsx`, `frontend/e2e/posts.spec.js`.
- Admin: `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/pages/UserManagement.jsx`, `frontend/src/components/StatCard.jsx`, `frontend/src/components/UserRow.jsx`, `frontend/src/pages/AdminPages.test.jsx`, `frontend/e2e/admin.spec.js`.
- Documentation: `README.md`, `CHANGELOG.md`.

### Compatibility and security
No account/post/session schema changes, migrations or breaking changes. The only new localStorage key is `writespace_theme`. No service, CRUD validation, ownership/guard, default-admin or current-account deletion rules are changed. Account deletion still retains writing and author names. No Context, TypeScript, state framework, custom CSS or deployment changes are introduced.

This remains a browser-local demo, not secure authentication: passwords are plaintext localStorage data, the permanent `admin/admin` account is public, and client-side guards can be bypassed. Never use real passwords or sensitive data. No dependencies were upgraded. The inherited npm ci audit has 10 advisories: 3 moderate, 5 high and 2 critical; dependency remediation is outside this change.

### Verification status
Inherited unit baseline: 331 passed. Per-slice checks reported theme/navigation 57 passed, identity 30 passed and posts 58 passed. Admin targeted Vitest check passed 46 tests across three files (34 AdminPages, 6 StatCard, 6 UserRow).

Final full runtime regression, independent critic, production build, visual preflight and browser execution are pending the parent delivery stage. Browser journeys were extended but not executed by the admin worker. No final browser/visual verification is claimed; inherited verification does not certify this change.
