/** Read full plain text and confirm ownership-aware local deletion. */
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { getSession } from '../utils/auth';
import { getPosts } from '../utils/storage';
import { canManagePost, deletePost, formatPostDate, getAuthorRole } from '../utils/posts';

/** Render a post or missing state without interpreting writing as markup.
 * Returns:
 *   Full post with permitted actions, missing message, or guest redirect.
 */
export default function ReadBlog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const session = getSession();
  const post = getPosts().find((entry) => entry.id === id);

  /** Confirm before rereading identity and collection in the mutation helper. */
  function removePost() {
    setError('');
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      deletePost(id);
      navigate('/blogs');
    } catch (cause) {
      setError(cause.message);
    }
  }

  if (!session && !error) return <Navigate to="/login" replace />;
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 text-slate-900 dark:text-slate-100">
      <Link
        to="/blogs" className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:text-orange-800 dark:hover:text-orange-200 focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
      >
        Back to All Posts
      </Link>
      {!post ? (
        <h1 className="mt-10 font-serif text-4xl font-bold">Post not found</h1>
      ) : (
        <article className="mx-auto mt-10 max-w-3xl">
          <span aria-hidden="true" className="mb-6 block h-2 w-12 rounded-full bg-amber-400" />
          <h1 className="break-words font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            {post.title}
          </h1>
          <div className="mt-6 flex items-center gap-3">
            <Avatar role={getAuthorRole(post)} />
            <div className="min-w-0 text-sm">
              <p className="break-words font-medium">{post.authorName}</p>
              <time dateTime={post.createdAt} className="text-slate-600 dark:text-slate-300">{formatPostDate(post.createdAt)}</time>
            </div>
          </div>
          <p className="mt-10 whitespace-pre-wrap break-words border-t border-slate-200 dark:border-slate-700 pt-8 text-lg leading-relaxed">
            {post.content}
          </p>
          {canManagePost(post, session) && (
            <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-200 dark:border-slate-700 pt-6">
              <Link
                to={`/edit/${id}`}
                className="rounded-lg border border-indigo-200 dark:border-indigo-700 px-4 py-2 font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={removePost}
                className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-2 font-medium text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                Delete
              </button>
            </div>
          )}
        </article>
      )}
      {error && (
        <p role="alert" className="mx-auto mt-6 max-w-3xl rounded-lg bg-red-50 dark:bg-red-950 p-4 text-red-700 dark:text-red-300">{error}</p>
      )}
    </main>
  );
}
