/** Demonstrate browser-local identity; passwords are plaintext, never use real passwords.
 * Notes:
 *   Client-side guards are not security. Storage can be inspected or altered.
 */
import { getUsers, saveUsers } from './storage';

const SESSION_KEY = 'writespace_session';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_ADMIN = { userId: 'default-admin', username: 'admin', displayName: 'Admin', role: 'admin' };

/** Check meaningful required text. */
function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Read complete accounts without silently discarding corrupt data before a write.
 * Returns:
 *   Valid, uniquely identified accounts.
 * Raises:
 *   Error: When storage cannot be read completely and safely.
 */
function readAccounts() {
  try {
    const raw = JSON.parse(globalThis.localStorage.getItem('writespace_users') ?? '[]');
    const users = getUsers();
    if (!Array.isArray(raw) || JSON.stringify(raw) !== JSON.stringify(users)
      || new Set(users.map((user) => user.id)).size !== users.length
      || new Set(users.map((user) => user.username.toLowerCase())).size !== users.length
      || users.some((user) => user.username.trim() !== user.username || user.username.toLowerCase() === 'admin')) {
      throw new Error('Invalid accounts');
    }
    return users;
  } catch (cause) {
    throw new Error('Unable to read local accounts. Existing data was not changed.', { cause });
  }
}

/** Match a complete session to its actual account rather than trusting a claimed role.
 * Args:
 *   session: Candidate identity from browser storage.
 * Returns:
 *   Canonical identity, or null for any invalid claim.
 */
function validatedSession(session) {
  if (!session || typeof session !== 'object' || Array.isArray(session)
    || !['user', 'admin'].includes(session.role)
    || !['userId', 'username', 'displayName'].every((key) => isText(session[key]))) return null;
  if (session.userId === DEFAULT_ADMIN.userId) {
    return Object.keys(DEFAULT_ADMIN).every((key) => session[key] === DEFAULT_ADMIN[key]) ? { ...DEFAULT_ADMIN } : null;
  }
  if (!UUID.test(session.userId)) return null;
  const account = readAccounts().find((user) => user.id === session.userId);
  if (!account || account.username !== session.username || account.role !== session.role
    || account.displayName !== session.displayName) return null;
  return { userId: account.id, username: account.username, displayName: account.displayName, role: account.role };
}

/** Read a validated session, failing closed on corrupt or unavailable reads.
 * Returns:
 *   An existing account identity or null; never raises.
 */
export function getSession() {
  try {
    return validatedSession(JSON.parse(globalThis.localStorage.getItem(SESSION_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

/** Persist a verified identity without concealing write failures.
 * Args:
 *   session: Identity belonging to an actual account.
 * Returns:
 *   The canonical saved identity.
 * Raises:
 *   Error: If identity is invalid or storage refuses the write.
 */
export function setSession(session) {
  const identity = validatedSession(session);
  if (!identity) throw new Error('Cannot save an invalid session.');
  try {
    globalThis.localStorage.setItem(SESSION_KEY, JSON.stringify(identity));
  } catch (cause) {
    throw new Error('Unable to save session. Browser storage is unavailable or full.', { cause });
  }
  return identity;
}

/** Remove the session, reporting failures rather than pretending logout succeeded.
 * Raises:
 *   Error: If storage refuses removal.
 */
export function clearSession() {
  try {
    globalThis.localStorage.removeItem(SESSION_KEY);
  } catch (cause) {
    throw new Error('Unable to log out. Browser storage is unavailable. Please try again.', { cause });
  }
}

/** Select the destination for an authenticated role.
 * Args:
 *   role: Validated account role.
 * Returns:
 *   Role home, or login for an unknown role.
 */
export function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'user') return '/blogs';
  return '/login';
}

/** Check demo credentials and persist the resulting session.
 * Args:
 *   username: Local username, trimmed for matching.
 *   password: Exact plaintext demonstration password.
 * Returns:
 *   Saved account identity.
 * Raises:
 *   Error: On invalid credentials or unavailable persistence.
 */
export function authenticate(username, password) {
  if (!isText(username) || !isText(password)) throw new Error('Invalid username or password.');
  const name = username.trim();
  if (name === 'admin' && password === 'admin') return setSession(DEFAULT_ADMIN);
  const account = readAccounts().find((user) => user.username === name && user.password === password);
  if (!account) throw new Error('Invalid username or password.');
  return setSession({ userId: account.id, username: account.username, displayName: account.displayName, role: account.role });
}

/** Create a user-only demo account, then attempt a session without losing a saved account.
 * Args:
 *   fields: Required display name, username, password and password confirmation.
 * Returns:
 *   Saved session identity when both writes succeed.
 * Raises:
 *   Error: For validation, unsafe account reads, or either failed write.
 * Notes:
 *   A session failure retains the saved account and explicitly asks the visitor to log in.
 */
export function register(fields = {}) {
  const { displayName, username, password, confirmPassword } = fields ?? {};
  if (![displayName, username, password, confirmPassword].every(isText)) throw new Error('All fields are required.');
  if (password !== confirmPassword) throw new Error('Passwords must match.');
  const name = username.trim();
  if (name.toLowerCase() === 'admin') throw new Error('The username admin is reserved.');
  const users = readAccounts();
  if (users.some((user) => user.username.toLowerCase() === name.toLowerCase())) {
    throw new Error('That username is already taken.');
  }
  const account = {
    id: globalThis.crypto.randomUUID(), displayName: displayName.trim(), username: name,
    password, role: 'user', createdAt: new Date().toISOString(),
  };
  if (users.some((user) => user.id === account.id)) {
    throw new Error('Unable to create a unique account ID. Existing data was not changed. Please try again.');
  }
  saveUsers([...users, account]);
  try {
    return setSession({ userId: account.id, username: name, displayName: account.displayName, role: 'user' });
  } catch (cause) {
    throw new Error('Your account was saved, but sign-in failed. Please log in; do not register again.', { cause });
  }
}
