/** Verify native keyboard actions, names and focus treatment for the shared control. */
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

/** Supply real state to observe theme action results rather than callback counts. */
function ToggleHarness() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
  );
}

describe('ThemeToggle', () => {
  it('switches both ways by click with an updated action name', async () => {
    render(<ToggleHarness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  it('supports Tab, Enter and Space while retaining focus after switching', async () => {
    render(<ToggleHarness />);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toHaveFocus();
    expect(screen.getByRole('button')).toHaveClass('focus-visible:ring-2', 'dark:focus-visible:ring-orange-300', 'min-h-11');
  });

  it('defaults to a safe light-mode action without requiring a callback', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.setup().click(button);
    expect(button).toBeInTheDocument();
  });
});
