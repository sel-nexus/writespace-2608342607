/** Present a plain-text local post preview with ownership-aware navigation. */
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { canManagePost, formatPostDate, getAuthorRole } from '../utils/posts';

const accents = ['border-indigo-500', 'border-violet-500', 'border-pink-500', 'border-teal-500'];

/** Render the first 120 characters, author, date and permitted edit link.
 * Args:
 *   post: Valid local post record.
 *   index: Position in the newest-first grid for accent cycling.
 *   session: Validated reader identity.
 * Returns:
 *   Accessible card with separate read and edit links.
 */
export function BlogCard({ post, index = 0, session = null }) {
  return (
    <article
      className={'min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 border-t-4 '
        + `bg-white dark:bg-slate-900 p-6 shadow-sm ${accents[index % 4]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className={
          'min-w-0 font-serif text-2xl font-bold text-slate-900 dark:text-slate-100'
        }>
          <Link
            to={`/blog/${post.id}`}
            className={
              'break-words rounded-sm hover:text-orange-800 dark:hover:text-orange-200 '
              + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 '
              + 'dark:focus-visible:ring-orange-400'
            }
          >
            {post.title}
          </Link>
        </h2>
        {canManagePost(post, session) && (
          <Link
            to={`/edit/${post.id}`}
            aria-label={`Edit ${post.title}`}
            className={
              'shrink-0 rounded-lg p-2 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 '
              + 'dark:hover:bg-indigo-950 focus-visible:ring-2 focus-visible:ring-indigo-500 '
              + 'dark:focus-visible:ring-indigo-400'
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5">
              <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z M14 5l5 5" />
            </svg>
          </Link>
        )}
      </div>
      <p className="mt-4 break-words leading-relaxed text-slate-600 dark:text-slate-300">{post.content.slice(0, 120)}</p>
      <div className={
        'mt-6 flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 pt-4'
      }>
        <Avatar role={getAuthorRole(post)} />
        <div className="min-w-0 text-sm">
          <p className="break-words font-medium text-slate-700 dark:text-slate-300">{post.authorName}</p>
          <time dateTime={post.createdAt} className="text-slate-600 dark:text-slate-300">{formatPostDate(post.createdAt)}</time>
        </div>
      </div>
    </article>
  );
}

BlogCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired, title: PropTypes.string.isRequired, content: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired, authorId: PropTypes.string.isRequired, authorName: PropTypes.string.isRequired,
  }).isRequired,
  index: PropTypes.number,
  session: PropTypes.shape({ userId: PropTypes.string, role: PropTypes.string }),
};
