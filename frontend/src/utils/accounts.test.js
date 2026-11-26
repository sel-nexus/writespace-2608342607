/** Exercise actual local account state, authorization rereads and corruption protection. */
import { beforeEach, expect, it, vi } from 'vitest';
import { createAccount, deleteAccount, getAccountStats, listAccounts, validateAccount } from './accounts';
import { authenticate, clearSession, getSession, setSession } from './auth';
import { createPost, getAuthorRole } from './posts';
import { getPosts, getUsers, saveUsers } from './storage';

/** Provide required demo account fields. */
function fields(role = 'user', username = 'reader') {
  return { displayName: ' Reader ', username, password: ' demo ', role };
}
/** Start each test as the real built-in administrator. */
beforeEach(() => authenticate('admin', 'admin'));

it.each(['admin', 'user'])('creates %s with generated metadata and preserves session', (role) => {
  const session = getSession();
  const account = createAccount({ ...fields(role, ' Reader '), id: 'ignored', createdAt: 'ignored' });
  expect(account).toMatchObject({ displayName: 'Reader', username: 'Reader', password: ' demo ', role });
  expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(new Date(account.createdAt).toISOString()).toBe(account.createdAt);
  expect(getUsers()).toEqual([account]);
  expect(getSession()).toEqual(session);
  expect(listAccounts()[0]).toMatchObject({ id: 'default-admin', createdAt: null });
});
it('returns stable empty stats and rereads populated state', () => {
  expect(getAccountStats()).toEqual({ posts: 0, accounts: 1, admins: 1, users: 0 });
  createAccount(fields('admin', 'editor'));
  createAccount(fields());
  createPost({ title: 'One', content: 'Words' });
  expect(getAccountStats()).toEqual({ posts: 1, accounts: 3, admins: 2, users: 1 });
});
it.each([null, {}, [], { displayName: 3, username: {}, password: false, role: 'owner' }])('rejects malformed fields %j', (input) => {
  expect(Object.keys(validateAccount(input))).toHaveLength(4);
  expect(() => createAccount(input)).toThrow('correct');
  expect(getUsers()).toEqual([]);
});
it.each(['displayName', 'username', 'password'])('rejects blank %s', (key) => {
  expect(validateAccount({ ...fields(), [key]: ' \n ' })[key]).toBe('This field is required.');
  expect(() => createAccount({ ...fields(), [key]: ' ' })).toThrow();
});
const invalidFields = [
  ['missing', undefined], ['null', null], ['number', 42], ['boolean', true],
  ['object', {}], ['array', []], ['blank', ' \n '],
];
it.each(['displayName', 'username', 'password', 'role'].flatMap((key) => {
  const cases = key === 'role' ? [...invalidFields, ['unknown role', 'owner']] : invalidFields;
  return cases.map(([kind, value]) => [key, kind, value]);
}))('rejects independent %s when %s at validation/create without changing collections or session', (key, kind, value) => {
  createAccount(fields());
  createPost({ title: 'Retained post', content: 'Retained content' });
  const users = localStorage.getItem('writespace_users');
  const posts = localStorage.getItem('writespace_posts');
  const session = localStorage.getItem('writespace_session');
  const candidate = fields('user', 'another-reader');
  if (kind === 'missing') delete candidate[key];
  else candidate[key] = value;
  const errors = { [key]: key === 'role' ? 'Choose Admin or user.' : 'This field is required.' };
  expect(getSession().role).toBe('admin');
  expect(validateAccount(candidate)).toEqual(errors);
  expect(localStorage.getItem('writespace_users')).toBe(users);
  expect(() => createAccount(candidate)).toThrow('Please correct the account fields.');
  expect(localStorage.getItem('writespace_users')).toBe(users);
  expect(localStorage.getItem('writespace_posts')).toBe(posts);
  expect(localStorage.getItem('writespace_session')).toBe(session);
});
it.each(['admin', ' ADMIN ', 'Admin'])('rejects reserved username %s', (username) => {
  expect(validateAccount(fields('user', username)).username).toMatch(/reserved/);
  expect(() => createAccount(fields('user', username))).toThrow();
  expect(getUsers()).toEqual([]);
});
it('rereads duplicates case-insensitively and preserves all accounts', () => {
  const saved = createAccount(fields('user', 'Reader'));
  expect(() => createAccount(fields('admin', ' reader '))).toThrow('taken');
  expect(getUsers()).toEqual([saved]);
});
it('accepts large literal fields without markup execution or truncation', () => {
  const input = { ...fields(), displayName: '<script>x</script>' + 'x'.repeat(100000), password: 'p'.repeat(100000) };
  const saved = createAccount(input);
  expect(getUsers()[0]).toEqual(saved);
  expect(saved.displayName).toBe(input.displayName);
  expect(saved.password).toBe(input.password);
});
it.each(['guest', 'user', 'forged'])('denies %s at both account mutations', (identity) => {
  const target = createAccount(fields());
  if (identity === 'guest') clearSession();
  else {
    setSession({ userId: target.id, username: target.username, displayName: target.displayName, role: 'user' });
    if (identity === 'forged') {
      localStorage.setItem('writespace_session', JSON.stringify({ ...getSession(), role: 'admin' }));
    }
  }
  expect(() => createAccount(fields('admin', 'new'))).toThrow('Administrator access required');
  expect(() => deleteAccount(target.id)).toThrow('Administrator access required');
  expect(getUsers()).toEqual([target]);
});
it('protects default and current accounts while retaining deleted author posts', () => {
  const editor = createAccount(fields('admin', 'editor'));
  authenticate('editor', ' demo ');
  const post = createPost({ title: 'Retained', content: 'Words' });
  expect(() => deleteAccount('default-admin')).toThrow('Default admin cannot be deleted.');
  expect(() => deleteAccount(editor.id)).toThrow('current account');
  authenticate('admin', 'admin');
  deleteAccount(editor.id);
  expect(getUsers()).toEqual([]);
  expect(getPosts()).toEqual([post]);
  expect(getAuthorRole(post)).toBe('user');
  expect(() => deleteAccount(editor.id)).toThrow('Account not found');
});
it('rechecks deleted or demoted backing administrator', () => {
  const editor = createAccount(fields('admin', 'editor'));
  const target = createAccount(fields());
  authenticate('editor', ' demo ');
  saveUsers([{ ...editor, role: 'user' }, target]);
  expect(() => deleteAccount(target.id)).toThrow('Administrator');
  expect(() => createAccount(fields('user', 'new'))).toThrow('Administrator');
  saveUsers([target]);
  expect(() => deleteAccount(target.id)).toThrow('Administrator');
});
it.each(['broken', '{}', '[null]'])('refuses corrupt collection %s at create/delete without overwriting', (raw) => {
  const target = createAccount(fields());
  localStorage.setItem('writespace_users', raw);
  expect(listAccounts()).toHaveLength(1);
  expect(() => createAccount(fields('user', 'other'))).toThrow('Existing data was not changed');
  expect(() => deleteAccount(target.id)).toThrow('Existing data was not changed');
  expect(localStorage.getItem('writespace_users')).toBe(raw);
});
it.each(['duplicate id', 'duplicate username', 'reserved', 'trimmed', 'mixed malformed'])('rejects %s in complete collection', (kind) => {
  const one = createAccount(fields());
  const two = createAccount(fields('admin', 'editor'));
  const records = kind === 'duplicate id' ? [one, { ...two, id: one.id }]
    : kind === 'duplicate username' ? [one, { ...two, username: 'READER' }]
      : kind === 'reserved' ? [{ ...one, username: 'Admin' }]
        : kind === 'trimmed' ? [{ ...one, username: ' reader ' }] : [one, null];
  const raw = JSON.stringify(records);
  localStorage.setItem('writespace_users', raw);
  expect(() => createAccount(fields('user', 'new'))).toThrow('read local accounts');
  expect(() => deleteAccount(one.id)).toThrow('read local accounts');
  expect(localStorage.getItem('writespace_users')).toBe(raw);
});
it('rejects generated identifier collision', () => {
  const saved = createAccount(fields());
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(saved.id);
  expect(() => createAccount(fields('user', 'other'))).toThrow('unique account');
  expect(getUsers()).toEqual([saved]);
});
it('retains account data on write failure', () => {
  const saved = createAccount(fields());
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  expect(() => createAccount(fields('admin', 'editor'))).toThrow('Unable to save accounts');
  expect(() => deleteAccount(saved.id)).toThrow('Unable to save accounts');
  expect(getUsers()).toEqual([saved]);
});
it('fails closed on unavailable storage while keeping built-in visible for reads', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(listAccounts()).toHaveLength(1);
  expect(getAccountStats()).toEqual({ posts: 0, accounts: 1, admins: 1, users: 0 });
  expect(() => createAccount(fields())).toThrow('Administrator');
});
