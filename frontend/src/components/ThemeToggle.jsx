/** Offer the same native theme action in both navigation surfaces. */
import PropTypes from 'prop-types';

/** Render a keyboard-operable action with visible focus in either theme.
 * Args:
 *   theme: Current root-owned preference.
 *   onToggle: Ask the root to switch its preference.
 * Returns:
 *   A named native button that retains browser keyboard behavior.
 */
export function ThemeToggle({ theme = 'light', onToggle }) {
  const action = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={action}
      className={'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium '
        + 'text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 '
        + 'focus-visible:ring-orange-700 focus-visible:ring-offset-2 dark:border-slate-600 '
        + 'dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 '
        + 'dark:focus-visible:ring-orange-300 dark:focus-visible:ring-offset-slate-800'}
    >
      {action}
    </button>
  );
}

ThemeToggle.propTypes = {
  theme: PropTypes.oneOf(['light', 'dark']),
  onToggle: PropTypes.func,
};
