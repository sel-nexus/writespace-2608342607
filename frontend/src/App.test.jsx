/** Exercise root-owned theme across real navigation, refresh and logout boundaries. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

afterEach(() => document.documentElement.classList.remove('dark'));

/** Mount the existing route tree without introducing a second production router. */
function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App theme', () => {
  it.each([null, 'invalid', 'light', 'dark'])('initializes root class and action for saved %s', (theme) => {
    if (theme !== null) localStorage.setItem('writespace_theme', theme);
    document.documentElement.classList.add('dark');
    mount();
    expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
    expect(screen.getByRole('button', { name: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode' })).toBeInTheDocument();
  });

  it('keeps dark mode across navigation and remount and switches back to light', async () => {
    const view = mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('writespace_theme')).toBe('dark');
    await user.click(screen.getByRole('link', { name: 'Start Reading' }));
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('link', { name: 'WriteSpace home', exact: true }));
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    view.unmount();
    mount();
    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('writespace_theme')).toBe('light');
  });

  it('shares the authenticated toggle and keeps preference and records after logout', async () => {
    localStorage.setItem('writespace_session', JSON.stringify({
      userId: 'default-admin', username: 'admin', displayName: 'Admin', role: 'admin',
    }));
    localStorage.setItem('writespace_posts', '[]');
    localStorage.setItem('writespace_users', '[]');
    mount('/blogs');
    const user = userEvent.setup();
    const nav = within(screen.getByRole('navigation', { name: 'Authenticated navigation' }));
    await user.click(nav.getByRole('button', { name: 'Switch to dark mode' }));
    await user.click(nav.getByRole('button', { name: 'Account options for Admin' }));
    await user.click(nav.getByRole('button', { name: 'Logout' }));
    expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('writespace_session')).toBeNull();
    expect(localStorage.getItem('writespace_theme')).toBe('dark');
    expect(localStorage.getItem('writespace_posts')).toBe('[]');
    expect(localStorage.getItem('writespace_users')).toBe('[]');
  });

  it('defaults to light after read failure and still allows an in-memory dark selection', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    mount();
    expect(document.documentElement).not.toHaveClass('dark');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
  });

  it('updates immediately in both directions when persistence fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('writespace_theme')).toBeNull();
  });
});
