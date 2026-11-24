/** Introduce the local writing demo and preview only real browser-local posts. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getPosts } from '../utils/storage';

const features = [
  { title: 'Write Freely', description: 'Plain text. No distractions. Just a title, a blank page, and room for your thoughts.', style: 'bg-orange-50 border-orange-100' },
  { title: 'Private & Local', description: 'Your data lives in this browser, not on a server. Use only non-sensitive demo writing.', style: 'bg-slate-100 border-slate-200' },
  { title: 'Instant & Fast', description: 'No server, no lag. Write and read locally with quick, simple navigation.', style: 'bg-amber-50 border-amber-100' },
];

/** Render the public introduction and up to three newest local posts.
 * Args:
 *   session: Validated visitor identity, supplied by the application when available.
 * Returns:
 *   Editorial hero, features, local previews, and public footer links.
 * Notes:
 *   This demo never seeds posts or synchronizes them with other browsers.
 */
export default function LandingPage({ session = null }) {
  const [posts] = useState(() => getPosts().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3));
  const signedIn = Boolean(session && ['admin', 'user'].includes(session.role));

  return (
    <>
      <main id="main-content">
        <section aria-labelledby="hero-title" className="flex min-h-[calc(100dvh-64px)] items-center bg-slate-50">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.6fr_1fr] md:gap-8">
            <div>
              <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-orange-800">A place for your words</p>
              <h1 id="hero-title" className="break-words font-serif text-[clamp(3rem,7.5vw,6rem)] font-bold leading-[1.1] tracking-tight text-slate-900">
                WriteSpace
                <span className="text-orange-800">.</span>
              </h1>
              <p className="mt-6 max-w-md text-xl leading-relaxed text-slate-700 sm:text-2xl">Your thoughts. Your space. Beautifully simple.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="rounded-full bg-orange-800 px-6 py-3 text-center font-semibold text-white shadow-sm transition-colors hover:bg-orange-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 motion-reduce:transition-none">Get Started Free</Link>
                <Link to={signedIn ? '/blogs' : '/login'} className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2 motion-reduce:transition-none">Start Reading</Link>
              </div>
            </div>
            <aside aria-label="About this writing space" className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:mt-16 md:p-10">
              <span aria-hidden="true" className="mb-8 block h-2 w-12 rounded-full bg-amber-400" />
              <p className="font-serif text-3xl font-medium leading-snug text-slate-900">Make room for a thought worth keeping.</p>
              <p className="mt-6 text-base leading-relaxed text-slate-600">A simple browser-local writing demo. Not a shared publishing service, and not a secure place for private data.</p>
            </aside>
          </div>
        </section>
        <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="features-title" className="mb-8 font-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Less between you and the page.</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className={`rounded-2xl border p-7 ${feature.style}`}>
                <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-4 leading-relaxed text-slate-700">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section aria-labelledby="latest-title" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <h2 id="latest-title" className="font-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Latest from the Blog</h2>
          <p className="mt-3 text-slate-600">Writing saved in this browser. Sign in to read the full story.</p>
          {posts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12">
              <p className="text-lg font-medium text-slate-700">No posts yet — check back soon!</p>
              <p className="mt-3 text-sm text-slate-600">Local posts will appear here when you start writing.</p>
            </div>
          ) : (
            <div className="mt-8 divide-y divide-slate-200 border-t border-slate-200">
              {posts.map((post) => (
                <article key={post.id} className="grid grid-cols-1 gap-4 py-7 md:grid-cols-[10rem_1fr] md:gap-8">
                  <time dateTime={post.createdAt} className="text-sm text-slate-600">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' })}</time>
                  <div className="min-w-0">
                    <h3 className="font-serif text-2xl font-bold text-slate-900">
                      <Link to={`/blog/${post.id}`} className="break-words rounded-sm hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700">{post.title}</Link>
                    </h3>
                    <p className="mt-3 max-w-2xl break-words leading-relaxed text-slate-600">{post.content.slice(0, 120)}{post.content.length > 120 ? '…' : ''}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <footer className="bg-slate-900 text-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm">© {new Date().getFullYear()} WriteSpace</p>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-6 text-sm">
            <Link to="/" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Home</Link>
            <Link to="/blogs" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">All Blogs</Link>
            <Link to="/login" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Login</Link>
            <Link to="/register" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Register</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

LandingPage.propTypes = {
  session: PropTypes.shape({ role: PropTypes.string }),
};
