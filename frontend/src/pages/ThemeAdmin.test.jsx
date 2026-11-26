/** Verify admin appearance and account journeys through the real application and storage. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { authenticate } from '../utils/auth';
import { createAccount } from '../utils/accounts';
import { createPost } from '../utils/posts';
import { getPosts, getUsers, savePosts } from '../utils/storage';

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

/** Open the real route tree with a saved appearance and active demo administrator. */
function openApp(theme, path = '/admin') {
  localStorage.setItem('writespace_theme', theme);
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

/** Check the shared toggle, root hint and independent preference key. */
function expectTheme(theme) {
  expect(screen.getByRole('button', { name: 'Dark mode' }))
    .toHaveAttribute('aria-pressed', String(theme === 'dark'));
  expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
  expect(document.documentElement.style.colorScheme).toBe(theme);
  expect(localStorage.getItem('writespace_theme')).toBe(theme);
}

/** Fill the native account controls using realistic keyboard and select interactions. */
async function fill(user, username, role = 'user') {
  for (const [label, value] of [['Display Name', 'Demo Writer'], ['Username', username], ['Password', 'demo-only']]) {
    await user.clear(screen.getByLabelText(label));
    await user.type(screen.getByLabelText(label), value);
  }
  await user.selectOptions(screen.getByLabelText('Role'), role);
}

/** Assert exact totals instead of ambiguous substring counts. */
function expectStats(posts, accounts, admins, users) {
  for (const [label, value] of [['Total Posts', posts], ['Total Users', accounts], ['Total Admins', admins], ['Total users', users]]) {
    const card = screen.getByRole('region', { name: label, exact: true });
    expect(card).toHaveClass('bg-white', 'dark:bg-slate-900');
    expect(within(card).getByText(String(value), { exact: true })).toHaveClass('dark:text-slate-100');
    expect(card.querySelector('h2')).toHaveClass('dark:text-slate-300');
  }
}

for (const theme of ['light', 'dark']) {
  describe(`administration in ${theme}`, () => {
    it('preserves validation and unsaved fields while creating both roles and updating stats', async () => {
      authenticate('admin', 'admin');
      const user = openApp(theme);
      expectTheme(theme);
      expect(screen.getByRole('main')).toHaveClass('bg-slate-50', 'dark:bg-slate-950');
      expect(screen.getByRole('heading', { name: 'Admin Dashboard' }).parentElement)
        .toHaveClass('from-orange-900', 'to-orange-800', 'dark:from-orange-950');
      expectStats(0, 1, 1, 0);
      expect(screen.getByText('No posts yet. Make room for the first thought.'))
        .toHaveClass('bg-white', 'dark:bg-slate-900', 'dark:text-slate-400');
      await user.click(screen.getByRole('link', { name: 'Manage Users' }));
      const submit = screen.getByRole('button', { name: 'Create User' });
      expect(submit.closest('form')).toHaveClass('bg-white', 'dark:bg-slate-900');
      expect(submit).toHaveClass('bg-orange-800', 'dark:focus-visible:ring-offset-slate-900');
      await user.click(submit);
      for (const label of ['Display Name', 'Username', 'Password']) {
        expect(screen.getByLabelText(label)).toHaveAccessibleDescription('This field is required.');
        expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(label)).toHaveClass('dark:bg-slate-900', 'dark:text-slate-100');
      }
      await fill(user, 'editor', 'admin');
      const controls = ['Display Name', 'Username', 'Password', 'Role'].map((label) => screen.getByLabelText(label));
      const errors = screen.getAllByRole('alert');
      const session = localStorage.getItem('writespace_session');
      const posts = localStorage.getItem('writespace_posts');
      const accounts = localStorage.getItem('writespace_users');
      await user.click(screen.getByRole('button', { name: 'Dark mode' }));
      expectTheme(theme === 'dark' ? 'light' : 'dark');
      controls.forEach((control, index) => {
        expect(screen.getByLabelText(['Display Name', 'Username', 'Password', 'Role'][index])).toBe(control);
      });
      expect(controls.map((control) => control.value)).toEqual(['Demo Writer', 'editor', 'demo-only', 'admin']);
      expect(screen.getAllByRole('alert')).toEqual(errors);
      for (const error of errors) expect(error).toHaveClass('dark:text-red-300');
      expect(localStorage.getItem('writespace_session')).toBe(session);
      expect(localStorage.getItem('writespace_posts')).toBe(posts);
      expect(localStorage.getItem('writespace_users')).toBe(accounts);
      await user.click(screen.getByRole('button', { name: 'Dark mode' }));
      await user.click(submit);
      expect(screen.getByRole('status')).toHaveTextContent('Account editor created.');
      expect(screen.getByRole('status')).toHaveClass('dark:text-teal-300');
      await fill(user, 'reader');
      await user.click(submit);
      expect(getUsers().map((account) => [account.username, account.role])).toEqual([['editor', 'admin'], ['reader', 'user']]);
      for (const account of getUsers()) {
        expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(new Date(account.createdAt).toISOString()).toBe(account.createdAt);
      }
      expect(screen.getByLabelText('Password')).toHaveValue('');
      expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'sm:block', 'dark:bg-slate-900');
      expect(screen.getByRole('table').querySelector('thead')).toHaveClass('dark:bg-slate-800', 'dark:text-slate-300');
      for (const username of ['editor', 'reader']) {
        const card = screen.getByRole('article', { name: `Account ${username}` });
        expect(card).toHaveClass('bg-white', 'dark:bg-slate-900');
        expect(card.parentElement).toHaveClass('sm:hidden');
        expect(within(card).getByText(username === 'editor' ? 'Admin' : 'user', { exact: true }))
          .toHaveClass(username === 'editor' ? 'dark:text-violet-200' : 'dark:text-indigo-200');
      }
      await fill(user, ' ADMIN ');
      await user.click(submit);
      expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('The username admin is reserved.');
      await fill(user, ' READER ');
      await user.click(submit);
      expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('That username is already taken.');
      expect(getUsers()).toHaveLength(2);
      await user.click(screen.getByRole('link', { name: 'Back to Dashboard' }));
      expectStats(0, 3, 2, 1);
      expectTheme(theme);
    });

    it('protects built-in/current accounts in both layouts and keeps posts on native confirm/cancel deletion', async () => {
      authenticate('admin', 'admin');
      const editor = createAccount({ displayName: 'Editor', username: 'editor', password: 'demo', role: 'admin' });
      const reader = createAccount({ displayName: 'Reader', username: 'reader', password: 'demo', role: 'user' });
      authenticate('reader', 'demo');
      const post = createPost({ title: 'Retained writing', content: 'Keep the author and words.' });
      authenticate('editor', 'demo');
      const user = openApp(theme, '/users');
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      for (const scope of [within(screen.getByRole('table')), within(screen.getByRole('article', { name: 'Account admin' }))]) {
        const button = scope.getByRole('button', { name: 'Delete admin' });
        expect(button).toBeDisabled();
        expect(button).toHaveAccessibleDescription('Default admin cannot be deleted.');
        expect(button).toHaveAttribute('title', 'Default admin cannot be deleted.');
        expect(button).toHaveClass('dark:disabled:text-slate-400');
        await user.click(button);
      }
      for (const scope of [within(screen.getByRole('table')), within(screen.getByRole('article', { name: 'Account editor' }))]) {
        const button = scope.getByRole('button', { name: 'Delete editor' });
        expect(button).toBeDisabled();
        expect(button).toHaveAccessibleDescription('Your current account cannot be deleted.');
        await user.click(button);
      }
      expect(confirm).not.toHaveBeenCalled();
      const button = within(screen.getByRole('table')).getByRole('button', { name: 'Delete reader' });
      expect(button).toHaveClass('dark:bg-red-950', 'dark:text-red-300');
      await user.click(button);
      expect(confirm).toHaveBeenCalledWith('Delete account reader? Their posts will be retained.');
      expect(getUsers()).toEqual([editor, reader]);
      confirm.mockReturnValue(true);
      await user.click(within(screen.getByRole('article', { name: 'Account reader' })).getByRole('button', { name: 'Delete reader' }));
      expect(getUsers()).toEqual([editor]);
      expect(getPosts()).toEqual([post]);
      expect(screen.queryByRole('article', { name: 'Account reader' })).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Account reader deleted. Posts retained.');
      await user.click(screen.getByRole('link', { name: 'Back to Dashboard' }));
      expectStats(1, 2, 2, 0);
      expect(screen.getByRole('article')).toHaveTextContent('Reader');
      expectTheme(theme);
    });

    it('shows precisely five newest posts, retains native post cancellation and updates totals on deletion', async () => {
      authenticate('admin', 'admin');
      const posts = Array.from({ length: 6 }, (_, index) => ({
        ...createPost({ title: `Note ${index}`, content: 'Editorial words' }), createdAt: `2026-03-0${index + 1}T12:00:00.000Z`,
      }));
      savePosts(posts);
      const user = openApp(theme);
      expectStats(6, 1, 1, 0);
      expect(screen.getAllByRole('article').map((article) => article.querySelector('h3').textContent))
        .toEqual(['Note 5', 'Note 4', 'Note 3', 'Note 2', 'Note 1']);
      const article = screen.getAllByRole('article')[0];
      expect(article).toHaveClass('dark:bg-slate-900', 'dark:border-slate-700');
      expect(within(article).getByRole('link', { name: 'Note 5' })).toHaveClass('text-slate-900', 'dark:text-slate-100');
      expect(within(article).getByRole('link', { name: 'Edit Note 5' })).toHaveClass('text-orange-800', 'dark:text-orange-300');
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      await user.click(screen.getByRole('button', { name: 'Delete Note 5' }));
      expect(getPosts()).toEqual(posts);
      confirm.mockReturnValue(true);
      await user.click(screen.getByRole('button', { name: 'Delete Note 5' }));
      expect(confirm).toHaveBeenCalledWith('Delete "Note 5"? This cannot be undone.');
      expect(getPosts()).toEqual(posts.slice(0, 5));
      expectStats(5, 1, 1, 0);
      expect(screen.queryByRole('link', { name: 'Note 5' })).toBeNull();
    });

    it.each(['account', 'post'])('keeps readable %s write-failure errors and persisted data', async (kind) => {
      authenticate('admin', 'admin');
      const post = createPost({ title: 'Keep', content: 'Words' });
      const user = openApp(theme, kind === 'account' ? '/users' : '/admin');
      if (kind === 'account') await fill(user, 'reader');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await user.click(screen.getByRole('button', { name: kind === 'account' ? 'Create User' : 'Delete Keep' }));
      expect(screen.getByRole('alert')).toHaveTextContent(kind === 'account' ? 'Unable to save accounts' : 'Unable to save posts');
      expect(screen.getByRole('alert')).toHaveClass('bg-red-50', 'dark:bg-red-950', 'dark:text-red-300');
      expect(getPosts()).toEqual([post]);
      expect(getUsers()).toEqual([]);
      if (kind === 'account') expect(screen.getByLabelText('Username')).toHaveValue('reader');
    });
  });
}
