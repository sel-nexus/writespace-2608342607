/** Create and remove local demo accounts while retaining their writing. */
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getSession } from '../utils/auth';
import { createAccount, deleteAccount, listAccounts, validateAccount } from '../utils/accounts';
import { UserRow } from '../components/UserRow';

const emptyFields = { displayName: '', username: '', password: '', role: 'user' };

/** Render accessible account creation and responsive account inventory.
 * Returns:
 *   Administrator management page or a fail-closed redirect.
 */
export default function UserManagement() {
  const [fields, setFields] = useState({ ...emptyFields });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const accounts = listAccounts();
  const session = getSession();

  /** Validate and persist an account, announcing success only after the actual write. */
  function submit(event) {
    event.preventDefault();
    setStatus('');
    setError('');
    const nextErrors = validateAccount(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      const saved = createAccount(fields);
      setFields({ ...emptyFields });
      setStatus(`Account ${saved.username} created.`);
    } catch (cause) {
      setErrors(cause.fields ?? {});
      if (!cause.fields) setError(cause.message);
    }
  }

  /** Confirm removal before freshly checking administrator and account protection. */
  function remove(account) {
    setStatus('');
    setError('');
    if (!window.confirm(`Delete account ${account.username}? Their posts will be retained.`)) return;
    try {
      deleteAccount(account.id);
      setStatus(`Account ${account.username} deleted. Posts retained.`);
    } catch (cause) {
      setError(cause.message);
    }
  }

  /** Update the controlled field without changing input identity or blocking paste. */
  function change(event) {
    setFields({ ...fields, [event.target.name]: event.target.value });
  }

  if (!error && !session) return <Navigate to="/login" replace />;
  if (!error && session.role !== 'admin') return <Navigate to="/blogs" replace />;
  return (
    <main
      id="main-content"
      className="min-h-[calc(100dvh-64px)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-10 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <Link
          to="/admin"
          className="rounded text-orange-800 dark:text-orange-300 focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-slate-950"
        >
          Back to Dashboard
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-orange-800 dark:text-orange-300">People behind the words</p>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">User Management</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-slate-600 dark:text-slate-300">
          Local accounts for this browser only. Deleting an account retains its posts and author name.
        </p>
        <form
          onSubmit={submit}
          noValidate
          className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-8"
        >
          <h2 className="font-serif text-2xl font-bold">Create User</h2>
          <p
            id="demo-password-warning"
            className="mt-2 text-sm text-slate-600 dark:text-slate-300"
          >
            Passwords are plaintext demo data. Never use real passwords.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {['displayName', 'username', 'password'].map((key) => (
              <div key={key}>
                <label htmlFor={`account-${key}`} className="block font-medium">
                  {{ displayName: 'Display Name', username: 'Username', password: 'Password' }[key]}
                </label>
                <input
                  id={`account-${key}`}
                  name={key}
                  type={key === 'password' ? 'password' : 'text'}
                  autoComplete={key === 'password' ? 'new-password' : 'off'}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(errors[key])}
                  aria-describedby={errors[key] ? `account-error-${key}` : key === 'password' ? 'demo-password-warning' : undefined}
                  value={fields[key]}
                  onChange={change}
                  className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-700 dark:focus:ring-orange-400"
                />
                {errors[key] && (
                  <p id={`account-error-${key}`} role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{errors[key]}</p>
                )}
              </div>
            ))}
            <div>
              <label htmlFor="account-role" className="block font-medium">Role</label>
              <select
                id="account-role"
                name="role"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.role)}
                aria-describedby={errors.role ? 'account-error-role' : undefined}
                value={fields.role}
                onChange={change}
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-700 dark:focus:ring-orange-400"
              >
                <option value="admin">Admin</option>
                <option value="user">user</option>
              </select>
              {errors.role && (
                <p id="account-error-role" role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{errors.role}</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="mt-6 rounded-full bg-orange-800 px-6 py-3 font-semibold text-white hover:bg-orange-900 focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-slate-950"
          >
            Create User
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 dark:bg-red-950 p-4 text-red-700 dark:text-red-300">{error}</p>
        )}
        <p role="status" aria-live="polite" className="mt-4 text-sm text-teal-800 dark:text-teal-300">{status}</p>
        <section aria-labelledby="accounts-heading" className="mt-10">
          <h2 id="accounts-heading" className="font-serif text-3xl font-bold">All Accounts</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Includes the permanently available built-in administrator.</p>
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sm:block">
            <table className="w-full text-left">
              <caption className="sr-only">Local accounts including built-in administrator</caption>
              <thead className="bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                <tr>
                  {['Display Name', 'Username', 'Role', 'Created', 'Actions'].map((label) => (
                    <th key={label} scope="col" className="px-4 py-3">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <UserRow key={account.id} account={account} currentId={session?.userId} onDelete={remove} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 space-y-4 sm:hidden">
            {accounts.map((account) => (
              <UserRow key={account.id} account={account} currentId={session?.userId} onDelete={remove} mobile />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
