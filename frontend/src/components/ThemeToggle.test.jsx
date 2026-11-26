/** Verify native keyboard behavior and the controlled appearance contract. */
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

afterEach(cleanup);

/** Compose a real controlled parent for observable state transitions. */
function ControlledToggle() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
  );
}

describe('ThemeToggle', () => {
  it('defaults to a named unpressed light button and safely accepts no callback', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Dark mode', pressed: false });
    expect(button).toHaveTextContent('Light');
    expect(button).toHaveAttribute('type', 'button');
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
  it('reflects controlled props rather than creating independent state', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ThemeToggle theme="dark" />);
    const button = screen.getByRole('button', { name: 'Dark mode', pressed: true });
    expect(button).toHaveTextContent('Dark');
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    rerender(<ThemeToggle theme="light" />);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
  it('switches both ways by pointer without touching storage or submitting a form', async () => {
    const user = userEvent.setup();
    localStorage.setItem('writespace_theme', 'unchanged');
    render(<ControlledToggle />);
    const button = screen.getByRole('button', { name: 'Dark mode' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('writespace_theme')).toBe('unchanged');
    localStorage.removeItem('writespace_theme');
  });
  it('supports Tab, Enter and Space and retains focus through state changes', async () => {
    const user = userEvent.setup();
    render(<ControlledToggle />);
    const button = screen.getByRole('button', { name: 'Dark mode' });
    await user.tab();
    expect(button).toHaveFocus();
    expect(button).toHaveClass('focus-visible:ring-2', 'dark:focus-visible:ring-offset-slate-900');
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveFocus();
    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveFocus();
  });
});
