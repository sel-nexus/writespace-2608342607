/** Manage plaintext demo accounts without discarding corrupt records or trusting stale roles.
 * Notes:
 *   Browser-local checks are not security. Never use real passwords.
 */
import { getSession } from './auth';
import { getPosts, getUsers, saveUsers } from './storage';

const builtIn = { id: 'default-admin', displayName: 'Admin', username: 'admin', role: 'admin', createdAt: null };

/** Require the current canonical administrator at each mutation.
 * Returns:
 *   Actual current administrator identity.
 * Raises:
 *   Error: If the current session is absent, forged, or a regular user.
 */
function requireAdmin() {
  const session = getSession();
  if (session?.role !== 'admin') throw new Error('Administrator access required. Your changes were not saved.');
  return session;
}

/** Read complete uniquely identified accounts before replacing the collection.
 * Returns:
 *   Valid accounts, never a filtered subset of corrupt data.
 * Raises:
 *   Error: If any record is corrupt, duplicated, reserved, or unreadable.
 */
function readCompleteAccounts() {
  try {
    const raw = JSON.parse(globalThis.localStorage.getItem('writespace_users') ?? '[]');
    const users = getUsers();
    if (!Array.isArray(raw) || JSON.stringify(raw) !== JSON.stringify(users)
      || new Set(users.map((user) => user.id)).size !== users.length
      || new Set(users.map((user) => user.username.toLowerCase())).size !== users.length
      || users.some((user) => user.username !== user.username.trim() || user.username.toLowerCase() === 'admin')) {
      throw new Error('Invalid accounts');
    }
    return users;
  } catch (cause) {
    throw new Error('Unable to read local accounts. Existing data was not changed.', { cause });
  }
}

/** Present valid local accounts with the permanently available built-in administrator.
 * Returns:
 *   Account rows, including one stable built-in identity with no invented date.
 */
export function listAccounts() {
  const seenIds = new Set(['default-admin']);
  const seenNames = new Set(['admin']);
  return [{ ...builtIn }, ...getUsers().filter((user) => {
    const name = user.username.trim().toLowerCase();
    if (seenIds.has(user.id) || seenNames.has(name)) return false;
    seenIds.add(user.id);
    seenNames.add(name);
    return true;
  })];
}

/** Validate all required account fields and reserved names without persistence.
 * Args:
 *   fields: Display name, username, plaintext demo password and account role.
 * Returns:
 *   Associated field errors, empty when valid.
 */
export function validateAccount(fields) {
  const errors = {};
  for (const key of ['displayName', 'username', 'password']) {
    if (typeof fields?.[key] !== 'string' || !fields[key].trim()) errors[key] = 'This field is required.';
  }
  if (!['admin', 'user'].includes(fields?.role)) errors.role = 'Choose Admin or user.';
  if (!errors.username && fields.username.trim().toLowerCase() === 'admin') errors.username = 'The username admin is reserved.';
  return errors;
}

/** Create either role without changing the signed-in administrator.
 * Args:
 *   fields: Required account fields; supplied identifiers and dates are ignored.
 * Returns:
 *   Persisted account with generated UUID and timestamp.
 * Raises:
 *   Error: For denied access, invalid fields, duplicates, unsafe reads or write failures.
 */
export function createAccount(fields) {
  requireAdmin();
  const errors = validateAccount(fields);
  if (Object.keys(errors).length) {
    const error = new Error('Please correct the account fields.');
    error.fields = errors;
    throw error;
  }
  const users = readCompleteAccounts();
  const username = fields.username.trim();
  if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    const error = new Error('That username is already taken.');
    error.fields = { username: error.message };
    throw error;
  }
  const account = {
    id: globalThis.crypto.randomUUID(), displayName: fields.displayName.trim(), username,
    password: fields.password, role: fields.role, createdAt: new Date().toISOString(),
  };
  if (users.some((user) => user.id === account.id)) throw new Error('Unable to create a unique account. Please try again.');
  saveUsers([...users, account]);
  return account;
}

/** Delete an eligible account after caller confirmation, retaining all posts.
 * Args:
 *   id: Existing stored account identifier.
 * Raises:
 *   Error: For denied access, protected or missing accounts, corruption or failed writes.
 */
export function deleteAccount(id) {
  const session = requireAdmin();
  if (id === 'default-admin') throw new Error('Default admin cannot be deleted.');
  if (id === session.userId) throw new Error('Your current account cannot be deleted.');
  const users = readCompleteAccounts();
  if (!users.some((user) => user.id === id)) throw new Error('Account not found.');
  saveUsers(users.filter((user) => user.id !== id));
}

/** Read current totals with distinct all-account, administrator and regular-user counts.
 * Returns:
 *   Four actual local totals; the built-in administrator counts as an account and admin.
 */
export function getAccountStats() {
  const users = listAccounts();
  return {
    posts: getPosts().length, accounts: users.length,
    admins: users.filter((user) => user.role === 'admin').length,
    users: users.filter((user) => user.role === 'user').length,
  };
}
