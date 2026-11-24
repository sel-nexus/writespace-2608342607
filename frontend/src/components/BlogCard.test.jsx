/** Check exact previews, navigation, role colors and ownership permutations. */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { BlogCard } from './BlogCard';
import { register } from '../utils/auth';
import { createPost } from '../utils/posts';
import { saveUsers, getUsers } from '../utils/storage';

/** Render a card with real author data and a supplied viewer. */
function setup(content = 'a'.repeat(121), session = null, index = 0) {
  register({ displayName: 'Writer', username: 'writer', password: 'demo', confirmPassword: 'demo' });
  const post = createPost({ title: '<script>plain title</script>', content });
  post.createdAt = '2026-03-04T23:59:59.000Z';
  const view = render(
    <MemoryRouter>
      <BlogCard post={post} session={session} index={index} />
    </MemoryRouter>,
  );
  return { post, ...view };
}
it.each([1, 119, 120, 121, 100000])('shows exactly min(length,120) plain characters for length %s', (length) => {
  const { container, post } = setup('x'.repeat(length));
  expect(container.querySelector('article > p').textContent).toBe('x'.repeat(Math.min(length, 120)));
  expect(screen.getByRole('link', { name: post.title })).toHaveAttribute('href', `/blog/${post.id}`);
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('Mar 04, 2026')).toHaveAttribute('datetime', post.createdAt);
  expect(screen.getByText('Writer')).toBeInTheDocument();
});
it.each([
  [null, false], [{ role: 'user', userId: 'other' }, false], [{ role: 'admin', userId: 'default-admin' }, true],
])('exposes edit only to eligible viewer %j', (session, allowed) => {
  const { post } = setup('Text', session);
  const edit = screen.queryByRole('link', { name: `Edit ${post.title}` });
  if (allowed) expect(edit).toHaveAttribute('href', `/edit/${post.id}`);
  else expect(edit).toBeNull();
});
it('shows the owner edit link and changes avatar to book after author deletion', () => {
  const { post, rerender } = setup();
  saveUsers(getUsers().map((user) => ({ ...user, role: 'admin' })));
  rerender(
    <MemoryRouter>
      <BlogCard post={post} session={{ role: 'user', userId: post.authorId }} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: `Edit ${post.title}` })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'admin avatar' })).toBeInTheDocument();
  saveUsers([]);
  rerender(
    <MemoryRouter>
      <BlogCard post={post} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('img', { name: 'user avatar' })).toBeInTheDocument();
  expect(screen.getByText('Writer')).toBeInTheDocument();
});
it.each([[0, 'indigo'], [1, 'violet'], [2, 'pink'], [3, 'teal'], [4, 'indigo']])(
  'cycles top border at index %s to %s', (index, color) => {
    const { container } = setup('Text', null, index);
    expect(container.querySelector('article')).toHaveClass(`border-${color}-500`, 'border-t-4');
  },
);
