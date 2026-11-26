/** Verify post appearance and real App workflows without mocking local data. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { authenticate, register } from '../utils/auth';
import { createPost } from '../utils/posts';
import { getPosts } from '../utils/storage';

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

/** Register a real browser-local reader and make it the active identity. */
function reader(name = 'Writer') {
  return register({ displayName: name, username: name.toLowerCase(), password: 'demo', confirmPassword: 'demo' });
}

/** Render the actual route tree using the saved preference. */
function openApp(theme, path = '/blogs') {
  localStorage.setItem('writespace_theme', theme);
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

/** Assert the named control, root hint and persisted preference agree. */
function expectTheme(theme) {
  expect(screen.getByRole('button', { name: 'Dark mode' }))
    .toHaveAttribute('aria-pressed', String(theme === 'dark'));
  expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
  expect(document.documentElement.style.colorScheme).toBe(theme);
  expect(localStorage.getItem('writespace_theme')).toBe(theme);
}

/** Enter literal plain text without keyboard-token interpretation. */
function fill(title, content) {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Content'), { target: { value: content } });
}

for (const theme of ['light', 'dark']) {
  describe(`post routes in ${theme}`, () => {
    it.each(['user', 'admin'])('retains empty list, validation, drafts and full CRUD for %s', async (role) => {
      if (role === 'admin') authenticate('admin', 'admin');
      else reader();
      const user = openApp(theme);
      expectTheme(theme);
      expect(screen.getByRole('main')).toHaveClass('bg-slate-50', 'dark:bg-slate-950');
      expect(screen.getByText('No blogs yet. Be the first to write one!').closest('section'))
        .toHaveClass('bg-white', 'dark:bg-slate-900');
      const session = localStorage.getItem('writespace_session');
      const accounts = localStorage.getItem('writespace_users');
      await user.click(screen.getByRole('link', { name: 'Write your first post' }));
      expect(screen.getByRole('button', { name: 'Publish Post' }))
        .toHaveClass('bg-orange-800', 'hover:bg-orange-900', 'dark:focus-visible:ring-offset-slate-900');
      await user.click(screen.getByRole('button', { name: 'Publish Post' }));
      for (const label of ['Title', 'Content']) {
        expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(label)).toHaveAccessibleDescription(/This field is required/);
        expect(screen.getByLabelText(label)).toHaveClass('dark:bg-slate-900', 'dark:text-slate-100');
      }
      expect(screen.getAllByRole('alert')).toHaveLength(2);
      for (const alert of screen.getAllByRole('alert')) expect(alert).toHaveClass('dark:text-red-300');
      fill('Literal title', 'First\n\n  <script>plain</script>');
      const title = screen.getByLabelText('Title');
      const content = screen.getByLabelText('Content');
      await user.click(screen.getByRole('button', { name: 'Dark mode' }));
      expectTheme(theme === 'dark' ? 'light' : 'dark');
      expect(screen.getByLabelText('Title')).toBe(title);
      expect(content).toHaveValue('First\n\n  <script>plain</script>');
      expect(screen.getAllByRole('alert')).toHaveLength(2);
      expect(getPosts()).toEqual([]);
      await user.click(screen.getByRole('button', { name: 'Dark mode' }));
      await user.click(screen.getByRole('button', { name: 'Publish Post' }));
      const saved = getPosts()[0];
      expect(saved).toMatchObject({ title: 'Literal title', content: content.value });
      expect(screen.getByRole('heading', { name: saved.title })).toHaveClass('dark:text-slate-100');
      expect(screen.getByRole('article').querySelector('script')).toBeNull();
      expect(screen.getByRole('article').querySelector('p.whitespace-pre-wrap').textContent).toBe(saved.content);
      expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('dark:bg-red-950', 'dark:text-red-300');
      await user.click(screen.getByRole('link', { name: 'Back to All Posts' }));
      const card = screen.getByRole('article');
      expect(card).toHaveClass('bg-white', 'dark:bg-slate-900', 'dark:border-t-indigo-400');
      expect(within(card).getByText(saved.authorName)).toHaveClass('dark:text-slate-300');
      expect(card.querySelector('time')).toHaveClass('dark:text-slate-400');
      expect(card.querySelector('time')).toHaveAttribute('datetime', saved.createdAt);
      await user.click(screen.getByRole('link', { name: `Edit ${saved.title}` }));
      expect(screen.getByLabelText('Title')).toHaveValue(saved.title);
      fill('Discarded', 'Discarded');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(getPosts()).toEqual([saved]);
      await user.click(screen.getByRole('link', { name: saved.title }));
      await user.click(screen.getByRole('link', { name: 'Edit', exact: true }));
      fill('Updated', 'Updated\n  text');
      await user.click(screen.getByRole('button', { name: 'Save Changes' }));
      const updated = { ...saved, title: 'Updated', content: 'Updated\n  text' };
      expect(getPosts()).toEqual([updated]);
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(getPosts()).toEqual([updated]);
      expect(screen.getByRole('heading', { name: 'Updated' })).toBeInTheDocument();
      window.confirm.mockReturnValue(true);
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(getPosts()).toEqual([]);
      expect(screen.getByRole('heading', { name: 'All Blogs' })).toBeInTheDocument();
      expect(localStorage.getItem('writespace_session')).toBe(session);
      expect(localStorage.getItem('writespace_users')).toBe(accounts);
      expectTheme(theme);
    });

    it.each(['/blog/missing', '/edit/missing'])('keeps missing state and back navigation at %s', async (path) => {
      reader();
      const user = openApp(theme, path);
      expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
      expect(screen.getByRole('main')).toHaveClass('dark:text-slate-100');
      await user.click(screen.getByRole('button', { name: 'Dark mode' }));
      expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: 'Back to All Posts' }));
      expect(screen.getByRole('heading', { name: 'All Blogs' })).toBeInTheDocument();
      expect(getPosts()).toEqual([]);
    });

    it.each(['write', 'edit', 'delete'])('preserves %s storage failure across theme switching', async (operation) => {
      reader();
      const saved = createPost({ title: 'Retained', content: 'Original' });
      const path = operation === 'write' ? '/write' : operation === 'edit' ? `/edit/${saved.id}` : `/blog/${saved.id}`;
      const user = openApp(theme, path);
      const setItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
        if (key === 'writespace_posts') throw new Error('quota');
        return setItem.call(this, key, value);
      });
      if (operation === 'delete') {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        await user.click(screen.getByRole('button', { name: 'Delete' }));
      } else {
        fill('Unsaved', 'Unsaved text');
        await user.click(screen.getByRole('button', { name: operation === 'write' ? 'Publish Post' : 'Save Changes' }));
      }
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to save posts');
      expect(screen.getByRole('alert')).toHaveClass('dark:bg-red-950', 'dark:text-red-300');
      await user.click(screen.getByRole('button', { name: 'Dark mode' }));
      expectTheme(theme === 'dark' ? 'light' : 'dark');
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to save posts');
      if (operation !== 'delete') expect(screen.getByLabelText('Title')).toHaveValue('Unsaved');
      expect(getPosts()).toEqual([saved]);
    });

    it.each(['other reader', 'admin'])('retains permissions on another author post for %s', async (viewer) => {
      reader('Owner');
      const saved = createPost({ title: 'Owned', content: 'Read only for others' });
      if (viewer === 'admin') authenticate('admin', 'admin');
      else reader('Other');
      const user = openApp(theme, `/blog/${saved.id}`);
      expect(screen.getByRole('heading', { name: saved.title })).toBeInTheDocument();
      if (viewer === 'admin') {
        await user.click(screen.getByRole('link', { name: 'Edit', exact: true }));
        fill('Admin revision', 'Revised');
        await user.click(screen.getByRole('button', { name: 'Save Changes' }));
        expect(getPosts()).toEqual([{ ...saved, title: 'Admin revision', content: 'Revised' }]);
      } else {
        expect(screen.queryByRole('link', { name: 'Edit', exact: true })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
        await user.click(screen.getByRole('link', { name: 'Back to All Posts' }));
        expect(screen.queryByRole('link', { name: 'Edit Owned' })).toBeNull();
        expect(getPosts()).toEqual([saved]);
      }
      expectTheme(theme);
    });
  });
}
