/** Exercise admin pages through the real App, auth, account and post storage interfaces. */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import App from '../App';
import { authenticate, clearSession, register } from '../utils/auth';
import { createAccount } from '../utils/accounts';
import { createPost } from '../utils/posts';
import { getPosts, getUsers, savePosts, saveUsers } from '../utils/storage';

/** Render actual application routes with a fresh interaction driver. */
function setup(path = '/admin') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}
/** Fill demo account fields using native controlled input events. */
function fill(username = 'reader', role = 'user') {
  for (const [label, value] of [['Display Name', 'Reader'], ['Username', username], ['Password', 'demo']]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: role } });
}
/** Query desktop buttons despite jsdom not evaluating responsive CSS. */
function accountDelete(username) {
  return within(screen.getByRole('table')).getByRole('button', { name: `Delete ${username}` });
}
/** Create an eligible stored account under the built-in administrator. */
function seed(role = 'user', username = 'reader') {
  return createAccount({ displayName: 'Reader', username, password: 'demo', role });
}

it.each(['/admin', '/users'])('redirects guests from %s', (path) => {
  setup(path);
  expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
});
it.each(['/admin', '/users'])('redirects regular users from %s and hides admin UI', (path) => {
  register({ displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' });
  setup(path);
  expect(screen.getByRole('heading', { name: 'All Blogs' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Admin Dashboard' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Users' })).toBeNull();
});
it('shows accurate empty stats including built-in and working write shortcut', async () => {
  authenticate('admin', 'admin');
  const user = setup();
  for (const [label, value] of [['Total Posts', 0], ['Total Users', 1], ['Total Admins', 1], ['Total users', 0]]) {
    expect(screen.getByRole('region', { name: label, exact: true }).querySelector('p').textContent).toBe(String(value));
  }
  expect(screen.getByText('Regular users only, excluding admins')).toBeInTheDocument();
  expect(screen.getByText('No posts yet. Make room for the first thought.')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Write New Post' }));
  expect(screen.getByRole('heading', { name: 'Write a Post' })).toBeInTheDocument();
});
it('shows populated totals and precisely the five newest posts', () => {
  authenticate('admin', 'admin');
  seed('admin', 'editor');
  seed();
  const posts = Array.from({ length: 7 }, (_, index) => ({
    ...createPost({ title: `Post ${index}`, content: 'Words' }), createdAt: `2026-03-0${index + 1}T12:00:00.000Z`,
  }));
  savePosts(posts.reverse());
  setup();
  expect(screen.getAllByRole('article').map((article) => article.querySelector('h3').textContent))
    .toEqual(['Post 6', 'Post 5', 'Post 4', 'Post 3', 'Post 2']);
  for (const [label, value] of [['Total Posts', 7], ['Total Users', 3], ['Total Admins', 2], ['Total users', 1]]) {
    expect(screen.getByRole('region', { name: label, exact: true }).querySelector('p').textContent).toBe(String(value));
  }
});
it.each(['admin', 'user'])('creates %s via dashboard quick action and preserves previous routes', async (role) => {
  authenticate('admin', 'admin');
  const user = setup();
  await user.click(screen.getByRole('link', { name: 'Manage Users' }));
  expect(screen.getByRole('option', { name: 'Admin' })).toHaveValue('admin');
  expect(screen.getByRole('option', { name: 'user' })).toHaveValue('user');
  fill('reader', role);
  await user.click(screen.getByRole('button', { name: 'Create User', exact: true }));
  expect(getUsers()[0]).toMatchObject({ username: 'reader', role });
  expect(screen.getByRole('status')).toHaveTextContent('Account reader created.');
  expect(screen.getByLabelText('Password')).toHaveValue('');
  expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'sm:block');
  expect(screen.getByRole('article', { name: 'Account reader' }).parentElement).toHaveClass('sm:hidden');
  await user.click(screen.getByRole('link', { name: 'Back to Dashboard' }));
  expect(screen.getByRole('region', { name: 'Total Users', exact: true })).toHaveTextContent('2');
});
it('associates required and reserved errors and rejects case-insensitive duplicate', async () => {
  authenticate('admin', 'admin');
  seed();
  const user = setup('/users');
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  for (const label of ['Display Name', 'Username', 'Password']) {
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription('This field is required.');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
  }
  fill(' ADMIN ');
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('The username admin is reserved.');
  fill(' READER ');
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('That username is already taken.');
  expect(getUsers()).toHaveLength(1);
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
it.each([false, true])('handles account confirmation=%s and retains author writing with book avatar', async (confirm) => {
  authenticate('admin', 'admin');
  seed('admin', 'editor');
  authenticate('editor', 'demo');
  const post = createPost({ title: 'Retained author', content: 'Keep' });
  authenticate('admin', 'admin');
  const user = setup('/users');
  vi.spyOn(window, 'confirm').mockReturnValue(confirm);
  await user.click(accountDelete('editor'));
  expect(getUsers()).toHaveLength(confirm ? 0 : 1);
  expect(getPosts()).toEqual([post]);
  await user.click(screen.getByRole('link', { name: 'Back to Dashboard' }));
  expect(within(screen.getByRole('article')).getByRole('img', { name: confirm ? 'user avatar' : 'admin avatar' })).toBeInTheDocument();
});
it('disables built-in and current admin with clear explanations', () => {
  authenticate('admin', 'admin');
  seed('admin', 'editor');
  authenticate('editor', 'demo');
  setup('/users');
  expect(accountDelete('admin')).toBeDisabled();
  expect(accountDelete('admin')).toHaveAttribute('title', 'Default admin cannot be deleted.');
  expect(accountDelete('editor')).toBeDisabled();
  expect(accountDelete('editor')).toHaveAccessibleDescription('Your current account cannot be deleted.');
  expect(within(screen.getByRole('table')).getByText('Built-in')).toBeInTheDocument();
});
it.each(['logout', 'user', 'current', 'removed'])('rechecks account identity/target %s during confirmation', async (change) => {
  authenticate('admin', 'admin');
  const target = seed('admin', 'editor');
  seed();
  const user = setup('/users');
  vi.spyOn(window, 'confirm').mockImplementation(() => {
    if (change === 'logout') clearSession();
    if (change === 'user') authenticate('reader', 'demo');
    if (change === 'current') authenticate('editor', 'demo');
    if (change === 'removed') saveUsers(getUsers().filter((account) => account.id !== target.id));
    return true;
  });
  await user.click(accountDelete('editor'));
  expect(screen.getByRole('alert')).toHaveTextContent(change === 'current' ? 'current account' : change === 'removed' ? 'not found' : 'Administrator');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(getUsers().some((account) => account.id === target.id)).toBe(change !== 'removed');
});
it.each(['create', 'delete'])('reports account %s write failure without success', async (action) => {
  authenticate('admin', 'admin');
  const saved = seed();
  const user = setup('/users');
  fill('other');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(action === 'create' ? screen.getByRole('button', { name: 'Create User' }) : accountDelete('reader'));
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save accounts');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(getUsers()).toEqual([saved]);
  expect(screen.getByLabelText('Username')).toHaveValue('other');
});
it.each(['create', 'delete'])('refuses corruption appearing after %s page load', async (action) => {
  authenticate('admin', 'admin');
  seed();
  const user = setup('/users');
  fill('other');
  localStorage.setItem('writespace_users', '[null]');
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(action === 'create' ? screen.getByRole('button', { name: 'Create User' }) : accountDelete('reader'));
  expect(screen.getByRole('alert')).toHaveTextContent('Existing data was not changed');
  expect(localStorage.getItem('writespace_users')).toBe('[null]');
});
it('rereads admin at valid account submit after logout', async () => {
  authenticate('admin', 'admin');
  const user = setup('/users');
  fill();
  clearSession();
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Administrator');
  expect(getUsers()).toEqual([]);
});
it.each([false, true])('confirms recent post deletion=%s and updates count', async (confirm) => {
  authenticate('admin', 'admin');
  const post = createPost({ title: 'Recent', content: 'Words' });
  const user = setup();
  vi.spyOn(window, 'confirm').mockReturnValue(confirm);
  await user.click(screen.getByRole('button', { name: 'Delete Recent' }));
  expect(getPosts()).toEqual(confirm ? [] : [post]);
  expect(screen.getByRole('region', { name: 'Total Posts' }).querySelector('p').textContent).toBe(confirm ? '0' : '1');
});
it.each(['logout', 'user', 'write failure', 'corrupt', 'removed'])('retains dashboard with inline %s delete failure', async (change) => {
  authenticate('admin', 'admin');
  seed();
  authenticate('reader', 'demo');
  const post = createPost({ title: 'Recent', content: 'Words' });
  authenticate('admin', 'admin');
  const user = setup();
  vi.spyOn(window, 'confirm').mockImplementation(() => {
    if (change === 'logout') clearSession();
    if (change === 'user') authenticate('reader', 'demo');
    if (change === 'write failure') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    if (change === 'corrupt') localStorage.setItem('writespace_posts', JSON.stringify([post, null]));
    if (change === 'removed') savePosts([]);
    return true;
  });
  await user.click(screen.getByRole('button', { name: 'Delete Recent' }));
  expect(screen.getByRole('alert')).toHaveTextContent(change === 'removed' ? 'Post not found' : change === 'corrupt' ? 'not changed' : 'not saved');
  expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
  if (change !== 'removed') expect(getPosts()).toEqual([post]);
});
it('edits other authors via recent link and returns to accurate dashboard', async () => {
  register({ displayName: 'Author', username: 'author', password: 'demo', confirmPassword: 'demo' });
  const post = createPost({ title: 'Other writing', content: 'Original' });
  authenticate('admin', 'admin');
  const user = setup();
  await user.click(screen.getByRole('link', { name: 'Edit Other writing' }));
  expect(screen.getByLabelText('Title')).toHaveValue('Other writing');
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Revised' } });
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(getPosts()).toEqual([{ ...post, title: 'Revised' }]);
  await user.click(screen.getByRole('button', { name: 'Account options for Admin' }));
  await user.click(screen.getByRole('link', { name: 'Go to Dashboard' }));
  expect(screen.getByRole('link', { name: 'Revised', exact: true })).toBeInTheDocument();
});
it('shows built-in inventory and graceful empty posts for corrupt initial reads', () => {
  authenticate('admin', 'admin');
  localStorage.setItem('writespace_users', 'broken');
  localStorage.setItem('writespace_posts', 'broken');
  setup('/users');
  expect(accountDelete('admin')).toBeDisabled();
  expect(localStorage.getItem('writespace_users')).toBe('broken');
});


it.each(['light', 'dark'])('keeps admin CRUD and paired surfaces usable in %s via theme control', async (theme) => {
  authenticate('admin', 'admin');
  const post = createPost({ title: 'Themed writing', content: 'Keep this writing' });
  const user = setup();
  if (theme === 'dark') await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));
  expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
  expect(screen.getByRole('main')).toHaveClass('bg-slate-50', 'dark:bg-slate-950', 'dark:text-slate-100');
  const stat = screen.getByRole('region', { name: 'Total Posts' });
  expect(stat).toHaveTextContent('1');
  expect(stat).toHaveClass('bg-white', 'dark:bg-slate-900');
  expect(stat.querySelector('p')).toHaveClass('dark:text-slate-100');
  expect(screen.getByRole('article')).toHaveClass('dark:bg-slate-900', 'dark:border-slate-700');
  const removePost = screen.getByRole('button', { name: 'Delete Themed writing' });
  expect(removePost).toHaveClass('dark:bg-red-950', 'dark:text-red-300', 'dark:focus-visible:ring-orange-400');
  await user.click(screen.getByRole('link', { name: 'Manage Users' }));
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('This field is required.');
  expect(screen.getAllByRole('alert')[0]).toHaveClass('dark:text-red-300');
  for (const label of ['Display Name', 'Username', 'Password', 'Role']) {
    expect(screen.getByLabelText(label)).toHaveClass('dark:bg-slate-800', 'dark:text-slate-100', 'dark:focus:ring-orange-400');
  }
  await user.type(screen.getByLabelText('Display Name'), 'Reader');
  await user.type(screen.getByLabelText('Username'), 'reader');
  await user.type(screen.getByLabelText('Password'), 'demo');
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  expect(screen.getByRole('status')).toHaveTextContent('Account reader created.');
  expect(screen.getByRole('status')).toHaveClass('dark:text-teal-300');
  const table = screen.getByRole('table');
  expect(table.parentElement).toHaveClass('dark:bg-slate-900', 'sm:block');
  expect(table.querySelector('thead').tagName).toBe('THEAD');
  const mobile = screen.getByRole('article', { name: 'Account reader' });
  expect(mobile).toHaveClass('dark:bg-slate-900', 'dark:text-slate-100');
  expect(within(mobile).getByText('user', { exact: true })).toHaveClass('dark:bg-indigo-950', 'dark:text-indigo-200');
  expect(accountDelete('admin')).toBeDisabled();
  expect(accountDelete('admin')).toHaveAccessibleDescription('Default admin cannot be deleted.');
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  await user.click(accountDelete('reader'));
  expect(getUsers()).toHaveLength(1);
  vi.mocked(window.confirm).mockReturnValue(true);
  await user.click(accountDelete('reader'));
  expect(getUsers()).toEqual([]);
  expect(getPosts()).toEqual([post]);
  await user.click(screen.getByRole('link', { name: 'Back to Dashboard' }));
  await user.click(screen.getByRole('button', { name: 'Delete Themed writing' }));
  expect(getPosts()).toEqual([]);
  expect(screen.getByText('No posts yet. Make room for the first thought.')).toHaveClass('dark:bg-slate-900', 'dark:text-slate-300');
  expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
});

it.each(['light', 'dark'])('retains protected current account and inline write errors in %s', async (theme) => {
  authenticate('admin', 'admin');
  const current = seed('admin', 'editor');
  authenticate('editor', 'demo');
  const user = setup('/users');
  if (theme === 'dark') await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));
  expect(accountDelete('editor')).toBeDisabled();
  expect(accountDelete('editor')).toHaveAccessibleDescription('Your current account cannot be deleted.');
  const mobile = screen.getByRole('article', { name: 'Account editor' });
  expect(within(mobile).getByRole('button')).toBeDisabled();
  expect(within(mobile).getByText('Admin', { exact: true })).toHaveClass('dark:bg-violet-950', 'dark:text-violet-200');
  fill('new-reader');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  await user.click(screen.getByRole('button', { name: 'Create User' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save accounts');
  expect(screen.getByRole('alert')).toHaveClass('dark:bg-red-950', 'dark:text-red-300');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(getUsers()).toEqual([current]);
  expect(screen.getByLabelText('Username')).toHaveValue('new-reader');
});
