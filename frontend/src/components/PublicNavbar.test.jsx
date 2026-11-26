/** Verify public actions, supplied roles, and mobile disclosure behavior. */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';

/** Expose the selected pathname without implementing application routes.
 * Returns:
 *   A test-only navigation observation.
 */
function Location() {
  return (
    <output aria-label="Selected route">{useLocation().pathname}</output>
  );
}

/** Render navigation with its real router dependency.
 * Args:
 *   session: Optional visitor identity to supply.
 */
function mount(session) {
  render(
    <MemoryRouter>
      <PublicNavbar session={session} />
      <Location />
    </MemoryRouter>,
  );
}

describe('PublicNavbar', () => {
  it('offers guest links and home logo without a session dependency', async () => {
    mount();
    expect(screen.getByRole('link', { name: 'WriteSpace home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
    await userEvent.setup().click(screen.getByRole('link', { name: 'Get Started' }));
    expect(screen.getByLabelText('Selected route')).toHaveTextContent('/register');
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument();
  });

  it.each([['admin', '/admin', 'bg-violet-600'], ['user', '/blogs', 'bg-indigo-500']])('sends supplied %s identity to its role home', async (role, path, color) => {
    mount({ role, displayName: 'Ada' });
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByLabelText(`${role} avatar`)).toHaveClass(color);
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Go to Dashboard' }));
    expect(screen.getByLabelText('Selected route')).toHaveTextContent(path);
  });

  it.each([{ role: 'unknown', displayName: 'Ada' }, { role: 'user' }, { role: 'admin', displayName: '   ' }])('fails back to guest actions for malformed identity %j', (session) => {
    mount(session);
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument();
  });

  it('opens, closes and collapses the mobile menu after navigation', async () => {
    mount();
    const user = userEvent.setup();
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('public-menu')).toHaveClass('hidden');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    await user.click(screen.getByRole('link', { name: 'Login' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Selected route')).toHaveTextContent('/login');
  });

  it('places the icon-only theme toggle on the right side after public navigation links', () => {
    mount();
    const nav = screen.getByRole('navigation', { name: 'Public navigation' });
    const menu = document.getElementById('public-menu');
    const toggle = screen.getByRole('button', { name: 'Dark mode' });
    expect(toggle).toHaveTextContent('');
    expect(toggle.querySelector('svg')).toBeInTheDocument();
    expect(menu).toHaveClass('order-3', 'sm:order-none', 'sm:ml-auto');
    expect(toggle.parentElement).toHaveClass('order-2', 'sm:order-none');
    expect(toggle.parentElement).not.toHaveClass('sm:contents');
    const children = [...nav.children];
    expect(children.indexOf(menu)).toBeLessThan(children.indexOf(toggle.parentElement));
  });
});
