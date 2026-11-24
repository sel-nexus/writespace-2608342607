/** Persist non-sensitive browser-local records with guarded reads and explicit write failures.
 *
 * Notes:
 *   Accounts contain plaintext demo passwords. Never store real passwords here.
 *   Reads discard malformed entries without changing the stored collection.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Check that a required text value contains meaningful content.
 * Args:
 *   value: Candidate field from browser storage.
 * Returns:
 *   Whether the field is a nonempty string.
 */
function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Check an ISO creation timestamp before sorting or formatting it.
 * Args:
 *   value: Candidate creation date.
 * Returns:
 *   Whether the timestamp has an ISO shape and represents a valid date.
 */
function isDate(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}

/** Validate every required field in a locally persisted post.
 * Args:
 *   post: Candidate post record.
 * Returns:
 *   Whether the record can be safely consumed by post views.
 */
function isPost(post) {
  return post !== null && typeof post === 'object' && !Array.isArray(post)
    && isText(post.id) && UUID.test(post.id) && isText(post.title) && isText(post.content)
    && isDate(post.createdAt)
    && isText(post.authorId) && (post.authorId === 'default-admin' || UUID.test(post.authorId))
    && isText(post.authorName);
}

/** Validate every required field in a local demo account.
 * Args:
 *   user: Candidate account record.
 * Returns:
 *   Whether the account matches the local account schema.
 */
function isUser(user) {
  return user !== null && typeof user === 'object' && !Array.isArray(user)
    && isText(user.id) && UUID.test(user.id) && isText(user.displayName) && isText(user.username)
    && isText(user.password) && ['admin', 'user'].includes(user.role)
    && isDate(user.createdAt);
}

/** Read a collection without allowing corrupt or unavailable storage to crash a view.
 * Args:
 *   key: Browser storage collection name.
 *   validate: Predicate for individual records.
 * Returns:
 *   Valid records, or an empty array when storage cannot be read.
 */
function readCollection(key, validate) {
  try {
    const records = JSON.parse(globalThis.localStorage.getItem(key) ?? '[]');
    return Array.isArray(records) ? records.filter(validate) : [];
  } catch {
    return [];
  }
}

/** Save a validated collection or report why persistence failed.
 * Args:
 *   key: Browser storage collection name.
 *   records: Complete replacement collection.
 *   validate: Predicate for individual records.
 *   label: Human-readable collection label for errors.
 * Raises:
 *   Error: If records are malformed or browser storage cannot accept the write.
 */
function saveCollection(key, records, validate, label) {
  if (!Array.isArray(records) || !records.every(validate)) {
    throw new Error(`Cannot save ${label}: invalid records.`);
  }
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(records));
  } catch (cause) {
    throw new Error(`Unable to save ${label}. Browser storage is unavailable or full. Your changes were not saved.`, { cause });
  }
}

/** Get valid posts from this browser.
 * Returns:
 *   Local post records, falling back to an empty collection.
 */
export function getPosts() {
  return readCollection('writespace_posts', isPost);
}

/** Replace the local post collection after validation.
 * Args:
 *   arr: Complete post collection to persist.
 * Raises:
 *   Error: If records are invalid or storage cannot save them.
 */
export function savePosts(arr) {
  saveCollection('writespace_posts', arr, isPost, 'posts');
}

/** Get valid demo accounts from this browser.
 * Returns:
 *   Local account records, falling back to an empty collection.
 */
export function getUsers() {
  return readCollection('writespace_users', isUser);
}

/** Replace local demo accounts without concealing a failed write.
 * Args:
 *   arr: Complete account collection, containing only demo passwords.
 * Raises:
 *   Error: If records are invalid or storage cannot save them.
 */
export function saveUsers(arr) {
  saveCollection('writespace_users', arr, isUser, 'accounts');
}
