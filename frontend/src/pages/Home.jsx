/** Show the browser-local writing collection, newest first. */
import { Link, Navigate } from 'react-router-dom';
import { BlogCard } from '../components/BlogCard';
import { getSession } from '../utils/auth';
import { getPosts } from '../utils/storage';

/** Render the responsive list and a purposeful empty state.
 * Returns:
 *   Authenticated post grid or a guest redirect.
 */
export default function Home() {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  const posts = getPosts().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <main id="main-content" className="min-h-[calc(100dvh-64px)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-orange-800">The local collection</p>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">All Blogs</h1>
            <p className="mt-4 text-slate-600">A little space for every thought. Saved only in this browser.</p>
          </div>
          <Link
            to="/write"
            className={'rounded-full bg-orange-800 px-6 py-3 text-center font-semibold text-white hover:bg-orange-900 '
              + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2'}
          >
            Write New Post
          </Link>
        </div>
        {posts.length === 0 ? (
          <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12">
            <span aria-hidden="true" className="mb-6 block h-2 w-12 rounded-full bg-amber-400" />
            <h2 className="font-serif text-2xl font-bold">No blogs yet. Be the first to write one!</h2>
            <p className="mt-3 text-slate-600">Your next idea starts with a blank page.</p>
            <Link to="/write" className="mt-6 inline-block rounded-lg p-2 font-semibold text-orange-800 focus-visible:ring-2">
              Write your first post
            </Link>
          </section>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <BlogCard key={post.id} post={post} index={index} session={session} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
