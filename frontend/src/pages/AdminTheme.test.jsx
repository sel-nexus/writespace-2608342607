/** Verify dark admin routes through real App, local identity and persisted writing. */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../App';
import { authenticate, getSession } from '../utils/auth';
import { createAccount } from '../utils/accounts';
import { createPost } from '../utils/posts';
import { getPosts, getUsers } from '../utils/storage';

/** Mount the real route tree with a saved dark preference. */
function setup(path = '/admin') {
  localStorage.setItem('writespace_theme', 'dark');
  document.documentElement.classList.add('dark');
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

/** Restore appearance after each browser-local test. */
afterEach(() => document.documentElement.classList.remove('dark'));

/** Fill controlled account fields without mocking account persistence. */
function fill(username = 'reader', role = 'user') {
  for (const [label, value] of [['Display Name', 'Reader'], ['Username', username], ['Password', 'demo']]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: role } });
}

it('themes empty statistics, brand shortcuts and recent empty state without changing saved data', () => {
  authenticate('admin', 'admin');
  const session = getSession();
  setup();
  expect(screen.getByRole('main')).toHaveClass('bg-slate-50', 'dark:bg-slate-950');
  for (const [label, value, accent] of [
    ['Total Posts', 0, 'indigo'], ['Total Users', 1, 'violet'],
    ['Total Admins', 1, 'pink'], ['Total users', 0, 'teal'],
  ]) {
    const stat = screen.getByRole('region', { name: label, exact: true });
    expect(stat).toHaveClass('bg-white', 'dark:bg-slate-900', `dark:border-t-${accent}-400`);
    expect(stat.querySelector('p')).toHaveTextContent(String(value));
    expect(stat.querySelector('p')).toHaveClass('dark:text-slate-100');
  }
  expect(screen.getByRole('link', { name: 'Manage Users' })).toHaveClass('dark:border-orange-700', 'dark:hover:bg-slate-800');
  expect(screen.getByRole('link', { name: 'Write New Post' })).toHaveClass('bg-orange-800', 'dark:focus-visible:ring-orange-400');
  expect(screen.getByText('No posts yet. Make room for the first thought.')).toHaveClass('dark:border-slate-600');
  expect(getUsers()).toEqual([]);
  expect(getPosts()).toEqual([]);
  expect(getSession()).toEqual(session);
});

it.each(['user', 'admin'])('validates then creates a real %s account across dark table/mobile surfaces', async (role) => {
  authenticate('admin', 'admin');
  const user = setup();
  await user.click(screen.getByRole('link', { name: 'Manage Users' }));
  expect(screen.getByLabelText('Username').closest('form')).toHaveClass('bg-white', 'dark:bg-slate-900');
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  for (const label of ['Display Name', 'Username', 'Password']) {
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription('This field is required.');
  }
  for (const alert of screen.getAllByRole('alert')) expect(alert).toHaveClass('dark:text-red-300');
  expect(getUsers()).toEqual([]);
  fill('reader', role);
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  expect(getUsers()[0]).toMatchObject({ username: 'reader', displayName: 'Reader', role });
  expect(screen.getByRole('status')).toHaveTextContent('Account reader created.');
  expect(screen.getByRole('status')).toHaveClass('dark:text-teal-300');
  for (const label of ['Display Name', 'Username', 'Password', 'Role']) {
    expect(screen.getByLabelText(label)).toHaveClass('dark:bg-slate-950', 'dark:text-slate-100', 'dark:focus:ring-orange-400');
  }
  const table = screen.getByRole('table');
  expect(table.parentElement).toHaveClass('hidden', 'sm:block', 'dark:border-slate-700', 'dark:bg-slate-900');
  expect(table.querySelector('thead')).toHaveClass('dark:bg-slate-800', 'dark:text-slate-200');
  const row = within(table).getByRole('button', { name: 'Delete reader' }).closest('tr');
  const mobile = screen.getByRole('article', { name: 'Account reader' });
  expect(row).toHaveClass('dark:border-slate-700');
  expect(mobile).toHaveClass('dark:bg-slate-900', 'dark:border-slate-700');
  expect(mobile.parentElement).toHaveClass('sm:hidden');
  for (const surface of [row, mobile]) {
    expect(within(surface).getByText(role === 'admin' ? 'Admin' : 'user', { exact: true }))
      .toHaveClass(role === 'admin' ? 'dark:text-violet-300' : 'dark:text-indigo-300');
    expect(within(surface).getByRole('button', { name: 'Delete reader' }))
      .toHaveClass('dark:text-red-300', 'dark:hover:bg-red-900', 'dark:focus-visible:ring-red-400');
  }
  await user.click(screen.getByRole('link', { name: 'Back to Dashboard' }));
  expect(screen.getByRole('region', { name: 'Total Users', exact: true })).toHaveTextContent('2');
  expect(localStorage.getItem('writespace_theme')).toBe('dark');
});

