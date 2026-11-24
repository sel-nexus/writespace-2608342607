/** Verify real local persistence, fresh identity, validation and non-destructive failures. */
import { expect, it, vi } from 'vitest';
import { authenticate, clearSession, register } from './auth';
import { getPosts, getUsers, savePosts, saveUsers } from './storage';
import { canManagePost, createPost, deletePost, formatPostDate, getAuthorRole, updatePost, validatePost } from './posts';

/** Register a real demonstration reader. */
function reader(name = 'reader') {
  return register({ displayName: name, username: name, password: 'demo', confirmPassword: 'demo' });
}
/** Create meaningful plain-text writing. */
function writing() {
  return { title: '  A thought  ', content: 'First line\n\n  second line  ' };
}
it.each([null, undefined, {}, [], { title: 1, content: false }, { title: '  ', content: '\n' }])(
  'rejects malformed or blank fields %j', (fields) => {
    expect(validatePost(fields)).toEqual({ title: 'This field is required.', content: 'This field is required.' });
    authenticate('admin', 'admin');
    expect(() => createPost(fields)).toThrow('required');
    expect(getPosts()).toEqual([]);
  },
);
it('validates each field independently', () => {
  expect(validatePost({ title: 'yes', content: '' })).toEqual({ content: 'This field is required.' });
  expect(validatePost({ title: '', content: 'yes' })).toEqual({ title: 'This field is required.' });
  expect(validatePost(writing())).toEqual({});
});
it.each(['user', 'admin'])('creates and rereads %s writing with canonical metadata', (role) => {
  const identity = role === 'admin' ? authenticate('admin', 'admin') : reader();
  const post = createPost({ ...writing(), authorId: 'fake', authorName: 'fake', id: 'fake', createdAt: 'fake' });
  expect(post.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(new Date(post.createdAt).toISOString()).toBe(post.createdAt);
  expect(post).toMatchObject({ ...writing(), authorId: identity.userId, authorName: identity.displayName });
  expect(getPosts()).toEqual([post]);
});
it('updates and deletes own writing retaining original metadata and other posts', () => {
  reader();
  const first = createPost(writing());
  const second = createPost({ title: 'Other', content: 'Keep me' });
  const updated = updatePost(first.id, { title: 'Changed', content: 'New\n text', authorId: 'fake' });
  expect(updated).toEqual({ ...first, title: 'Changed', content: 'New\n text' });
  expect(getPosts()).toEqual([updated, second]);
  deletePost(first.id);
  expect(getPosts()).toEqual([second]);
});
it('rereads posts added or changed since an earlier read', () => {
  authenticate('admin', 'admin');
  const first = createPost(writing());
  getPosts();
  const second = createPost({ title: 'Later', content: 'External' });
  savePosts([{ ...first, authorName: 'Retained change' }, second]);
  updatePost(first.id, writing());
  expect(getPosts()[0].authorName).toBe('Retained change');
  deletePost(first.id);
  expect(getPosts()).toEqual([second]);
});
it('denies wrong-owner direct updates and deletes but permits administrator mutations', () => {
  reader('owner');
  const post = createPost(writing());
  reader('other');
  const before = localStorage.getItem('writespace_posts');
  expect(canManagePost(post)).toBe(false);
  expect(() => updatePost(post.id, writing())).toThrow('cannot manage');
  expect(() => deletePost(post.id)).toThrow('cannot manage');
  expect(localStorage.getItem('writespace_posts')).toBe(before);
  authenticate('admin', 'admin');
  expect(canManagePost(post)).toBe(true);
  expect(updatePost(post.id, { title: 'Admin edit', content: 'Admin text' }).authorId).toBe(post.authorId);
  deletePost(post.id);
  expect(getPosts()).toEqual([]);
});
it.each(['logout', 'deleted account', 'forged role'])('fails closed after %s at mutation time', (change) => {
  reader();
  const post = createPost(writing());
  if (change === 'logout') clearSession();
  if (change === 'deleted account') saveUsers([]);
  if (change === 'forged role') {
    const session = JSON.parse(localStorage.getItem('writespace_session'));
    localStorage.setItem('writespace_session', JSON.stringify({ ...session, role: 'admin' }));
  }
  const before = localStorage.getItem('writespace_posts');
  expect(() => createPost(writing())).toThrow('sign in');
  expect(() => updatePost(post.id, writing())).toThrow('sign in');
  expect(() => deletePost(post.id)).toThrow('sign in');
  expect(localStorage.getItem('writespace_posts')).toBe(before);
});
it.each([undefined, null, '', 'missing'])('rejects missing identifiers %j', (id) => {
  authenticate('admin', 'admin');
  expect(() => updatePost(id, writing())).toThrow('Post not found');
  expect(() => deletePost(id)).toThrow('Post not found');
});
it('rejects invalid update without changing persisted writing', () => {
  reader();
  const post = createPost(writing());
  expect(() => updatePost(post.id, { title: ' ', content: 'valid' })).toThrow('required');
  expect(getPosts()).toEqual([post]);
});
it.each(['broken', '{}', 'null', '[null]', '[{"title":"incomplete"}]', 'mixed', 'duplicate'])(
  'never overwrites corrupt collection %s for any operation', (raw) => {
    authenticate('admin', 'admin');
    const post = createPost(writing());
    const data = raw === 'mixed' ? JSON.stringify([post, null]) : raw === 'duplicate' ? JSON.stringify([post, post]) : raw;
    localStorage.setItem('writespace_posts', data);
    expect(() => createPost(writing())).toThrow('Unable to read local posts');
    expect(() => updatePost(post.id, writing())).toThrow('Unable to read local posts');
    expect(() => deletePost(post.id)).toThrow('Unable to read local posts');
    expect(localStorage.getItem('writespace_posts')).toBe(data);
  },
);
it('reports unreadable storage without writing', () => {
  authenticate('admin', 'admin');
  const read = Storage.prototype.getItem;
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
    if (key === 'writespace_posts') throw new Error('denied');
    return read.call(this, key);
  });
  expect(() => createPost(writing())).toThrow('Unable to read local posts');
});
it.each(['create', 'update', 'delete'])('reports %s write failure preserving exact collection', (operation) => {
  authenticate('admin', 'admin');
  const post = createPost(writing());
  const before = localStorage.getItem('writespace_posts');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
  const mutate = operation === 'create' ? () => createPost(writing())
    : operation === 'update' ? () => updatePost(post.id, writing()) : () => deletePost(post.id);
  expect(mutate).toThrow('Unable to save posts');
  expect(localStorage.getItem('writespace_posts')).toBe(before);
});
it('retains very large and markup-like text exactly, with no interpretation', () => {
  authenticate('admin', 'admin');
  const content = '<script>alert(1)</script>\n' + 'x'.repeat(100000);
  const post = createPost({ title: '<img onerror=alert(1)>', content });
  expect(getPosts()[0]).toEqual(post);
  expect(updatePost(post.id, { title: 'Updated', content }).content).toBe(content);
});
it('rejects UUID collision and UUID generation failure without saving', () => {
  authenticate('admin', 'admin');
  const post = createPost(writing());
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(post.id);
  expect(() => createPost(writing())).toThrow('unique post');
  globalThis.crypto.randomUUID.mockImplementation(() => { throw new Error('UUID unavailable'); });
  expect(() => createPost(writing())).toThrow('UUID unavailable');
  expect(getPosts()).toEqual([post]);
});
it('resolves default, stored administrator, user and orphaned authors without deleting writing', () => {
  reader();
  const post = createPost(writing());
  expect(getAuthorRole(post)).toBe('user');
  saveUsers(getUsers().map((user) => ({ ...user, role: 'admin' })));
  expect(getAuthorRole(post)).toBe('admin');
  saveUsers([]);
  expect(getAuthorRole(post)).toBe('user');
  expect(getPosts()).toEqual([post]);
  expect(getAuthorRole({ authorId: 'default-admin' })).toBe('admin');
  expect(getAuthorRole(null)).toBe('user');
});
it('formats UTC dates with a two-digit day and handles invalid dates', () => {
  expect(formatPostDate('2026-03-04T23:59:59.000Z')).toBe('Mar 04, 2026');
  expect(formatPostDate('invalid')).toBe('Date unavailable');
});
it('checks ownership role and missing data combinations', () => {
  const post = { authorId: 'owner' };
  expect(canManagePost(post, { role: 'user', userId: 'owner' })).toBe(true);
  expect(canManagePost(post, { role: 'user', userId: 'other' })).toBe(false);
  expect(canManagePost(post, { role: 'unknown', userId: 'owner' })).toBe(false);
  expect(canManagePost(post, null)).toBe(false);
  expect(canManagePost(null, { role: 'admin' })).toBe(false);
});
