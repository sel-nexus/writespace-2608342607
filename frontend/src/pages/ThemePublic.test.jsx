/** Verify public appearance contracts and real App identity journeys in both themes. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { Avatar } from '../components/Avatar';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
});

/** Open the actual route tree with a saved browser-origin preference. */
function openApp(theme, path = '/') {
  localStorage.setItem('writespace_theme', theme);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** Assert the shared control and actual root agree with the saved preference. */
function expectTheme(theme) {
  expect(screen.getByRole('button', { name: 'Dark mode' }))
    .toHaveAttribute('aria-pressed', String(theme === 'dark'));
  expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
  expect(localStorage.getItem('writespace_theme')).toBe(theme);
}

/** Enter demo-only account values without bypassing form behavior. */
async function fillRegistration(user, username = 'theme-reader', confirmation = 'demo-only') {
  await user.type(screen.getByLabelText('Display Name'), 'Theme Reader');
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Password', { exact: true }), 'demo-only');
  await user.type(screen.getByLabelText('Confirm Password'), confirmation);
}

for (const theme of ['light', 'dark']) {
  describe(`public appearance in ${theme}`, () => {
    it('keeps branded hero, feature surfaces, empty state, footer and public destinations', async () => {
      const user = userEvent.setup();
      openApp(theme);
      expectTheme(theme);
      const hero = screen.getByRole('region', { name: /WriteSpace/ });
      expect(hero).toHaveClass('bg-slate-50', 'dark:bg-slate-950');
      expect(screen.getByText('Your thoughts. Your space. Beautifully simple.')).toHaveClass('text-slate-700', 'dark:text-slate-300');
      expect(screen.getByRole('link', { name: 'Get Started Free' }))
        .toHaveClass('bg-orange-800', 'text-white', 'hover:bg-orange-900', 'focus-visible:ring-orange-700');
      for (const [title, background, border] of [
        ['Write Freely', 'bg-orange-50', 'border-orange-100'],
        ['Private & Local', 'bg-slate-100', 'border-slate-200'],
        ['Instant & Fast', 'bg-amber-50', 'border-amber-100'],
      ]) {
        expect(screen.getByRole('heading', { name: title }).closest('article'))
          .toHaveClass(background, border, 'dark:bg-slate-900');
      }
      expect(screen.getByText('No posts yet — check back soon!')).toHaveClass('dark:text-slate-300');
      expect(screen.getByRole('contentinfo')).toHaveClass('dark:bg-slate-950');
      const footer = within(screen.getByRole('navigation', { name: 'Footer navigation' }));
      for (const [name, path] of [['Home', '/'], ['All Blogs', '/blogs'], ['Login', '/login'], ['Register', '/register']]) {
        expect(footer.getByRole('link', { name })).toHaveAttribute('href', path);
      }
      expect(screen.getByRole('link', { name: 'Get Started Free' })).toHaveAttribute('href', '/register');
      await user.click(screen.getByRole('link', { name: 'Start Reading' }));
      expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
      expectTheme(theme);
    });

    it('renders real newest previews and retains guest access checks without changing posts', async () => {
      const user = userEvent.setup();
      const posts = [1, 2, 3, 4].map((number) => ({
        id: `00000000-0000-4000-8000-00000000000${number}`, title: `Local story ${number}`, content: 'Local words '.repeat(20),
        authorId: 'default-admin', authorName: 'Admin', createdAt: `2026-03-0${number}T12:00:00.000Z`,
      }));
      localStorage.setItem('writespace_posts', JSON.stringify(posts));
      const saved = localStorage.getItem('writespace_posts');
      openApp(theme);
      expect(screen.getByRole('article', { name: 'Newest local post preview' }))
        .toHaveClass('bg-white', 'dark:bg-slate-900', 'border-orange-100', 'border-t-orange-800', 'dark:border-t-orange-400');
      expect(screen.queryByRole('link', { name: 'Local story 1' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: 'Local story 4' }));
      expect(screen.getByRole('button', { name: 'Login', exact: true })).toBeInTheDocument();
      expect(localStorage.getItem('writespace_posts')).toBe(saved);
      expect(localStorage.getItem('writespace_session')).toBeNull();
      expectTheme(theme);
    });

    it.each(['/login', '/register'])('themes %s fields and required errors while preserving input across switching', async (path) => {
      const user = userEvent.setup();
      openApp(theme, path);
      expect(screen.getByRole('main')).toHaveClass('bg-slate-50', 'dark:bg-slate-950');
      expect(screen.getByRole('region')).toHaveClass('bg-white', 'dark:bg-slate-900', 'dark:border-slate-700');
      expect(screen.getByRole('button', { name: path === '/login' ? 'Login' : 'Register', exact: true }))
        .toHaveClass('bg-orange-800', 'text-white', 'hover:bg-orange-900', 'focus-visible:ring-orange-700', 'dark:focus-visible:ring-orange-400');
      await user.click(screen.getByRole('button', { name: path === '/login' ? 'Login' : 'Register', exact: true }));
      const inputs = screen.getAllByLabelText(/Display Name|Username|Password/);
      for (const input of inputs) {
        expect(input).toHaveClass('dark:bg-slate-900', 'dark:text-slate-100', 'border-slate-300');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription('This field is required.');
      }
      for (const alert of screen.getAllByRole('alert')) expect(alert).toHaveClass('dark:text-red-300');
      await user.type(screen.getByLabelText('Username'), 'unsaved-reader');
      await user.click(screen.getByRole('button', { name: 'Dark mode' }));
      expectTheme(theme === 'dark' ? 'light' : 'dark');
      expect(screen.getByLabelText('Username')).toHaveValue('unsaved-reader');
      expect(screen.getAllByRole('alert')).toHaveLength(inputs.length);
      expect(localStorage.getItem('writespace_session')).toBeNull();
    });

    it('keeps invalid credentials readable, associated and non-destructive', async () => {
      const user = userEvent.setup();
      openApp(theme, '/login');
      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: 'Login', exact: true }));
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.');
      expect(screen.getByRole('alert')).toHaveClass('bg-red-50', 'dark:bg-red-950', 'dark:text-red-300');
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Invalid username or password.');
      expect(localStorage.getItem('writespace_session')).toBeNull();
      expectTheme(theme);
    });

    it.each(['mismatch', 'reserved', 'duplicate'])('retains registration %s validation without writing accounts', async (kind) => {
      const user = userEvent.setup();
      if (kind === 'duplicate') localStorage.setItem('writespace_users', JSON.stringify([{
        id: '00000000-0000-4000-8000-000000000001', displayName: 'Existing', username: 'theme-reader', password: 'demo-only',
        role: 'user', createdAt: '2026-03-01T12:00:00.000Z',
      }]));
      const saved = localStorage.getItem('writespace_users');
      openApp(theme, '/register');
      await fillRegistration(user, kind === 'reserved' ? 'admin' : 'theme-reader', kind === 'mismatch' ? 'wrong' : 'demo-only');
      await user.click(screen.getByRole('button', { name: 'Register', exact: true }));
      expect(screen.getByRole('alert')).toHaveTextContent(kind === 'mismatch' ? 'Passwords must match.' : kind === 'reserved' ? 'reserved' : 'already taken');
      expect(screen.getByRole('alert')).toHaveClass('dark:text-red-300');
      expect(localStorage.getItem('writespace_users')).toBe(saved);
      expect(localStorage.getItem('writespace_session')).toBeNull();
      expectTheme(theme);
    });

    it('preserves preference through registration, public identity, logout and stored-user login', async () => {
      const user = userEvent.setup();
      openApp(theme);
      await user.click(screen.getByRole('link', { name: 'Get Started Free' }));
      await fillRegistration(user);
      await user.click(screen.getByRole('button', { name: 'Register', exact: true }));
      await screen.findByRole('navigation', { name: 'Authenticated navigation' });
      const savedUsers = localStorage.getItem('writespace_users');
      const session = JSON.parse(localStorage.getItem('writespace_session'));
      expect(session).toEqual(expect.objectContaining({ username: 'theme-reader', role: 'user' }));
      expectTheme(theme);
      await user.click(screen.getByRole('link', { name: 'WriteSpace home' }));
      expect(screen.getByRole('img', { name: 'user avatar' })).toHaveTextContent('📚');
      expect(screen.getByRole('link', { name: 'Start Reading' })).toHaveAttribute('href', '/blogs');
      await user.click(screen.getByRole('link', { name: 'Go to Dashboard' }));
      await user.click(screen.getByRole('button', { name: /Account options/ }));
      await user.click(screen.getByRole('button', { name: 'Logout' }));
      expect(localStorage.getItem('writespace_session')).toBeNull();
      expectTheme(theme);
      await user.click(within(screen.getByRole('navigation', { name: 'Footer navigation' })).getByRole('link', { name: 'Login' }));
      await user.type(screen.getByLabelText('Username'), 'theme-reader');
      await user.type(screen.getByLabelText('Password'), 'demo-only');
      await user.click(screen.getByRole('button', { name: 'Login', exact: true }));
      expect(JSON.parse(localStorage.getItem('writespace_session'))).toEqual(session);
      expect(localStorage.getItem('writespace_users')).toBe(savedUsers);
      expectTheme(theme);
    });

    it('retains admin crown and role destination after real built-in login', async () => {
      const user = userEvent.setup();
      openApp(theme, '/login');
      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'admin');
      await user.click(screen.getByRole('button', { name: 'Login', exact: true }));
      await user.click(screen.getByRole('link', { name: 'WriteSpace home' }));
      expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/admin');
      expect(screen.getByRole('img', { name: 'admin avatar' })).toHaveClass('bg-violet-600', 'dark:ring-slate-500');
      expect(screen.getByRole('img', { name: 'admin avatar' })).toHaveTextContent('👑');
      expectTheme(theme);
    });
  });
}

it.each(['admin', 'user', 'unknown'])('keeps %s avatar identity and readable surroundings', (role) => {
  render(<Avatar role={role} />);
  const avatar = screen.getByRole('img');
  expect(avatar).toHaveClass(role === 'admin' ? 'bg-violet-600' : 'bg-indigo-500', 'text-white', 'dark:ring-slate-500');
  expect(avatar).toHaveTextContent(role === 'admin' ? '👑' : '📚');
});
