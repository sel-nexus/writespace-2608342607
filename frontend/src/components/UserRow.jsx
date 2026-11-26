/** Present account details as semantic desktop rows or mobile cards. */
import PropTypes from 'prop-types';
import { Avatar } from './Avatar';
import { formatPostDate } from '../utils/posts';

const badges = {
  admin: 'bg-violet-100 text-violet-700 ring-violet-300 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-500',
  user: 'bg-indigo-100 text-indigo-700 ring-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:ring-indigo-500',
};

/** Render an account with explained default/current deletion protection.
 * Args:
 *   account: Account metadata, never rendered credentials.
 *   currentId: Current canonical identity for deletion presentation.
 *   onDelete: Request parent-owned confirmation and freshly authorized mutation.
 *   mobile: Render a stacked card rather than a table row.
 * Returns:
 *   Responsive account details and an eligible or disabled delete action.
 */
export function UserRow({ account, currentId, onDelete, mobile = false }) {
  const reason = account.id === 'default-admin' ? 'Default admin cannot be deleted.'
    : account.id === currentId ? 'Your current account cannot be deleted.' : '';
  const date = account.id === 'default-admin' ? 'Built-in' : formatPostDate(account.createdAt);
  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar role={account.role} />
      <span className="min-w-0 break-words font-semibold text-slate-900 dark:text-slate-100">{account.displayName}</span>
    </div>
  );
  const badge = (
    <span className={`inline-flex rounded-full px-3 py-0.5 text-sm font-medium ring-1 ${badges[account.role]}`}>
      {account.role === 'admin' ? 'Admin' : 'user'}
    </span>
  );
  const action = (
    <div>
      <button
        type="button"
        aria-label={`Delete ${account.username}`}
        disabled={Boolean(reason)}
        title={reason || undefined}
        aria-describedby={reason ? `protect-${mobile ? 'mobile' : 'table'}-${account.id}` : undefined}
        onClick={() => onDelete(account)}
        className={'rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100 '
          + 'focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60 '
          + 'dark:bg-red-950 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900 '
          + 'dark:focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 '
          + 'dark:disabled:bg-slate-800 dark:disabled:text-slate-400 dark:disabled:border-slate-700 dark:disabled:opacity-100'}
      >
        Delete
      </button>
      {reason && (
        <p id={`protect-${mobile ? 'mobile' : 'table'}-${account.id}`} className="mt-2 max-w-48 text-xs text-slate-600 dark:text-slate-400">
          {reason}
        </p>
      )}
    </div>
  );
  if (mobile) {
    return (
      <article
        aria-label={`Account ${account.username}`}
        className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
      >
        {identity}
        <dl className="my-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-slate-600 dark:text-slate-400">Username</dt>
          <dd className="min-w-0 break-words">{account.username}</dd>
          <dt className="text-slate-600 dark:text-slate-400">Role</dt>
          <dd>{badge}</dd>
          <dt className="text-slate-600 dark:text-slate-400">Created</dt>
          <dd>{date}</dd>
        </dl>
        {action}
      </article>
    );
  }
  return (
    <tr className="border-t border-slate-200 dark:border-slate-700">
      <th scope="row" className="max-w-64 px-4 py-4 text-left">{identity}</th>
      <td className="max-w-48 break-words px-4 py-4">{account.username}</td>
      <td className="px-4 py-4">{badge}</td>
      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{date}</td>
      <td className="px-4 py-4">{action}</td>
    </tr>
  );
}

UserRow.propTypes = {
  account: PropTypes.shape({
    id: PropTypes.string.isRequired, displayName: PropTypes.string.isRequired, username: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['admin', 'user']).isRequired, createdAt: PropTypes.string,
  }).isRequired,
  currentId: PropTypes.string, onDelete: PropTypes.func.isRequired, mobile: PropTypes.bool,
};
