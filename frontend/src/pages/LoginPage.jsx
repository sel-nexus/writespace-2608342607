/** Present a local plaintext demo form with inline, accessible validation. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authenticate, getSession, roleHome } from '../utils/auth';

const inputStyle = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 '
  + 'focus:outline-none focus:ring-2 focus:ring-orange-700 focus:ring-offset-2 '
  + 'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-orange-400 dark:focus:ring-offset-slate-900';
const buttonStyle = 'w-full rounded-full bg-orange-800 px-5 py-3 font-semibold text-white shadow-sm '
  + 'hover:bg-orange-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 '
  + 'focus-visible:ring-offset-2 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-slate-900';

/** Validate input before attempting account and session persistence.
 * Args:
 *   onSessionChange: Refresh application identity only after successful persistence.
 * Returns:
 *   Local authentication form or existing session role-home redirect.
 */
export default function LoginPage({ onSessionChange }) {
  const [values, setValues] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const session = getSession();

  /** Keep the changed field controlled and preserve the other form values. */
  function change(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
  }

  /** Report validation and storage failures without a success navigation. */
  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    Object.entries(values).forEach(([key, value]) => {
      if (!value.trim()) nextErrors[key] = 'This field is required.';
    });

    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;
    try {
      const identity = authenticate(values.username, values.password);
      onSessionChange?.();
      navigate(roleHome(identity.role), { replace: true });
    } catch (cause) {
      setError(cause.message);
    }
  }

  if (session) return <Navigate to={roleHome(session.role)} replace />;
  return (
    <main id="main-content" className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 dark:text-slate-100">
      <section aria-labelledby="auth-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-slate-900">
        <Link to="/" aria-label="WriteSpace home" className="rounded-lg font-serif text-2xl font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 dark:text-slate-100 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-slate-900">
          WriteSpace
          <span className="text-orange-800 dark:text-orange-400">.</span>
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-orange-800 dark:text-orange-400">A place for your words</p>
        <h1 id="auth-title" className="mt-2 font-serif text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Welcome back.</h1>
        <p id="demo-warning" className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Browser-local demo only. Passwords are stored in plaintext. Never use real passwords or sensitive data.
        </p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Default admin: username admin, password admin.</p>
        <form onSubmit={submit} noValidate aria-describedby="demo-warning" className="mt-8 space-y-5">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.username || error)}
              aria-describedby={errors.username ? 'username-error' : error ? 'auth-error' : undefined}
              value={values.username}
              onChange={change}
              className={inputStyle}
            />
            {errors.username && (
              <p id="username-error" role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{errors.username}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.password || error)}
              aria-describedby={errors.password ? 'password-error' : error ? 'auth-error' : undefined}
              value={values.password}
              onChange={change}
              className={inputStyle}
            />
            {errors.password && (
              <p id="password-error" role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{errors.password}</p>
            )}
          </div>
          {error && (
            <p id="auth-error" role="alert" className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>
          )}
          <button type="submit" className={buttonStyle}>Login</button>
        </form>
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
          New to WriteSpace?
          <Link to="/register" className="ml-2 rounded-sm font-semibold text-orange-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 dark:text-orange-400 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-slate-900">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}

LoginPage.propTypes = { onSessionChange: PropTypes.func };
