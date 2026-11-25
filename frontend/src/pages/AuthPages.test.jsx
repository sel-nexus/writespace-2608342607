/** Test local forms and app identity propagation with state rereads. */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import App from '../App';
import { authenticate, clearSession, getSession, register } from '../utils/auth';
import { getUsers } from '../utils/storage';

/** Restore the shared theme marker after isolated form and App cases. */
afterEach(() => document.documentElement.classList.remove('dark'));

/** Provide isolated forms and observable test-only role homes in either theme. */
function setup(path = '/login', theme = 'light') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/blogs" element={<h1>Reader home</h1>} />
        <Route path="/admin" element={<h1>Administrator home</h1>} />
        <Route path="/" element={<h1>Landing</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}
/** Enter a demonstration registration through accessible fields. */
async function fillRegistration(user, username = 'reader', confirmation = 'demo') {
  await user.type(screen.getByLabelText('Display Name'), 'Reader');
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Password', { exact: true }), 'demo');
  await user.type(screen.getByLabelText('Confirm Password'), confirmation);
}
it.each([['/login', 'light'], ['/login', 'dark'], ['/register', 'light'], ['/register', 'dark']])(
  'requires all fields accessibly at %s in %s mode', async (path, theme) => {
    const user = setup(path, theme);
    await user.click(screen.getByRole('button', { name: path === '/login' ? 'Login' : 'Register' }));
    const inputs = screen.getAllByLabelText(/Display Name|Username|Password/);
    for (const input of inputs) {
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('This field is required.');
      expect(document.getElementById(input.getAttribute('aria-describedby')))
        .toHaveClass('text-red-700', 'dark:text-red-300');
    }
    expect(getSession()).toBeNull();
    expect(getUsers()).toEqual([]);
  },
);
it.each(['light', 'dark'])('shows exact invalid credentials error with field association in %s mode', async (theme) => {
  const user = setup('/login', theme);
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'wrong');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.');
  expect(screen.getByRole('alert')).toHaveClass('bg-red-50', 'text-red-700', 'dark:bg-red-950', 'dark:text-red-300');
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Invalid username or password.');
  expect(getSession()).toBeNull();
});
it('logs in default admin and rereads saved session', async () => {
  const user = setup();
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'admin');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Administrator home');
  expect(getSession()).toEqual({ userId: 'default-admin', username: 'admin', displayName: 'Admin', role: 'admin' });
});
it('registers a user and later logs in through the linked form', async () => {
  register({ displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' });
  clearSession();
  const user = setup('/register');
  await user.click(screen.getByRole('link', { name: 'Login' }));
  await user.type(screen.getByLabelText('Username'), 'reader');
  await user.type(screen.getByLabelText('Password'), 'demo');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Reader home');
  expect(getSession().username).toBe('reader');
  expect(getUsers()).toHaveLength(1);
});
it('persists registration as user and redirects only on success', async () => {
  const user = setup('/register');
  await fillRegistration(user);
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Reader home');
  expect(getUsers()).toHaveLength(1);
  expect(getSession().role).toBe('user');
});
it.each([
  ['large text', 'Large Reader '.repeat(1000).trim(), 'large-reader-'.repeat(1000), ` ${'demo-'.repeat(2000)} `],
  ['literal markup', '<img src=x onerror="alert(1)"><script>alert(1)</script>', 'markup-reader', 'demo-only'],
])('roundtrips %s through registration, App identity rendering, logout and login', async (kind, displayName, username, password) => {
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter initialEntries={['/register']}>
      <App />
    </MemoryRouter>,
  );
  // Change whole values to exercise controlled inputs without thousands of keystroke delays.
  for (const [label, value] of [['Display Name', displayName], ['Username', username],
    ['Password', password], ['Confirm Password', password]]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
    expect(screen.getByLabelText(label, { exact: true })).toHaveValue(value);
  }
  await user.click(screen.getByRole('button', { name: 'Register', exact: true }));
  const session = getSession();
  expect(session).toEqual(expect.objectContaining({ displayName, username, role: 'user' }));
  expect(getUsers()).toEqual([expect.objectContaining({ displayName, username, password })]);
  const accounts = localStorage.getItem('writespace_users');
  let accountButton = screen.getByRole('button', { name: `Account options for ${displayName}` });
  expect(within(accountButton).getByText(displayName, { exact: true }).textContent).toBe(displayName);
  expect(container.querySelector('script, img[src="x"], [onerror]')).toBeNull();
  await user.click(screen.getByRole('link', { name: 'WriteSpace home' }));
  const publicNavigation = within(screen.getByRole('navigation', { name: 'Public navigation' }));
  expect(publicNavigation.getByText(displayName, { exact: true }).textContent).toBe(displayName);
  expect(container.querySelector('script, img[src="x"], [onerror]')).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Go to Dashboard' }));
  await user.click(screen.getByRole('button', { name: `Account options for ${displayName}` }));
  await user.click(screen.getByRole('button', { name: 'Logout', exact: true }));
  expect(getSession()).toBeNull();
  await user.click(within(screen.getByRole('navigation', { name: 'Footer navigation' })).getByRole('link', { name: 'Login' }));
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  await user.click(screen.getByRole('button', { name: 'Login', exact: true }));
  expect(getSession()).toEqual(session);
  expect(localStorage.getItem('writespace_users')).toBe(accounts);
  accountButton = screen.getByRole('button', { name: `Account options for ${displayName}` });
  expect(within(accountButton).getByText(displayName, { exact: true }).textContent).toBe(displayName);
  expect(container.querySelector('script, img[src="x"], [onerror]')).toBeNull();
});
it.each(['light', 'dark'])('associates mismatch errors and saves nothing in %s mode', async (theme) => {
  const user = setup('/register', theme);
  await fillRegistration(user, 'reader', 'wrong');
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByLabelText('Confirm Password')).toHaveAccessibleDescription('Passwords must match.');
  expect(screen.getByRole('alert')).toHaveClass('text-red-700', 'dark:text-red-300');
  expect(getUsers()).toEqual([]);
  expect(getSession()).toBeNull();
});
it.each(['admin', 'reader'])('rejects reserved or duplicate username %s inline without overwriting', async (username) => {
  if (username === 'reader') {
    register({ displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' });
    clearSession();
  }
  const before = localStorage.getItem('writespace_users');
  const user = setup('/register');
  await fillRegistration(user, username);
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByRole('alert')).toHaveTextContent(username === 'admin' ? 'reserved' : 'already taken');
  expect(localStorage.getItem('writespace_users')).toBe(before);
  expect(getSession()).toBeNull();
});
it.each(['/login', '/register'])('redirects signed-in admins away from %s', (path) => {
  authenticate('admin', 'admin');
  setup(path);
  expect(screen.getByRole('heading')).toHaveTextContent('Administrator home');
});
it.each(['/login', '/register'])('redirects signed-in users away from %s', (path) => {
  register({ displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' });
  setup(path);
  expect(screen.getByRole('heading')).toHaveTextContent('Reader home');
});
it.each(['light', 'dark'])('leaves login visible when session storage fails in %s mode', async (theme) => {
  const user = setup('/login', theme);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'admin');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save session');
  expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  expect(getSession()).toBeNull();
});
it.each(['light', 'dark'])('retains form and no account on failed account write in %s mode', async (theme) => {
  const user = setup('/register', theme);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  await fillRegistration(user);
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save accounts');
  expect(getUsers()).toEqual([]);
  expect(getSession()).toBeNull();
});
it('explains a retained account after session failure without navigating or overwriting on retry', async () => {
  const user = setup('/register');
  const write = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === 'writespace_session') throw new Error('full');
    return write.call(this, key, value);
  });
  await fillRegistration(user);
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Your account was saved, but sign-in failed. Please log in');
  expect(getUsers()).toHaveLength(1);
  expect(getSession()).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByRole('alert')).toHaveTextContent('already taken');
  expect(getUsers()).toHaveLength(1);
});
it('refreshes the App header after login and logout using actual persisted session', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>,
  );
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'admin');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  await user.click(screen.getByRole('link', { name: 'WriteSpace home' }));
  expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/admin');
  await user.click(screen.getByRole('link', { name: 'Go to Dashboard' }));
  await user.click(screen.getByRole('button', { name: 'Account options for Admin' }));
  await user.click(screen.getByRole('button', { name: 'Logout' }));
  expect(getSession()).toBeNull();
  expect(within(screen.getByRole('navigation', { name: 'Public navigation' })).getByRole('link', { name: 'Login' }))
    .toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Go to Dashboard' })).not.toBeInTheDocument();
});
it('propagates persisted identity to the landing header and reading CTA in App', async () => {
  authenticate('admin', 'admin');
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/admin');
  expect(screen.getByRole('link', { name: 'Start Reading' })).toHaveAttribute('href', '/blogs');
  expect(within(screen.getByRole('navigation', { name: 'Public navigation' })).getByText('Admin')).toBeInTheDocument();
});

