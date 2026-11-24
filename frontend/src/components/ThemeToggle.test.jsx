/** Verify native input, pressed state, persistence and both navbar entry points. */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { PublicNavbar } from './PublicNavbar';
import { Navbar } from './Navbar';
import { applyTheme, THEME_KEY } from '../utils/theme';

beforeEach(() => applyTheme('light'));
afterEach(() => {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
});

it('toggles both appearances with a stable accessible name and decorative SVG', async () => {
  render(<ThemeToggle />);
  const button = screen.getByRole('button', { name: 'Dark mode', pressed: false });
  expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  const user = userEvent.setup();
  await user.click(button);
  expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement).toHaveClass('dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  await user.click(button);
  expect(button).toHaveAccessibleName('Dark mode');
  expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement).not.toHaveClass('dark');
  expect(document.documentElement.style.colorScheme).toBe('light');
  expect(localStorage.getItem(THEME_KEY)).toBe('light');
});

it('initializes from the applied root rather than overriding the startup choice', () => {
  applyTheme('dark');
  render(<ThemeToggle />);
  expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
  expect(localStorage.getItem(THEME_KEY)).toBeNull();
});

it('uses native Enter and Space activation and retains focus', async () => {
  render(<ThemeToggle />);
  const user = userEvent.setup();
  const button = screen.getByRole('button', { name: 'Dark mode' });
  await user.tab();
  expect(button).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(button).toHaveAttribute('aria-pressed', 'true');
  await user.keyboard(' ');
  expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(button).toHaveFocus();
});

it('continues toggling when persistence fails and retains state across remounts', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  const first = render(<ThemeToggle />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Dark mode' }));
  expect(document.documentElement).toHaveClass('dark');
  first.unmount();
  render(<ThemeToggle />);
  expect(screen.getByRole('button', { name: 'Dark mode', pressed: true })).toBeInTheDocument();
});

it.each(['public', 'authenticated'])('keeps the %s toggle outside the collapsed mobile menu', async (entry) => {
  const session = { userId: 'reader', username: 'reader', displayName: 'Reader', role: 'user' };
  render(
    <MemoryRouter>
      {entry === 'public' ? <PublicNavbar /> : <Navbar session={session} />}
    </MemoryRouter>,
  );
  const nav = screen.getByRole('navigation');
  const button = within(nav).getByRole('button', { name: 'Dark mode' });
  const menu = document.getElementById(entry === 'public' ? 'public-menu' : 'authenticated-menu');
  expect(menu).toHaveClass('hidden');
  expect(menu.contains(button)).toBe(false);
  await userEvent.setup().click(button);
  expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement).toHaveClass('dark');
});