it('protects built-in and current stored admins in both dark responsive inventories', async () => {
  authenticate('admin', 'admin');
  createAccount({ displayName: 'Editor', username: 'editor', password: 'demo', role: 'admin' });
  authenticate('editor', 'demo');
  const before = localStorage.getItem('writespace_users');
  const user = setup('/users');
  const confirm = vi.spyOn(window, 'confirm');
  for (const username of ['admin', 'editor']) {
    const buttons = screen.getAllByRole('button', { name: `Delete ${username}` });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(username === 'admin'
        ? 'Default admin cannot be deleted.' : 'Your current account cannot be deleted.');
      await user.click(button);
    }
  }
  expect(confirm).not.toHaveBeenCalled();
  expect(localStorage.getItem('writespace_users')).toBe(before);
});

it.each([false, true])('preserves account confirmation=%s, retained writing and dashboard metadata in dark mode', async (accepted) => {
  authenticate('admin', 'admin');
  const account = createAccount({ displayName: 'Reader', username: 'reader', password: 'demo', role: 'user' });
  authenticate('reader', 'demo');
  const post = createPost({ title: 'Retained writing', content: 'Keep author and content' });
  authenticate('admin', 'admin');
  const user = setup('/users');
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(accepted);
  await user.click(within(screen.getByRole('table')).getByRole('button', { name: 'Delete reader' }));
  expect(confirm).toHaveBeenCalledWith('Delete account reader? Their posts will be retained.');
  expect(getUsers()).toEqual(accepted ? [] : [account]);
  expect(getPosts()).toEqual([post]);
  await user.click(screen.getByRole('link', { name: 'Back to Dashboard' }));
  const article = screen.getByRole('article');
  expect(article).toHaveClass('bg-white', 'dark:bg-slate-900', 'dark:border-slate-700');
  expect(article).toHaveTextContent('Reader');
  expect(within(article).getByRole('link', { name: post.title })).toHaveClass('dark:hover:text-orange-200');
  expect(within(article).getByRole('link', { name: `Edit ${post.title}` })).toHaveClass('dark:text-orange-300');
});

it.each([false, true])('preserves recent-post confirmation=%s and updates actual storage/counts in dark mode', async (accepted) => {
  authenticate('admin', 'admin');
  const post = createPost({ title: 'Recent note', content: 'Saved writing' });
  const user = setup();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(accepted);
  const button = screen.getByRole('button', { name: 'Delete Recent note' });
  expect(button).toHaveClass('dark:bg-red-950', 'dark:text-red-300', 'dark:focus-visible:ring-red-400');
  await user.click(button);
  expect(confirm).toHaveBeenCalledWith('Delete "Recent note"? This cannot be undone.');
  expect(getPosts()).toEqual(accepted ? [] : [post]);
  expect(screen.getByRole('region', { name: 'Total Posts' }).querySelector('p')).toHaveTextContent(accepted ? '0' : '1');
});

it.each(['/admin', '/users'])('keeps destructive persistence errors readable at %s without losing saved data', async (path) => {
  authenticate('admin', 'admin');
  const account = createAccount({ displayName: 'Reader', username: 'reader', password: 'demo', role: 'user' });
  const post = createPost({ title: 'Recent note', content: 'Saved writing' });
  const user = setup(path);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  await user.click(path === '/admin' ? screen.getByRole('button', { name: 'Delete Recent note' })
    : within(screen.getByRole('table')).getByRole('button', { name: 'Delete reader' }));
  expect(screen.getByRole('alert')).toHaveClass('dark:bg-red-950', 'dark:text-red-300');
  expect(getUsers()).toEqual([account]);
  expect(getPosts()).toEqual([post]);
});
