/** Exercise shared theme control through real routes, identity and unsaved forms. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
});

/** Render the actual application at a fresh entry route. */
function openApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** Find the one shared control regardless of active header. */
function toggle() {
  return screen.getByRole('button', { name: 'Dark mode' });
}

/** Sign in using the public built-in demo account, not a mocked auth module. */
async function login(user) {
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'admin');
  await user.click(screen.getByRole('button', { name: 'Login', exact: true }));
  await screen.findByRole('navigation', { name: 'Authenticated navigation' });
}

describe('App theme preference', () => {
  it.each(['/', '/login', '/register'])('provides exactly one usable guest toggle at %s', async (path) => {
    const user = userEvent.setup();
    openApp(path);
    expect(screen.getAllByRole('button', { name: 'Dark mode' })).toHaveLength(1);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('writespace_theme')).toBe('dark');
    await user.click(toggle());
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('writespace_theme')).toBe('light');
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });
  it.each(['light', 'dark', 'invalid', '"dark"'])('restores %s at a fresh protected link after the normal guest redirect', async (value) => {
    localStorage.setItem('writespace_theme', value);
    openApp('/write');
    await screen.findByRole('button', { name: 'Login', exact: true });
    expect(toggle()).toHaveAttribute('aria-pressed', String(value === 'dark'));
    expect(document.documentElement.style.colorScheme).toBe(value === 'dark' ? 'dark' : 'light');
    expect(localStorage.getItem('writespace_theme')).toBe(value);
  });
  it('defaults to light on blocked reads, but can switch and persist once reads recover', async () => {
    const user = userEvent.setup();
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    openApp('/login');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.style.colorScheme).toBe('light');
    read.mockRestore();
    await user.click(toggle());
    expect(localStorage.getItem('writespace_theme')).toBe('dark');
  });
  it('keeps preference through guest navigation, login, protected navigation and logout', async () => {
    const user = userEvent.setup();
    openApp();
    await user.click(toggle());
    await user.click(within(screen.getByRole('navigation', { name: 'Public navigation' })).getByRole('link', { name: 'Login', exact: true }));
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    await login(user);
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    const savedSession = localStorage.getItem('writespace_session');
    await user.click(screen.getByRole('link', { name: 'Write', exact: true }));
    await user.click(toggle());
    expect(localStorage.getItem('writespace_session')).toBe(savedSession);
    await user.click(screen.getByRole('button', { name: /Account options/ }));
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByRole('navigation', { name: 'Public navigation' });
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('writespace_theme')).toBe('light');
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });
  it('preserves the real writing draft and validation state with failed preference writes', async () => {
    const user = userEvent.setup();
    localStorage.setItem('writespace_posts', '[]');
    localStorage.setItem('writespace_users', '[]');
    openApp('/login');
    await login(user);
    await user.click(screen.getByRole('link', { name: 'Write', exact: true }));
    const title = screen.getByLabelText('Title');
    const content = screen.getByLabelText('Content');
    await user.type(title, 'Unsaved theme draft');
    const submit = screen.getByRole('button', { name: /Publish|Save|Create/ });
    await user.click(submit);
    const validation = screen.getAllByRole('alert').map((alert) => alert.textContent);
    expect(validation.length).toBeGreaterThan(0);
    const savedSession = localStorage.getItem('writespace_session');
    const savedPosts = localStorage.getItem('writespace_posts');
    const savedUsers = localStorage.getItem('writespace_users');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveClass('dark');
    expect(title).toHaveValue('Unsaved theme draft');
    expect(content).toHaveValue('');
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual(validation);
    await user.type(content, 'Still editable in the current session');
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(title).toHaveValue('Unsaved theme draft');
    expect(content).toHaveValue('Still editable in the current session');
    expect(localStorage.getItem('writespace_theme')).toBeNull();
    expect(localStorage.getItem('writespace_session')).toBe(savedSession);
    expect(localStorage.getItem('writespace_posts')).toBe(savedPosts);
    expect(localStorage.getItem('writespace_users')).toBe(savedUsers);
    expect(screen.getByRole('heading', { name: /Write/ })).toBeInTheDocument();
  });
  it('retains login fields and invalid-credential feedback while changing theme', async () => {
    const user = userEvent.setup();
    openApp('/login');
    await user.type(screen.getByLabelText('Username'), 'invalid-demo');
    await user.type(screen.getByLabelText('Password'), 'invalid-demo');
    await user.click(screen.getByRole('button', { name: 'Login', exact: true }));
    const error = screen.getByRole('alert').textContent;
    await user.click(toggle());
    expect(screen.getByLabelText('Username')).toHaveValue('invalid-demo');
    expect(screen.getByLabelText('Password')).toHaveValue('invalid-demo');
    expect(screen.getByRole('alert')).toHaveTextContent(error);
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });
});
