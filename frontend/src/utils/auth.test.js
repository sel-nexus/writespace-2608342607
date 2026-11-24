/** Verify actual persisted state and fail-closed demo identity boundaries. */
import { describe, expect, it, vi } from 'vitest';
import { authenticate, clearSession, getSession, register, roleHome, setSession } from './auth';
import { getUsers, saveUsers } from './storage';

const fields = { displayName: 'Reader', username: 'reader', password: 'demo', confirmPassword: 'demo' };
const admin = { userId: 'default-admin', username: 'admin', displayName: 'Admin', role: 'admin' };

describe('local identity', () => {
  it('keeps default admin permanently available independent of corrupt accounts', () => {
    localStorage.setItem('writespace_users', '{broken');
    expect(authenticate('admin', 'admin')).toEqual(admin);
    expect(getSession()).toEqual(admin);
    clearSession();
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });
  it('persists a unique user-only account and permits later login', () => {
    const session = register({ ...fields, role: 'admin' });
    expect(session.role).toBe('user');
    expect(getUsers()).toEqual([expect.objectContaining({ username: 'reader', role: 'user', password: 'demo' })]);
    expect(getSession()).toEqual(session);
    clearSession();
    expect(authenticate(' reader ', 'demo')).toEqual(session);
    expect(getSession()).toEqual(session);
  });
  it.each(['admin', ' ADMIN '])('rejects reserved username %s without saving', (username) => {
    expect(() => register({ ...fields, username })).toThrow('reserved');
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it('rejects case-insensitive duplicates without overwriting', () => {
    register(fields);
    clearSession();
    const before = localStorage.getItem('writespace_users');
    expect(() => register({ ...fields, username: 'READER' })).toThrow('already taken');
    expect(localStorage.getItem('writespace_users')).toBe(before);
    expect(getSession()).toBeNull();
  });
  it.each(Object.keys(fields))('requires %s', (key) => {
    expect(() => register({ ...fields, [key]: ' ' })).toThrow('required');
    expect(getUsers()).toEqual([]);
  });
  it('requires matching passwords', () => {
    expect(() => register({ ...fields, confirmPassword: 'wrong' })).toThrow('match');
    expect(getUsers()).toEqual([]);
  });
  it.each([['missing', 'demo'], ['admin', 'wrong'], ['', 'demo'], ['reader', '']])('rejects credentials %s', (name, password) => {
    expect(() => authenticate(name, password)).toThrow('Invalid username or password.');
    expect(getSession()).toBeNull();
  });
  it.each(['{broken', '{}', '[{}]'])('never replaces corrupt accounts %s', (raw) => {
    localStorage.setItem('writespace_users', raw);
    expect(() => register(fields)).toThrow('read local accounts');
    expect(localStorage.getItem('writespace_users')).toBe(raw);
    expect(getSession()).toBeNull();
  });
  it('fails closed on absent, malformed, invalid-role, mismatched and deleted accounts', () => {
    expect(getSession()).toBeNull();
    const valid = register(fields);
    for (const candidate of [[], {}, { ...valid, userId: 'not-an-id' }, { ...valid, role: 'admin' },
      { ...valid, username: 'other' }, { ...valid, displayName: '' }, { ...admin, userId: valid.userId },
      { ...admin, role: 'user' }]) {
      localStorage.setItem('writespace_session', JSON.stringify(candidate));
      expect(getSession()).toBeNull();
    }
    localStorage.setItem('writespace_session', '{broken');
    expect(getSession()).toBeNull();
    localStorage.setItem('writespace_session', JSON.stringify(valid));
    saveUsers([]);
    expect(getSession()).toBeNull();
  });
  it('authenticates administrator-created accounts and checks account roles on reread', () => {
    const user = register(fields);
    clearSession();
    saveUsers(getUsers().map((account) => ({ ...account, role: 'admin' })));
    const session = authenticate('reader', 'demo');
    expect(session.role).toBe('admin');
    expect(getSession()).toEqual(session);
    localStorage.setItem('writespace_session', JSON.stringify(user));
    expect(getSession()).toBeNull();
  });
  it('rejects invalid session writes without replacing an existing identity', () => {
    authenticate('admin', 'admin');
    expect(() => setSession({ ...admin, username: 'fake' })).toThrow('invalid session');
    expect(getSession()).toEqual(admin);
  });
  it('reports failed account writes and leaves accounts and session unchanged', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(() => register(fields)).toThrow('Unable to save accounts');
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it('retains saved registration after failed session write and rejects a duplicate retry', () => {
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'writespace_session') throw new Error('full');
      return write.call(this, key, value);
    });
    expect(() => register(fields)).toThrow('Your account was saved');
    expect(getUsers()).toHaveLength(1);
    expect(getSession()).toBeNull();
    expect(() => register(fields)).toThrow('already taken');
    expect(getUsers()).toHaveLength(1);
  });
  it('reports failed session save and failed logout without false state transitions', () => {
    authenticate('admin', 'admin');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(() => setSession(admin)).toThrow('Unable to save session');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => clearSession()).toThrow('Unable to log out');
    expect(getSession()).toEqual(admin);
  });
  it('fails closed on unavailable storage and prevents unsafe account writes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(getSession()).toBeNull();
    expect(() => register(fields)).toThrow('read local accounts');
    expect(() => authenticate('reader', 'demo')).toThrow('read local accounts');
  });
  it('maps roles with an unknown-role fail-closed fallback', () => {
    expect(roleHome('admin')).toBe('/admin');
    expect(roleHome('user')).toBe('/blogs');
    expect(roleHome('invalid')).toBe('/login');
    expect(roleHome('constructor')).toBe('/login');
    expect(roleHome('__proto__')).toBe('/login');
  });
});
