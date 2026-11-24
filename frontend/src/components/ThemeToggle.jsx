/** Offer the same accessible appearance action in every navigation shell. */
import { useEffect, useState } from 'react';
import { applyTheme, saveTheme } from '../utils/theme';

/** Reflect the initialized root appearance and persist explicit user choices.
 * Returns:
 *   A native keyboard-operable button whose pressed state denotes dark mode.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    applyTheme(dark ? 'dark' : 'light');
  }, [dark]);

  /** Change appearance immediately even when browser storage rejects the choice. */
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    saveTheme(next ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      aria-label="Dark mode"
      aria-pressed={dark}
      onClick={toggleTheme}
      className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border '
        + 'border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:outline-none '
        + 'focus-visible:ring-2 focus-visible:ring-orange-700 dark:border-slate-600 '
        + 'dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-orange-400'}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
      </svg>
    </button>
  );
}
