/** Compose and edit required plain-text writing without losing failed submissions. */
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getSession } from '../utils/auth';
import { getPosts } from '../utils/storage';
import { canManagePost, createPost, updatePost, validatePost } from '../utils/posts';

/** Render a shared create/edit form with accessible validation and safe cancellation.
 * Returns:
 *   Writing form, missing state, or access redirect.
 */
export default function WriteBlog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const post = id ? getPosts().find((entry) => entry.id === id) : null;
  const [fields, setFields] = useState(() => ({ title: post?.title ?? '', content: post?.content ?? '' }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const current = id ? getPosts().find((entry) => entry.id === id) : null;
    setFields({ title: current?.title ?? '', content: current?.content ?? '' });
    setErrors({});
    setError('');
  }, [id]);

  /** Save only validated writing and navigate only after persistence succeeds. */
  function submit(event) {
    event.preventDefault();
    const nextErrors = validatePost(fields);
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;
    try {
      const saved = id ? updatePost(id, fields) : createPost(fields);
      navigate(`/blog/${saved.id}`);
    } catch (cause) {
      setError(cause.message);
    }
  }

  /** Go back within SPA history, falling back to the collection on direct entry. */
  function cancel() {
    if (Number.isInteger(window.history.state?.idx) && window.history.state.idx > 0) navigate(-1);
    else navigate('/blogs');
  }

  if (!session && !error) return <Navigate to="/login" replace />;
  if (id && post && !canManagePost(post, session) && !error) return <Navigate to="/blogs" replace />;
  return (
    <main id="main-content" className="dark:text-slate-100 min-h-[calc(100dvh-64px)] bg-slate-50 px-4 py-12 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        {id && !post && !error ? (
          <>
            <h1 className="font-serif text-4xl font-bold">Post not found</h1>
            <Link to="/blogs" className="mt-6 inline-block rounded-lg p-2 text-orange-800 focus-visible:ring-2 dark:text-orange-300">
              Back to All Posts
            </Link>
          </>
        ) : (
          <>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-orange-800 dark:text-orange-300">Room for your words</p>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">{id ? 'Edit Post' : 'Write a Post'}</h1>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Plain text, saved in this browser. Use only non-sensitive demo writing.</p>
            <form
              onSubmit={submit}
              noValidate
              className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900"
            >
              <label htmlFor="post-title" className="block font-medium">Title</label>
              <input
                id="post-title"
                name="title"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'title-error' : undefined}
                value={fields.title}
                onChange={(event) => setFields({ ...fields, title: event.target.value })}
                className={'mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 '
                + 'focus:outline-none focus:ring-2 focus:ring-orange-700 dark:border-slate-500 '
                  + 'dark:focus:ring-orange-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400'}
              />
              {errors.title && (
                <p id="title-error" role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{errors.title}</p>
              )}
              <label htmlFor="post-content" className="mt-6 block font-medium">Content</label>
              <textarea
                id="post-content"
                name="content"
                required
                aria-required="true"
                aria-invalid={Boolean(errors.content)}
                aria-describedby={errors.content ? 'content-error content-counter' : 'content-counter'}
                value={fields.content}
                onChange={(event) => setFields({ ...fields, content: event.target.value })}
                className={'mt-2 min-h-64 w-full resize-y rounded-lg border border-slate-300 px-4 py-3 leading-relaxed '
                  + 'focus:outline-none focus:ring-2 focus:ring-orange-700 dark:focus:ring-orange-400 '
                  + 'dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400'}
              />
              {errors.content && (
                <p id="content-error" role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{errors.content}</p>
              )}
              <p id="content-counter" className="mt-2 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                {fields.content.length} characters
              </p>
              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
              )}
              <div className="mt-6 flex flex-col gap-3 md:flex-row">
                <button
                  type="submit"
                  className={'rounded-full bg-orange-800 px-6 py-3 font-semibold text-white hover:bg-orange-900 '
                    + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 '
                  + 'focus-visible:ring-offset-2 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-slate-900'}
                >
                  {id ? 'Save Changes' : 'Publish Post'}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className={'rounded-lg px-4 py-2 font-medium text-slate-600 '
                + 'hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-400 '
                  + 'dark:text-slate-400 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-400'}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