it.each([['/login', 'light'], ['/login', 'dark'], ['/register', 'light'], ['/register', 'dark']])(
  'provides paired surfaces, editable fields and keyboard links at %s in %s mode', async (path, theme) => {
    const user = setup(path, theme);
    expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
    expect(screen.getByRole('main')).toHaveClass('bg-slate-50', 'dark:bg-slate-950');
    expect(screen.getByRole('region')).toHaveClass('bg-white', 'dark:bg-slate-900', 'dark:border-slate-800');
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-slate-900', 'dark:text-slate-100');
    expect(screen.getByText(/Browser-local demo only/)).toHaveClass('text-slate-600', 'dark:text-slate-300');
    const home = screen.getByRole('link', { name: 'WriteSpace home' });
    await user.tab();
    expect(home).toHaveFocus();
    expect(home).toHaveClass('dark:text-slate-100', 'focus-visible:ring-offset-2', 'dark:focus-visible:ring-offset-slate-900');
    const fields = screen.getAllByLabelText(/Display Name|Username|Password/);
    for (const field of fields) {
      await user.tab();
      expect(field).toHaveFocus();
      expect(field).toHaveClass('bg-white', 'text-slate-900', 'dark:bg-slate-950', 'dark:text-slate-100',
        'dark:border-slate-700', 'dark:focus:ring-orange-400', 'dark:focus:ring-offset-slate-900');
      expect(document.querySelector(`label[for="${field.id}"]`)).toHaveClass('text-slate-800', 'dark:text-slate-200');
      await user.type(field, 'demo');
      expect(field).toHaveValue('demo');
      expect(field).toHaveAttribute('aria-invalid', 'false');
    }
    await user.tab();
    const submit = screen.getByRole('button', { name: path === '/login' ? 'Login' : 'Register' });
    expect(submit).toHaveFocus();
    expect(submit).toHaveClass('bg-orange-800', 'text-white', 'dark:focus-visible:ring-orange-400',
      'dark:focus-visible:ring-offset-slate-900');
    await user.tab();
    const link = screen.getByRole('link', { name: path === '/login' ? 'Register' : 'Login' });
    expect(link).toHaveFocus();
    expect(link).toHaveClass('text-orange-800', 'dark:text-orange-400', 'focus-visible:ring-offset-2',
      'dark:focus-visible:ring-offset-slate-900');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      path === '/login' ? 'Make room to write.' : 'Welcome back.',
    );
    expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
    expect(getSession()).toBeNull();
    expect(getUsers()).toEqual([]);
  },
);
