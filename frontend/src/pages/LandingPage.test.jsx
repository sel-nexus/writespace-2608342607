/** Verify real local previews and discovery navigation, including graceful failures. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import LandingPage from './LandingPage';
import App from '../App';
import { savePosts } from '../utils/storage';

/** Build a schema-valid local post for preview assertions.
 * Args:
 *   day: March creation day and stable fixture identity.
 * Returns:
 *   Complete local post record.
 */
function post(day) {
  return { id: `${String(day).padStart(8, '0')}-1111-4111-8111-111111111111`, title: `Thought ${day}`, content: 'A'.repeat(121), createdAt: `2026-03-${String(day).padStart(2, '0')}T12:00:00.000Z`, authorId: 'default-admin', authorName: 'Admin' };
}

/** Observe client navigation without adding placeholder route components.
 * Returns:
 *   Current pathname for assertions.
 */
function Location() {
  return (
    <output aria-label="Selected route">{useLocation().pathname}</output>
  );
}

/** Mount the landing page using real router links.
 * Args:
 *   session: Optional validated identity.
 */
function mount(session = null) {
  render(
    <MemoryRouter>
      <LandingPage session={session} />
      <Location />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('renders the tagline, all features, empty state and footer without seeding', () => {
    mount();
    expect(screen.getByText('Your thoughts. Your space. Beautifully simple.')).toBeInTheDocument();
    for (const title of ['Write Freely', 'Private & Local', 'Instant & Fast']) expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText('No posts yet — check back soon!')).toBeInTheDocument();
    expect(localStorage.getItem('writespace_posts')).toBeNull();
    const footer = within(screen.getByRole('navigation', { name: 'Footer navigation' }));
    for (const [name, path] of [['Home', '/'], ['All Blogs', '/blogs'], ['Login', '/login'], ['Register', '/register']]) expect(footer.getByRole('link', { name })).toHaveAttribute('href', path);
    expect(screen.getByText(`© ${new Date().getFullYear()} WriteSpace`)).toBeInTheDocument();
  });

  it('sorts and limits real local previews without modifying storage', async () => {
    savePosts([post(1), post(4), post(2), post(3)]);
    const saved = localStorage.getItem('writespace_posts');
    mount();
    const latest = within(screen.getByRole('region', { name: 'Latest from the Blog' }));
    expect(latest.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Thought 4', 'Thought 3', 'Thought 2']);
    expect(latest.queryByText('Thought 1')).not.toBeInTheDocument();
    expect(latest.getAllByText(`${'A'.repeat(120)}…`)).toHaveLength(3);
    expect(latest.getByText('Mar 04, 2026')).toBeInTheDocument();
    await userEvent.setup().click(latest.getByRole('link', { name: 'Thought 4' }));
    expect(screen.getByLabelText('Selected route')).toHaveTextContent(`/blog/${post(4).id}`);
    expect(localStorage.getItem('writespace_posts')).toBe(saved);
  });

  it.each(['bad-json', '{}', '[{"title":42}]'])('shows empty state for corrupt or malformed storage %s', (raw) => {
    localStorage.setItem('writespace_posts', raw);
    mount();
    expect(screen.getByText('No posts yet — check back soon!')).toBeInTheDocument();
  });

  it('continues rendering when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
    mount();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('WriteSpace');
    expect(screen.getByText('No posts yet — check back soon!')).toBeInTheDocument();
  });

  it.each([['Start Reading', '/login'], ['Get Started Free', '/register']])('navigates guest %s to %s', async (name, path) => {
    mount();
    await userEvent.setup().click(screen.getByRole('link', { name }));
    expect(screen.getByLabelText('Selected route')).toHaveTextContent(path);
  });

  it.each(['admin', 'user'])('sends signed-in %s readers to all blogs', async (role) => {
    mount({ role });
    await userEvent.setup().click(screen.getByRole('link', { name: 'Start Reading' }));
    expect(screen.getByLabelText('Selected route')).toHaveTextContent('/blogs');
  });

  it('keeps unknown roles on the guest reading destination', () => {
    mount({ role: 'unknown' });
    expect(screen.getByRole('link', { name: 'Start Reading' })).toHaveAttribute('href', '/login');
  });

  it('renders short text literally and does not append an unnecessary ellipsis', () => {
    savePosts([{ ...post(1), content: '<script>not executed</script>' }]);
    mount();
    expect(screen.getByText('<script>not executed</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('compiles the real application root with a public navbar and landing route', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('WriteSpace');
  });
});
