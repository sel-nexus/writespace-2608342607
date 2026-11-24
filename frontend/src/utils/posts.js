/** Manage non-sensitive local posts with fresh identity and non-destructive collection checks.
 * Notes:
 *   Client-only ownership is demo behavior, not security against storage tampering.
 */
import { getSession } from './auth';
import { getPosts, getUsers, savePosts } from './storage';

/** Validate required writing without trimming the saved text.
 * Args:
 *   fields: Candidate title and content.
 * Returns:
 *   Field-keyed errors, empty for valid writing.
 */
export function validatePost(fields) {
  const errors = {};
  for (const key of ['title', 'content']) {
    if (typeof fields?.[key] !== 'string' || !fields[key].trim()) errors[key] = 'This field is required.';
  }
  return errors;
}

/** Check a post against a validated identity for presentation or mutation.
 * Args:
 *   post: Existing post.
 *   session: Canonical identity, defaulting to a fresh read.
 * Returns:
 *   Whether this identity can manage the post.
 */
export function canManagePost(post, session = getSession()) {
  return Boolean(post && session && (session.role === 'admin'
    || (session.role === 'user' && session.userId === post.authorId)));
}

/** Resolve the author's current role while retaining orphaned author names.
 * Args:
 *   post: Existing post.
 * Returns:
 *   Administrator or user role; deleted authors fall back to a book avatar.
 */
export function getAuthorRole(post) {
  if (post?.authorId === 'default-admin') return 'admin';
  return getUsers().find((user) => user.id === post?.authorId)?.role ?? 'user';
}

/** Format a creation date consistently across time zones.
 * Args:
 *   createdAt: Stored creation timestamp.
 * Returns:
 *   English month, two-digit day and year, or an unavailable label.
 */
export function formatPostDate(createdAt) {
  if (!Number.isFinite(Date.parse(createdAt))) return 'Date unavailable';
  return new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC',
  });
}

/** Read the entire valid collection rather than overwriting filtered corrupt records.
 * Returns:
 *   Complete uniquely identified posts.
 * Raises:
 *   Error: If any stored data is unreadable, malformed or duplicated.
 */
function readCompletePosts() {
  try {
    const raw = JSON.parse(globalThis.localStorage.getItem('writespace_posts') ?? '[]');
    const posts = getPosts();
    if (!Array.isArray(raw) || JSON.stringify(raw) !== JSON.stringify(posts)
      || new Set(posts.map((post) => post.id)).size !== posts.length) throw new Error('Invalid posts');
    return posts;
  } catch (cause) {
    throw new Error('Unable to read local posts. Existing data was not changed.', { cause });
  }
}

/** Require a fresh canonical session at mutation time.
 * Returns:
 *   Current identity.
 * Raises:
 *   Error: If the session or its backing account is missing or invalid.
 */
function requireSession() {
  const session = getSession();
  if (!session) throw new Error('Please sign in again. Your changes were not saved.');
  return session;
}

/** Reject incomplete writing before any persistence.
 * Args:
 *   fields: Candidate title and content.
 * Raises:
 *   Error: If either field is blank or not text.
 */
function requireFields(fields) {
  if (Object.keys(validatePost(fields)).length) throw new Error('Title and content are required.');
}

/** Create a post attributed only to the current canonical identity.
 * Args:
 *   fields: Required title and content; other supplied metadata is ignored.
 * Returns:
 *   Persisted post with UUID and creation timestamp.
 * Raises:
 *   Error: For invalid writing, identity, unsafe reads or failed persistence.
 */
export function createPost(fields) {
  const session = requireSession();
  requireFields(fields);
  const posts = readCompletePosts();
  const post = {
    id: globalThis.crypto.randomUUID(), title: fields.title, content: fields.content,
    createdAt: new Date().toISOString(), authorId: session.userId, authorName: session.displayName,
  };
  if (posts.some((existing) => existing.id === post.id)) throw new Error('Unable to create a unique post. Please try again.');
  savePosts([...posts, post]);
  return post;
}

/** Change writing without changing the original author or timestamp.
 * Args:
 *   id: Post identifier.
 *   fields: Required replacement title and content.
 * Returns:
 *   Persisted updated post.
 * Raises:
 *   Error: For missing posts, denied identity, validation or storage failures.
 */
export function updatePost(id, fields) {
  const session = requireSession();
  const posts = readCompletePosts();
  const post = posts.find((entry) => entry.id === id);
  if (!post) throw new Error('Post not found');
  if (!canManagePost(post, session)) throw new Error('You cannot manage this post. Your changes were not saved.');
  requireFields(fields);
  const updated = { ...post, title: fields.title, content: fields.content };
  savePosts(posts.map((entry) => entry.id === id ? updated : entry));
  return updated;
}

/** Delete a post after the caller confirms, rechecking actual ownership.
 * Args:
 *   id: Post identifier.
 * Raises:
 *   Error: For missing posts, denied identity, unsafe reads or failed writes.
 */
export function deletePost(id) {
  const session = requireSession();
  const posts = readCompletePosts();
  const post = posts.find((entry) => entry.id === id);
  if (!post) throw new Error('Post not found');
  if (!canManagePost(post, session)) throw new Error('You cannot manage this post. Your changes were not saved.');
  savePosts(posts.filter((entry) => entry.id !== id));
}
