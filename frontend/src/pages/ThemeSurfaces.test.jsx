/** Verify themed real App routes without replacing browser-local identity or writing. */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../App';
import { authenticate, getSession, register } from '../utils/auth';
import { createPost } from '../utils/posts';
import { getPosts, getUsers } from '../utils/storage';

/** Mount the actual route tree with an explicit dark browser preference. */
function setup(path = '/') {
  localStorage.setItem('writespace_theme', 'dark');
  document.documentElement.classList.add('dark');
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  expect(result.container.firstChild).toHaveClass('bg-white', 'dark:bg-slate-950', 'dark:text-slate-100');
  return userEvent.setup();
}

/** Restore appearance independently of the shared storage/DOM cleanup. */
afterEach(() => document.documentElement.classList.remove('dark'));

/** Register a real local reader for protected presentation states. */
function reader(name = 'Reader') {
  return register({ displayName: name, username: name.toLowerCase(), password: 'demo', confirmPassword: 'demo' });
}

/** Fill controlled fields using literal text, including multiline writing. */
function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
}

it('themes public features and empty previews while retaining the light hero and brand classes', () => {
  setup();
  expect(screen.getByRole('heading', { name: /^WriteSpace/ })).toHaveClass('text-slate-900', 'dark:text-slate-100');
  expect(screen.getByRole('region', { name: /^WriteSpace/ })).toHaveClass('bg-slate-50', 'dark:bg-slate-950');
  expect(screen.getByText('Private & Local').closest('article')).toHaveClass('dark:bg-slate-900', 'dark:border-slate-700');
  expect(screen.getByText('No posts yet — check back soon!').parentElement).toHaveClass('dark:border-slate-600');
  expect(screen.getByRole('link', { name: 'Start Reading' })).toHaveClass('bg-white', 'dark:hover:bg-slate-800');
  expect(getPosts()).toEqual([]);
  expect(getUsers()).toEqual([]);
  expect(getSession()).toBeNull();
});

it('themes populated public previews without mutating saved writing or identity', () => {
  reader();
  const post = createPost({ title: 'Local preview', content: 'Saved text' });
  const before = localStorage.getItem('writespace_posts');
  setup();
  expect(screen.getByRole('article', { name: 'Newest local post preview' })).toHaveClass('dark:bg-slate-900');
  expect(screen.getByRole('link', { name: post.title })).toHaveClass('dark:hover:text-orange-200');
  expect(localStorage.getItem('writespace_posts')).toBe(before);
  expect(getSession().role).toBe('user');
});

it.each(['/login', '/register'])('themes fields and accessible required validation at %s', async (path) => {
  const user = setup(path);
  expect(screen.getByRole('main')).toHaveClass('dark:bg-slate-950');
  expect(screen.getByRole('region')).toHaveClass('bg-white', 'dark:bg-slate-900', 'dark:border-slate-700');
  await user.click(screen.getByRole('button', { name: path === '/login' ? 'Login' : 'Register' }));
  for (const field of screen.getAllByLabelText(/Display Name|Username|Password/)) {
    expect(field).toHaveClass('dark:text-slate-100', 'dark:border-slate-600', 'dark:focus:ring-orange-400');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('This field is required.');
  }
  for (const alert of screen.getAllByRole('alert')) expect(alert).toHaveClass('dark:text-red-300');
  expect(getSession()).toBeNull();
  expect(getUsers()).toEqual([]);
});

it('keeps invalid credential errors readable and does not establish a session', async () => {
  const user = setup('/login');
  fill('Username', 'admin');
  fill('Password', 'wrong');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('alert')).toHaveClass('dark:bg-red-950', 'dark:text-red-300');
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Invalid username or password.');
  expect(getSession()).toBeNull();
});

