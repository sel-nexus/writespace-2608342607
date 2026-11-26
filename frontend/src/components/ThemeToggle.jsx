/** Expose the shared appearance as a native keyboard-operable icon toggle. */
import PropTypes from 'prop-types';

const iconProps = {
  'aria-hidden': 'true',
  viewBox: '0 0 24 24',
  className: 'h-5 w-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** Render a controlled icon toggle without owning storage or application state.
 * Args:
 *   theme: The current application appearance.
 *   onToggle: Request the opposite appearance from the application.
 * Returns:
 *   A named icon button exposing whether dark appearance is enabled.
 */
export function ThemeToggle({ theme = 'light', onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      aria-label="Dark mode"
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={onToggle}
      className={'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border '
        + 'border-slate-300 bg-white text-slate-800 transition-colors hover:bg-slate-100 '
        + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 '
        + 'focus-visible:ring-offset-2 dark:border-slate-500 dark:bg-slate-900 '
        + 'dark:text-slate-100 dark:hover:bg-slate-800 dark:focus-visible:ring-orange-400 '
        + 'dark:focus-visible:ring-offset-slate-900 motion-reduce:transition-none'}
    >
      <svg {...iconProps} data-theme-icon={isDark ? 'moon' : 'sun'}>
        {isDark ? (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        )}
      </svg>
    </button>
  );
}

ThemeToggle.propTypes = {
  theme: PropTypes.oneOf(['light', 'dark']),
  onToggle: PropTypes.func,
};
