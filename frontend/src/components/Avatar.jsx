/** Present the explicitly specified static role emoji, without uploads. */
import PropTypes from 'prop-types';

const styles = { admin: 'bg-violet-600', user: 'bg-indigo-500' };

/** Return the role avatar, falling back to a book for unknown or orphaned authors.
 * Args:
 *   role: Account role when known.
 * Returns:
 *   Accessible, role-colored static avatar JSX.
 */
export function getAvatar(role) {
  const avatarRole = role === 'admin' ? 'admin' : 'user';
  return (
    <span
      role="img"
      aria-label={`${avatarRole} avatar`}
      className={`${styles[avatarRole]} inline-flex h-9 w-9 shrink-0 items-center justify-center `
        + 'rounded-full text-lg text-white dark:ring-1 dark:ring-slate-500'}
    >
      {avatarRole === 'admin' ? '👑' : '📚'}
    </span>
  );
}

/** Render the reusable role avatar.
 * Args:
 *   role: Account role or unknown author role.
 * Returns:
 *   Static role avatar.
 */
export function Avatar({ role }) {
  return getAvatar(role);
}

Avatar.propTypes = { role: PropTypes.string };
