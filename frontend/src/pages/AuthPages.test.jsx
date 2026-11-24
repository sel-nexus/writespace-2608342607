/** Test local forms and app identity propagation with state rereads. */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import App from '../App';
import { authenticate, clearSession, getSession, register } from '../utils/auth';
import { getUsers } from '../utils/storage';

/** Provide isolated forms and observable test-only role homes. */
function setup(path = '/login') {
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
it.each(['/login', '/register'])('requires all fields accessibly at %s', async (path) => {
  const user = setup(path);
  await user.click(screen.getByRole('button', { name: path === '/login' ? 'Login' : 'Register' }));
  const inputs = screen.getAllByLabelText(/Display Name|Username|Password/);
  for (const input of inputs) {
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('This field is required.');
  }
  expect(getSession()).toBeNull();
  expect(getUsers()).toEqual([]);
});
it('shows exact invalid credentials error with field association', async () => {
  const user = setup();
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'wrong');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.');
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
it('associates mismatch errors and saves nothing', async () => {
  const user = setup('/register');
  await fillRegistration(user, 'reader', 'wrong');
  await user.click(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByLabelText('Confirm Password')).toHaveAccessibleDescription('Passwords must match.');
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
it('leaves login visible when session storage fails', async () => {
  const user = setup();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  await user.type(screen.getByLabelText('Username'), 'admin');
  await user.type(screen.getByLabelText('Password'), 'admin');
  await user.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save session');
  expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  expect(getSession()).toBeNull();
});
it('retains form and no account on failed account write', async () => {
  const user = setup('/register');
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
