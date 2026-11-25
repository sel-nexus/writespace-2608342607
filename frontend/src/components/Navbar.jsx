/** Offer role-aware navigation and explicit, failure-aware logout. */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { clearSession, roleHome } from '../utils/auth';
import { ThemeToggle } from './ThemeToggle';

const focus = 'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-300';

/** Render authenticated navigation with accessible mobile and account disclosures.
 * Args:
 *   session: Validated identity supplied by the app.
 *   onSessionChange: Refresh the app identity after successful logout.
 *   theme: Current shared theme, defaulting to light for standalone navigation.
 *   onToggleTheme: Ask the application to switch its preference.
 * Returns:
 *   Sticky header with role links and storage failure feedback.
 */
export function Navbar({ session, onSessionChange, theme = 'light', onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  /** Close disclosures on Escape and return focus to their trigger. */
  function handleEscape(event) {
    if (event.key !== 'Escape') return;
    const trigger = accountOpen ? 'account-trigger' : 'navigation-trigger';
    setAccountOpen(false);
    setMenuOpen(false);
    event.currentTarget.querySelector(`#${trigger}`)?.focus();
  }

  /** Clear persistent identity before announcing logout or navigating. */
  function logout() {
    try {
      clearSession();
      setError('');
      onSessionChange?.();
      navigate('/');
    } catch (cause) {
      setError(cause.message);
    }
  }

  if (!session) return null;
  const links = [['/blogs', 'All Blogs'], ['/write', 'Write']];
  if (session.role === 'admin') links.push(['/users', 'Users']);
  return (
    <header onKeyDown={handleEscape} className="sticky top-0 z-20 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <nav
        aria-label="Authenticated navigation"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        <Link to="/" aria-label="WriteSpace home" className={`${focus} font-serif text-2xl font-bold text-slate-900 dark:text-slate-100`}>
          WriteSpace
          <span className="text-orange-800 dark:text-orange-300">.</span>
        </Link>
        <button
          id="navigation-trigger"
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="authenticated-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`${focus} border border-slate-300 dark:border-slate-600 p-3 sm:hidden`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div
          id="authenticated-menu"
          className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-3 sm:flex sm:w-auto sm:flex-row sm:items-center`}
        >
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${focus} px-4 py-2.5 font-medium ${
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </NavLink>
          ))}
          <div className="relative">
            <button
              id="account-trigger"
              type="button"
              aria-label={`Account options for ${session.displayName}`}
              aria-expanded={accountOpen}
              aria-controls="account-options"
              onClick={() => setAccountOpen(!accountOpen)}
              className={`${focus} flex max-w-full items-center gap-2 px-3 py-2 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700`}
            >
              <Avatar role={session.role} />
              <span className="max-w-40 truncate font-medium">{session.displayName}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div
              id="account-options"
              hidden={!accountOpen}
              className="absolute right-0 z-30 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-lg"
            >
              <Link
                to={roleHome(session.role)}
                className={`${focus} block px-4 py-3 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700`}
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className={`${focus} w-full px-4 py-3 text-left text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      {error && (
        <p role="alert" className="mx-auto max-w-6xl px-4 pb-3 text-sm text-red-700 dark:text-red-300">{error}</p>
      )}
    </header>
  );
}

Navbar.propTypes = {
  theme: PropTypes.oneOf(['light', 'dark']),
  onToggleTheme: PropTypes.func,
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['admin', 'user']).isRequired,
  }),
  onSessionChange: PropTypes.func,
};