it('registers, validates, publishes, reads and edits in dark mode without changing ownership metadata', async () => {
  const user = setup('/register');
  for (const [label, value] of [['Display Name', 'Theme Writer'], ['Username', 'theme-writer'],
    ['Password', 'demo'], ['Confirm Password', 'wrong']]) fill(label, value);
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Passwords must match.');
  expect(getUsers()).toEqual([]);
  fill('Confirm Password', 'demo');
  await user.click(screen.getByRole('button', { name: 'Register' }));
  const session = getSession();
  const accounts = localStorage.getItem('writespace_users');
  expect(session).toMatchObject({ displayName: 'Theme Writer', role: 'user' });
  expect(screen.getByText('No blogs yet. Be the first to write one!').closest('section')).toHaveClass('dark:bg-slate-900');
  await user.click(screen.getByRole('link', { name: 'Write New Post' }));
  expect(screen.getByLabelText('Content')).toHaveValue('');
  expect(screen.getByLabelText('Content').closest('form')).toHaveClass('dark:bg-slate-900');
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Content')).toHaveAccessibleDescription(/This field is required/);
  expect(getPosts()).toEqual([]);
  for (const alert of screen.getAllByRole('alert')) expect(alert).toHaveClass('dark:text-red-300');
  const content = 'First line\n\n  <script>literal</script>  ';
  fill('Title', 'Dark writing');
  fill('Content', content);
  expect(screen.getByLabelText('Content')).toHaveClass('dark:bg-slate-950', 'dark:text-slate-100');
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  const post = getPosts()[0];
  expect(post).toMatchObject({ title: 'Dark writing', content, authorId: session.userId, authorName: session.displayName });
  const body = screen.getByRole('article').querySelector('p.whitespace-pre-wrap');
  expect(body.textContent).toBe(content);
  expect(body).toHaveClass('dark:border-slate-700');
  expect(screen.getByRole('article').querySelector('script')).toBeNull();
  expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('dark:text-red-300', 'dark:hover:bg-red-900');
  await user.click(screen.getByRole('link', { name: 'Back to All Posts' }));
  expect(screen.getByRole('article')).toHaveClass('dark:bg-slate-900', 'dark:border-slate-700');
  await user.click(screen.getByRole('link', { name: 'Dark writing', exact: true }));
  await user.click(screen.getByRole('link', { name: 'Edit', exact: true }));
  expect(screen.getByLabelText('Content')).toHaveValue(content);
  fill('Title', 'Saved revision');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(getPosts()).toEqual([{ ...post, title: 'Saved revision' }]);
  expect(screen.getByRole('heading', { name: 'Saved revision' })).toHaveClass('dark:text-slate-100');
  expect(localStorage.getItem('writespace_users')).toBe(accounts);
  expect(getSession()).toEqual(session);
  expect(localStorage.getItem('writespace_theme')).toBe('dark');
});

it.each(['/blog/missing', '/edit/missing'])('retains readable missing state at %s', async (path) => {
  reader();
  const user = setup(path);
  expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Back to All Posts' }));
  expect(screen.getByRole('main')).toHaveClass('dark:bg-slate-950');
  expect(getPosts()).toEqual([]);
});

it.each(['user', 'admin'])('preserves %s management boundaries on another author’s dark reading surface', (role) => {
  reader('Owner');
  const post = createPost({ title: 'Owned writing', content: 'Keep ownership' });
  if (role === 'admin') authenticate('admin', 'admin');
  else reader('Other');
  setup(`/blog/${post.id}`);
  expect(Boolean(screen.queryByRole('link', { name: 'Edit', exact: true }))).toBe(role === 'admin');
  expect(Boolean(screen.queryByRole('button', { name: 'Delete' }))).toBe(role === 'admin');
  expect(getPosts()).toEqual([post]);
});

it('retains failed writing and readable persistence errors without altering saved posts', async () => {
  reader();
  const user = setup('/write');
  fill('Title', 'Unsaved draft');
  fill('Content', 'Retain this text');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  expect(screen.getByRole('alert')).toHaveClass('dark:bg-red-950', 'dark:text-red-300');
  expect(screen.getByLabelText('Content')).toHaveValue('Retain this text');
  expect(getPosts()).toEqual([]);
});
