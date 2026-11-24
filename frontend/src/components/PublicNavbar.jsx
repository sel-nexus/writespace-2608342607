/** Present public navigation without reading or owning authentication state. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';

const roleStyles = { admin: 'bg-violet-600', user: 'bg-indigo-500' };

/** Render guest actions or the supplied visitor's role home.
 * Args:
 *   session: Validated visitor identity supplied by the application, or null.
 * Returns:
 *   Sticky navigation with an accessible small-screen disclosure.
 */
export function PublicNavbar({ session = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = Boolean(
    session && roleStyles[session.role]
    && typeof session.displayName === 'string' && session.displayName.trim(),
  );

  /** Close the mobile disclosure after choosing a destination. */
  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white shadow-sm">
      <nav
        aria-label="Public navigation"
        className={'mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between '
          + 'gap-4 px-4 py-3 sm:px-6'}
      >
        <Link
          to="/"
          aria-label="WriteSpace home"
          onClick={closeMenu}
          className={'rounded-lg font-serif text-2xl font-bold tracking-tight text-slate-900 '
            + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700'}
        >
          WriteSpace
          <span className="text-orange-800">.</span>
        </Link>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="public-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          className={'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 '
            + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 sm:hidden'}
        >
          {menuOpen ? 'Close menu' : 'Open menu'}
        </button>
        <div
          id="public-menu"
          className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-3 `
            + 'sm:flex sm:w-auto sm:flex-row sm:items-center'}
        >
          {signedIn ? (
            <>
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-800">
                <Avatar role={session.role} />
                <span className="max-w-48 truncate">
                  {session.displayName}
                </span>
              </span>
              <Link
                to={session.role === 'admin' ? '/admin' : '/blogs'}
                onClick={closeMenu}
                className={'rounded-full bg-orange-800 px-5 py-2.5 text-center text-sm font-semibold '
                  + 'text-white transition-colors hover:bg-orange-900 focus-visible:outline-none '
                  + 'focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 '
                  + 'motion-reduce:transition-none'}
              >
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={closeMenu}
                className={'rounded-full px-4 py-2.5 text-center text-sm font-semibold text-slate-800 '
                  + 'hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700'}
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeMenu}
                className={'rounded-full bg-orange-800 px-5 py-2.5 text-center text-sm font-semibold '
                  + 'text-white transition-colors hover:bg-orange-900 focus-visible:outline-none '
                  + 'focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 '
                  + 'motion-reduce:transition-none'}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

PublicNavbar.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string,
    username: PropTypes.string,
    displayName: PropTypes.string,
    role: PropTypes.string,
  }),
};
