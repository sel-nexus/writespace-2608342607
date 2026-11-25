/** Exercise actual local data through list, reading, forms and protected App routes. */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import App from '../App';
import { authenticate, clearSession, register } from '../utils/auth';
import { createPost } from '../utils/posts';
import { getPosts, savePosts, saveUsers } from '../utils/storage';

/** Register a real local account for ownership tests. */
function reader(name = 'Reader') {
  return register({ displayName: name, username: name.toLowerCase(), password: 'demo', confirmPassword: 'demo' });
}
/** Render real App wiring from an isolated route history. */
function setup(path = '/blogs', entries = [path]) {
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}
/** Fill writing fields without treating brackets as keyboard syntax. */
function fill(title = 'Title', content = 'First\n\n  Second  ') {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Content'), { target: { value: content } });
}
/** Reject numeric-only dark offset tokens on every rendered post control. */
function expectValidPostFocusOffsets() {
  const classes = [...screen.getByRole('main').querySelectorAll('[class]')]
    .flatMap((element) => [...element.classList]);
  expect(classes.filter((token) => /^dark:focus(?:-visible)?:ring-offset-\d+$/.test(token))).toEqual([]);
}
it.each(['user', 'admin'])('shows empty collection and write CTA to %s', async (role) => {
  if (role === 'admin') authenticate('admin', 'admin');
  else reader();
  const user = setup();
  expect(screen.getByText('No blogs yet. Be the first to write one!')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Write your first post' }));
  expect(screen.getByRole('heading', { name: 'Write a Post' })).toBeInTheDocument();
});
it('sorts newest first into specified responsive columns and exact excerpts', () => {
  reader();
  const old = createPost({ title: 'Old', content: 'a'.repeat(121) });
  const newest = createPost({ title: 'Newest', content: 'New writing' });
  savePosts([{ ...newest, createdAt: '2026-03-05T00:00:00.000Z' }, { ...old, createdAt: '2026-03-04T00:00:00.000Z' }]);
  setup();
  const articles = screen.getAllByRole('article');
  expect(articles[0]).toHaveTextContent('Newest');
  expect(articles[1].querySelector('article > p').textContent).toBe('a'.repeat(120));
  expect(articles[0].parentElement).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
});
it.each(['broken', '{}', '[null]'])('handles corrupt list %s gracefully without changing storage', (raw) => {
  authenticate('admin', 'admin');
  localStorage.setItem('writespace_posts', raw);
  setup();
  expect(screen.getByText('No blogs yet. Be the first to write one!')).toBeInTheDocument();
  expect(localStorage.getItem('writespace_posts')).toBe(raw);
});
it.each(['/blogs', '/blog/missing', '/write', '/edit/missing'])('guards guest direct entry %s', (path) => {
  setup(path);
  expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Content')).toBeNull();
});
it.each(['/blog/missing', '/edit/missing'])('shows missing state and working back link at %s', async (path) => {
  reader();
  const user = setup(path);
  expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Back to All Posts' }));
  expect(screen.getByRole('heading', { name: 'All Blogs' })).toBeInTheDocument();
});
it('reads large markup-like content literally preserving whitespace', () => {
  reader();
  const content = '<img src=x onerror=alert(1)>\n\n  ' + 'x'.repeat(100000);
  const post = createPost({ title: '<script>Title</script>', content });
  setup(`/blog/${post.id}`);
  const article = screen.getByRole('article');
  const body = article.querySelector('p.whitespace-pre-wrap');
  expect(body.textContent.trimStart()).toBe(content);
  expect(body).toHaveClass('whitespace-pre-wrap', 'break-words');
  expect(article.querySelector('img, script')).toBeNull();
});
it('hides actions on others writing and redirects a nonowner edit', () => {
  reader('Owner');
  const post = createPost({ title: 'Owned', content: 'Only owner edits' });
  reader('Other');
  setup(`/edit/${post.id}`);
  expect(screen.getByRole('heading', { name: 'All Blogs' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Edit Owned' })).toBeNull();
});
it('allows other readers to read but not edit or delete', () => {
  reader('Owner');
  const post = createPost({ title: 'Owned', content: 'Read me' });
  reader('Other');
  setup(`/blog/${post.id}`);
  expect(screen.getByRole('heading', { name: 'Owned' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Edit', exact: true })).toBeNull();
});
it.each(['user', 'admin'])('validates fields then persists and reads writing as %s', async (role) => {
  if (role === 'admin') authenticate('admin', 'admin');
  else reader();
  const user = setup('/write');
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  for (const label of ['Title', 'Content']) {
    expect(screen.getByLabelText(label)).toBeRequired();
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(/This field is required/);
  }
  expect(getPosts()).toEqual([]);
  fill('  Literal title  ', '  Hello\n\nworld  ');
  expect(screen.getByText('16 characters')).toBeInTheDocument();
  expect(screen.getByLabelText('Content')).toHaveClass('min-h-64');
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  expect(screen.getByRole('heading', { name: 'Literal title' })).toBeInTheDocument();
  expect(getPosts()[0]).toMatchObject({ title: '  Literal title  ', content: '  Hello\n\nworld  ' });
});
it.each(['owner', 'admin'])('prefills and updates existing writing as %s preserving metadata', async (role) => {
  reader();
  const post = createPost({ title: 'Original', content: 'Original\n content' });
  if (role === 'admin') authenticate('admin', 'admin');
  const user = setup(`/blog/${post.id}`);
  await user.click(screen.getByRole('link', { name: 'Edit', exact: true }));
  expect(screen.getByLabelText('Title')).toHaveValue(post.title);
  expect(screen.getByLabelText('Content')).toHaveValue(post.content);
  fill('Updated', 'Updated\n text');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(getPosts()).toEqual([{ ...post, title: 'Updated', content: 'Updated\n text' }]);
  expect(screen.getByRole('heading', { name: 'Updated' })).toBeInTheDocument();
});
it.each(['cancel', 'confirm'])('handles %s deletion with fresh stored result', async (choice) => {
  reader();
  const post = createPost({ title: 'Delete me', content: 'Writing' });
  const user = setup(`/blog/${post.id}`);
  vi.spyOn(window, 'confirm').mockReturnValue(choice === 'confirm');
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(getPosts()).toEqual(choice === 'confirm' ? [] : [post]);
  expect(screen.getByRole('heading', { name: choice === 'confirm' ? 'All Blogs' : 'Delete me' })).toBeInTheDocument();
});
it('permits administrator deletion of another author writing', async () => {
  reader();
  const post = createPost({ title: 'User writing', content: 'Content' });
  authenticate('admin', 'admin');
  const user = setup(`/blog/${post.id}`);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(getPosts()).toEqual([]);
});
it.each(['logout', 'wrong owner', 'deleted account'])('rechecks %s during confirmation and shows inline failure', async (change) => {
  reader('Owner');
  const post = createPost({ title: 'Retained', content: 'Keep' });
  const user = setup(`/blog/${post.id}`);
  vi.spyOn(window, 'confirm').mockImplementation(() => {
    if (change === 'logout') clearSession();
    if (change === 'wrong owner') reader('Other');
    if (change === 'deleted account') saveUsers([]);
    return true;
  });
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/not saved/);
  expect(screen.getByRole('heading', { name: 'Retained' })).toBeInTheDocument();
  expect(getPosts()).toEqual([post]);
});
it.each(['write', 'edit', 'delete'])('retains %s page and data after failed persistence', async (operation) => {
  reader();
  const post = createPost({ title: 'Retained', content: 'Original' });
  const path = operation === 'write' ? '/write' : operation === 'edit' ? `/edit/${post.id}` : `/blog/${post.id}`;
  const user = setup(path);
  const before = localStorage.getItem('writespace_posts');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  if (operation === 'delete') {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
  } else {
    fill('Unsaved', 'Unsaved content');
    await user.click(screen.getByRole('button', { name: operation === 'write' ? 'Publish Post' : 'Save Changes' }));
    expect(screen.getByLabelText('Title')).toHaveValue('Unsaved');
  }
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save posts');
  expect(localStorage.getItem('writespace_posts')).toBe(before);
});
it('rechecks identity at form submission without navigating on failure', async () => {
  reader();
  const user = setup('/write');
  fill();
  clearSession();
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  expect(screen.getByRole('alert')).toHaveTextContent('sign in again');
  expect(screen.getByLabelText('Title')).toHaveValue('Title');
  expect(getPosts()).toEqual([]);
});
it('rejects corruption appearing after form load without overwriting', async () => {
  authenticate('admin', 'admin');
  const user = setup('/write');
  fill();
  localStorage.setItem('writespace_posts', '[null]');
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Existing data was not changed');
  expect(localStorage.getItem('writespace_posts')).toBe('[null]');
});
it('validates editing whitespace-only fields without losing the original post', async () => {
  reader();
  const post = createPost({ title: 'Original', content: 'Original text' });
  const user = setup(`/edit/${post.id}`);
  fill('  ', '\n');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Content')).toHaveAttribute('aria-invalid', 'true');
  expect(getPosts()).toEqual([post]);
});
it('rechecks ownership changed after the editor opened and retains unsaved fields inline', async () => {
  reader('Owner');
  const post = createPost({ title: 'Original', content: 'Original text' });
  const user = setup(`/edit/${post.id}`);
  fill('Unsaved', 'Unsaved text');
  reader('Other');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(screen.getByRole('alert')).toHaveTextContent('cannot manage');
  expect(screen.getByLabelText('Title')).toHaveValue('Unsaved');
  expect(getPosts()).toEqual([post]);
});
it.each(['edit', 'delete'])('reports a post removed after %s page opened without success navigation', async (action) => {
  reader();
  const post = createPost({ title: 'Removed later', content: 'Original text' });
  const user = setup(action === 'edit' ? `/edit/${post.id}` : `/blog/${post.id}`);
  if (action === 'edit') {
    fill('Unsaved', 'Unsaved text');
    savePosts([]);
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  } else {
    vi.spyOn(window, 'confirm').mockImplementation(() => {
      savePosts([]);
      return true;
    });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
  }
  expect(screen.getByRole('alert')).toHaveTextContent('Post not found');
  expect(screen.queryByRole('heading', { name: 'All Blogs' })).toBeNull();
  expect(getPosts()).toEqual([]);
});
it('shows a book and retained name for an orphaned author on the read page', () => {
  reader();
  const post = createPost({ title: 'Retained writing', content: 'Still readable' });
  saveUsers([]);
  authenticate('admin', 'admin');
  setup(`/blog/${post.id}`);
  expect(screen.getByRole('article').querySelector('[aria-label="user avatar"]')).not.toBeNull();
  expect(screen.getByRole('article')).toHaveTextContent('Reader');
  expect(getPosts()).toEqual([post]);
});
it.each(['direct', 'history'])('cancels unsaved writing safely with %s entry', async (entry) => {
  reader();
  const post = createPost({ title: 'Return here', content: 'Kept' });
  const user = setup('/write', entry === 'history' ? [`/blog/${post.id}`, '/write'] : ['/write']);
  if (entry === 'history') window.history.replaceState({ idx: 1 }, '');
  else window.history.replaceState(null, '');
  fill('Discard', 'Unsaved');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('heading', { name: entry === 'history' ? 'Return here' : 'All Blogs' })).toBeInTheDocument();
  expect(getPosts()).toEqual([post]);
  window.history.replaceState(null, '');
});

// Counter coverage uses real keystrokes, deletion and the existing persisted records.
it.each(['light', 'dark'])('keeps create counter informational through typing deletion empty validation and large content in %s', async (theme) => {
  reader();
  localStorage.setItem('writespace_theme', theme);
  const user = setup('/write');
  const content = screen.getByLabelText('Content');
  const counter = screen.getByRole('status');
  expect(counter).toHaveTextContent(/^0 characters$/);
  expect(counter).toHaveAttribute('aria-live', 'polite');
  expect(counter).toHaveAttribute('aria-atomic', 'true');
  expect(content).toHaveAccessibleDescription('0 characters');
  expect(content).not.toHaveAttribute('maxlength');
  await user.type(content, 'Hello');
  expect(counter).toHaveTextContent(/^5 characters$/);
  await user.type(content, '{Backspace}');
  expect(counter).toHaveTextContent(/^4 characters$/);
  await user.clear(content);
  expect(counter).toHaveTextContent(/^0 characters$/);
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  expect(content).toHaveAccessibleDescription('This field is required. 0 characters');
  expect(getPosts()).toEqual([]);
  fill('Long writing', 'x'.repeat(100001));
  expect(counter).toHaveTextContent(/^100001 characters$/);
  await user.click(screen.getByRole('button', { name: 'Publish Post' }));
  expect(getPosts()[0].content).toBe('x'.repeat(100001));
});
it.each(['light', 'dark'])('counts prefilled edit typing deletion and empty text while cancel preserves writing in %s', async (theme) => {
  reader();
  const post = createPost({ title: 'Original', content: 'Original\n text' });
  localStorage.setItem('writespace_theme', theme);
  const user = setup(`/edit/${post.id}`);
  const content = screen.getByLabelText('Content');
  const counter = screen.getByRole('status');
  expect(counter).toHaveTextContent(`${post.content.length} characters`);
  await user.click(content);
  await user.keyboard('{End}abc');
  expect(counter).toHaveTextContent(`${post.content.length + 3} characters`);
  await user.keyboard('{Backspace}');
  expect(counter).toHaveTextContent(`${post.content.length + 2} characters`);
  await user.clear(content);
  expect(counter).toHaveTextContent(/^0 characters$/);
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(content).toHaveAttribute('aria-invalid', 'true');
  expect(getPosts()).toEqual([post]);
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('heading', { name: 'All Blogs' })).toBeInTheDocument();
  expect(getPosts()).toEqual([post]);
});
it('pairs dark collection cards reader metadata and editor surfaces through real navigation', async () => {
  reader();
  localStorage.setItem('writespace_theme', 'dark');
  const post = createPost({ title: 'Themed writing', content: 'Readable words' });
  const user = setup();
  expect(document.documentElement).toHaveClass('dark');
  expect(screen.getByRole('main')).toHaveClass('bg-slate-50', 'dark:bg-slate-950');
  const card = screen.getByRole('article');
  expect(card).toHaveClass('bg-white', 'dark:bg-slate-900');
  expect(card.querySelector('time')).toHaveClass('dark:text-slate-300');
  expect(screen.getByRole('link', { name: 'Write New Post' })).toHaveClass('dark:focus-visible:ring-offset-slate-950');
  expect(screen.getByRole('link', { name: post.title })).toHaveClass('dark:focus-visible:ring-offset-slate-900');
  expect(screen.getByRole('link', { name: `Edit ${post.title}` })).toHaveClass('dark:focus-visible:ring-offset-slate-900');
  expectValidPostFocusOffsets();
  await user.click(screen.getByRole('link', { name: post.title }));
  expect(screen.getByRole('main')).toHaveClass('dark:text-slate-100');
  expect(screen.getByRole('article').querySelector('time')).toHaveClass('dark:text-slate-300');
  expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
    'dark:bg-red-950', 'dark:text-red-300', 'dark:focus-visible:ring-offset-slate-950',
  );
  for (const name of ['Back to All Posts', 'Edit']) {
    expect(screen.getByRole('link', { name, exact: true })).toHaveClass('dark:focus-visible:ring-offset-slate-950');
  }
  expectValidPostFocusOffsets();
  await user.click(screen.getByRole('link', { name: 'Edit', exact: true }));
  expect(screen.getByLabelText('Content').closest('form')).toHaveClass('bg-white', 'dark:bg-slate-900');
  expect(screen.getByLabelText('Content')).toHaveClass('dark:text-slate-100', 'dark:focus:ring-offset-slate-900');
  expect(screen.getByLabelText('Title')).toHaveClass('dark:focus:ring-offset-slate-900');
  for (const name of ['Save Changes', 'Cancel']) {
    expect(screen.getByRole('button', { name })).toHaveClass('dark:focus-visible:ring-offset-slate-900');
  }
  expectValidPostFocusOffsets();
  expect(screen.getByRole('status')).toHaveClass('dark:text-slate-300');
});
it('uses valid dark focus offsets for create fields and actions', () => {
  reader();
  localStorage.setItem('writespace_theme', 'dark');
  setup('/write');
  for (const label of ['Title', 'Content']) {
    expect(screen.getByLabelText(label)).toHaveClass('dark:focus:ring-offset-slate-900');
  }
  for (const name of ['Publish Post', 'Cancel']) {
    expect(screen.getByRole('button', { name })).toHaveClass('dark:focus-visible:ring-offset-slate-900');
  }
  expectValidPostFocusOffsets();
});
it.each(['/blog/missing', '/edit/missing'])('keeps dark missing state and collection empty state readable at %s', async (path) => {
  reader();
  localStorage.setItem('writespace_theme', 'dark');
  const user = setup(path);
  expect(screen.getByRole('main')).toHaveClass('dark:text-slate-100');
  expect(screen.getByRole('link', { name: 'Back to All Posts' })).toHaveClass('dark:focus-visible:ring-offset-slate-950');
  expectValidPostFocusOffsets();
  await user.click(screen.getByRole('link', { name: 'Back to All Posts' }));
  expect(screen.getByText('No blogs yet. Be the first to write one!').closest('section')).toHaveClass('dark:bg-slate-900');
  expect(screen.getByRole('link', { name: 'Write New Post' })).toHaveClass('dark:focus-visible:ring-offset-slate-950');
  expect(screen.getByRole('link', { name: 'Write your first post' })).toHaveClass('dark:focus-visible:ring-offset-slate-900');
  expectValidPostFocusOffsets();
});
