/** Review local writing and accounts with freshly authorized destructive actions. */
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getSession } from '../utils/auth';
import { getAccountStats } from '../utils/accounts';
import { getPosts } from '../utils/storage';
import { deletePost, formatPostDate, getAuthorRole } from '../utils/posts';
import { Avatar } from '../components/Avatar';
import { StatCard } from '../components/StatCard';

/** Render real totals, five newest posts and content/account shortcuts.
 * Returns:
 *   Administrator overview or a role-aware redirect.
 */
export default function AdminDashboard() {
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const session = getSession();
  const stats = getAccountStats();
  const recent = getPosts().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);

  /** Confirm deletion, recheck administrator access, then use the shared post helper. */
  function remove(post) {
    setError('');
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      if (getSession()?.role !== 'admin') throw new Error('Administrator access required. Your changes were not saved.');
      deletePost(post.id);
      setRevision(revision + 1);
    } catch (cause) {
      setError(cause.message);
    }
  }

  if (!error && !session) return <Navigate to="/login" replace />;
  if (!error && session.role !== 'admin') return <Navigate to="/blogs" replace />;
  return (
    <main id="main-content" className="min-h-[calc(100dvh-64px)] bg-slate-50 px-4 py-10 sm:px-6 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className={
            'rounded-2xl bg-gradient-to-br from-orange-900 to-orange-800 p-6 text-white sm:p-10 dark:from-orange-950 '
            + 'dark:to-orange-900'
          }>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">The editorial desk</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Admin Dashboard</h1>
          <p className="mt-4 max-w-xl leading-relaxed text-orange-100">A clear view of your local writing space. All data stays in this browser.</p>
        </header>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Posts" value={stats.posts} subtitle="All locally saved posts" color="indigo" />
          <StatCard label="Total Users" value={stats.accounts} subtitle="All accounts, including built-in admin" color="violet" />
          <StatCard label="Total Admins" value={stats.admins} subtitle="Administrators, including built-in admin" color="pink" />
          <StatCard label="Total users" value={stats.users} subtitle="Regular users only, excluding admins" color="teal" />
        </div>
        <nav aria-label="Admin quick actions" className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/write"
            className={
            'rounded-full bg-orange-800 px-6 py-3 text-center font-semibold text-white hover:bg-orange-900 '
            + 'focus-visible:ring-2 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-2 '
            + 'dark:focus-visible:ring-offset-slate-950'
          }
          >
            Write New Post
          </Link>
          <Link
            to="/users"
            className={
            'rounded-full border border-orange-200 bg-white px-6 py-3 text-center font-semibold text-orange-800 '
            + 'focus-visible:ring-2 dark:border-orange-700 dark:bg-slate-900 dark:text-orange-300 '
            + 'dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-2 '
            + 'dark:focus-visible:ring-offset-slate-900'
          }
          >
            Manage Users
          </Link>
        </nav>
        <section aria-labelledby="recent-heading" className="mt-10">
          <h2 id="recent-heading" className="font-serif text-3xl font-bold">Recent Posts</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">The five newest posts, newest first.</p>
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
          )}
          {recent.length === 0 && (
            <p className={
            'mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600 dark:border-slate-500 '
            + 'dark:bg-slate-900 dark:text-slate-400'
          }>
              No posts yet. Make room for the first thought.
            </p>
          )}
          <div className="mt-6 space-y-3">
            {recent.map((post) => (
              <article key={post.id} className={
            'flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center '
            + 'dark:border-slate-700 dark:bg-slate-900'
          }>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-xl font-semibold">
                    <Link to={`/blog/${post.id}`} className={
            'rounded text-slate-900 hover:text-orange-800 focus-visible:ring-2 dark:text-slate-100 '
            + 'dark:hover:text-orange-200 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-2 '
            + 'dark:focus-visible:ring-offset-slate-900'
          }>{post.title}</Link>
                  </h3>
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Avatar role={getAuthorRole(post)} />
                    <span className="min-w-0 break-words">{post.authorName} · {formatPostDate(post.createdAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-3">
                  <Link to={`/edit/${post.id}`} aria-label={`Edit ${post.title}`} className={
            'rounded-lg px-4 py-2 text-orange-800 focus-visible:ring-2 dark:text-orange-300 '
            + 'dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-2 '
            + 'dark:focus-visible:ring-offset-slate-900'
          }>
                    Edit
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${post.title}`}
                    onClick={() => remove(post)}
                    className={
            'rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100 focus-visible:ring-2 '
            + 'dark:border-red-700 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 '
            + 'dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-2 '
            + 'dark:focus-visible:ring-offset-slate-900'
          }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
