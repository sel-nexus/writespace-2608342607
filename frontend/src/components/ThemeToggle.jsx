/** Expose the shared appearance as a native keyboard-operable toggle. */
import PropTypes from 'prop-types';

/** Render a controlled toggle without owning storage or application state.
 * Args:
 *   theme: The current application appearance.
 *   onToggle: Request the opposite appearance from the application.
 * Returns:
 *   A named button exposing whether dark appearance is enabled.
 */
export function ThemeToggle({ theme = 'light', onToggle }) {
  return (
    <button
      type="button"
      aria-label="Dark mode"
      aria-pressed={theme === 'dark'}
      onClick={onToggle}
      className={'shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm '
        + 'font-medium text-slate-800 transition-colors hover:bg-slate-100 '
        + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 '
        + 'focus-visible:ring-offset-2 dark:border-slate-500 dark:bg-slate-900 '
        + 'dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-orange-400 '
        + 'dark:focus-visible:ring-offset-slate-900 motion-reduce:transition-none'}
    >
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}

ThemeToggle.propTypes = {
  theme: PropTypes.oneOf(['light', 'dark']),
  onToggle: PropTypes.func,
};
