/** Verify role links, disclosure controls, navigation and real logout persistence. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';
import { authenticate, getSession, register } from '../utils/auth';

/** Render a navigation shell with test-only destinations. */
function setup(role = 'user', path = '/blogs') {
  const session = role === 'admin' ? authenticate('admin', 'admin')
    : register({ displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar session={session} />
      <Routes>
        <Route path="/" element={<h1>Public home</h1>} />
        <Route path="/blogs" element={<h1>Blog collection</h1>} />
        <Route path="/write" element={<h1>Writing form</h1>} />
        <Route path="/users" element={<h1>Account management</h1>} />
        <Route path="/admin" element={<h1>Admin overview</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}
it('shows shared links, active pill and no administrator link for a user', () => {
  setup();
  expect(screen.getByRole('link', { name: 'All Blogs' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'All Blogs' })).toHaveClass('bg-indigo-600');
  expect(screen.getByRole('link', { name: 'Write' })).toHaveAttribute('href', '/write');
  expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'user avatar' })).toHaveTextContent('📚');
});
it('offers admin Users and role-home navigation', async () => {
  const user = setup('admin');
  await user.click(screen.getByRole('link', { name: 'Users' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Account management');
  expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
  await user.click(screen.getByRole('button', { name: 'Account options for Admin' }));
  await user.click(screen.getByRole('link', { name: 'Go to Dashboard' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Admin overview');
});
it('opens mobile navigation, closes after links and returns focus on Escape', async () => {
  const user = setup();
  const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
  expect(trigger).toHaveAttribute('aria-controls', 'authenticated-menu');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await user.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.click(screen.getByRole('link', { name: 'Write' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Writing form');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
it('closes account options with Escape and restores trigger focus', async () => {
  const user = setup();
  const trigger = screen.getByRole('button', { name: 'Account options for Reader' });
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await user.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
});
it('links user role home and logo to their specified destinations', async () => {
  const user = setup('user', '/write');
  await user.click(screen.getByRole('button', { name: 'Account options for Reader' }));
  await user.click(screen.getByRole('link', { name: 'Go to Dashboard' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Blog collection');
  await user.click(screen.getByRole('link', { name: 'WriteSpace home' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Public home');
});
it('clears the real session and returns home on logout', async () => {
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Account options for Reader' }));
  await user.click(screen.getByRole('button', { name: 'Logout' }));
  expect(screen.getByRole('heading')).toHaveTextContent('Public home');
  expect(getSession()).toBeNull();
  expect(localStorage.getItem('writespace_session')).toBeNull();
});
it('reports a logout write failure and keeps the session and route', async () => {
  const user = setup();
  const before = getSession();
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
  await user.click(screen.getByRole('button', { name: 'Account options for Reader' }));
  await user.click(screen.getByRole('button', { name: 'Logout' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to log out');
  expect(screen.getByRole('heading')).toHaveTextContent('Blog collection');
  expect(getSession()).toEqual(before);
});
it('renders no authenticated controls for a missing session', () => {
  render(
    <MemoryRouter>
      <Navbar session={null} />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});
