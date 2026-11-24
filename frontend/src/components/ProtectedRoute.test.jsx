/** Exercise route guards against real identities in memory navigation. */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { authenticate, register } from '../utils/auth';
import { saveUsers } from '../utils/storage';

/** Render test-only destinations; never create placeholder product pages. */
function route(adminOnly = false, children = false) {
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<h1>Sign in boundary</h1>} />
        <Route path="/blogs" element={<h1>Role home boundary</h1>} />
        {children ? (
          <Route
            path="/protected"
            element={
              <ProtectedRoute adminOnly={adminOnly}>
                <h1>Private content</h1>
              </ProtectedRoute>
            }
          />
        ) : (
          <Route element={<ProtectedRoute adminOnly={adminOnly} />}>
            <Route path="/protected" element={<h1>Private content</h1>} />
          </Route>
        )}
      </Routes>
    </MemoryRouter>,
  );
}
it.each([false, true])('redirects guests from adminOnly=%s', (adminOnly) => {
  route(adminOnly);
  expect(screen.getByRole('heading')).toHaveTextContent('Sign in boundary');
});
it('redirects a regular user from administrator content', () => {
  register({ displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' });
  route(true);
  expect(screen.getByRole('heading')).toHaveTextContent('Role home boundary');
});
it('permits a user through the shared guard with nested outlet', () => {
  register({ displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' });
  route();
  expect(screen.getByRole('heading')).toHaveTextContent('Private content');
});
it.each([false, true])('permits default admin with adminOnly=%s and children', (adminOnly) => {
  authenticate('admin', 'admin');
  route(adminOnly, true);
  expect(screen.getByRole('heading')).toHaveTextContent('Private content');
});
it.each(['corrupt', 'forged', 'deleted'])('fails closed for %s sessions', (kind) => {
  const user = register({ displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' });
  if (kind === 'deleted') saveUsers([]);
  if (kind === 'corrupt') localStorage.setItem('writespace_session', '{broken');
  if (kind === 'forged') localStorage.setItem('writespace_session', JSON.stringify({ ...user, role: 'admin' }));
  route(true);
  expect(screen.getByRole('heading')).toHaveTextContent('Sign in boundary');
});
