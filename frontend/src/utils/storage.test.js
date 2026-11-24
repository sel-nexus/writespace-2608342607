/** Exercise collection validation and browser-storage failure boundaries. */
import { describe, expect, it, vi } from 'vitest';
import { getPosts, getUsers, savePosts, saveUsers } from './storage';

const post = { id: '11111111-1111-4111-8111-111111111111', title: 'A local thought', content: 'Some writing', createdAt: '2026-03-04T12:00:00.000Z', authorId: 'default-admin', authorName: 'Admin' };
const account = { id: '22222222-2222-4222-8222-222222222222', displayName: 'Ada', username: 'ada', password: 'demo-only', role: 'user', createdAt: '2026-03-04T12:00:00.000Z' };

describe.each([
  ['posts', 'writespace_posts', getPosts, savePosts, post],
  ['accounts', 'writespace_users', getUsers, saveUsers, account],
])('%s persistence', (label, key, read, save, record) => {
  it('round-trips valid records and an empty collection', () => {
    save([record]);
    expect(read()).toEqual([record]);
    expect(JSON.parse(localStorage.getItem(key))).toEqual([record]);
    save([]);
    expect(read()).toEqual([]);
  });

  it.each([null, '{broken', '{}', 'null', '42', '"text"'])('returns empty for absent or corrupt collection %s', (raw) => {
    if (raw !== null) localStorage.setItem(key, raw);
    expect(read()).toEqual([]);
  });

  it('discards malformed entries while retaining valid records', () => {
    localStorage.setItem(key, JSON.stringify([null, [], {}, record]));
    expect(read()).toEqual([record]);
  });

  it.each(Object.keys(record))('rejects a missing or wrongly typed %s field on reads and writes', (field) => {
    for (const value of [undefined, null, 42, {}, [], '', '   ']) {
      const invalid = { ...record, [field]: value };
      localStorage.setItem(key, JSON.stringify([invalid]));
      expect(read()).toEqual([]);
      expect(() => save([invalid])).toThrow(`Cannot save ${label}: invalid records.`);
    }
  });

  it.each([null, {}, 'wrong', 12])('rejects nonarray write %s without replacing saved data', (value) => {
    save([record]);
    expect(() => save(value)).toThrow('invalid records');
    expect(read()).toEqual([record]);
  });

  it('returns empty when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(read()).toEqual([]);
  });

  it('guards a throwing localStorage getter and reports a write failure', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
    expect(read()).toEqual([]);
    expect(() => save([record])).toThrow(/Browser storage is unavailable or full/);
  });

  it('guards missing browser storage', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(read()).toEqual([]);
    expect(() => save([record])).toThrow(/Your changes were not saved/);
  });

  it('reports quota failure and retains the previously saved collection', () => {
    save([record]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    expect(() => save([])).toThrow(/Your changes were not saved/);
    expect(read()).toEqual([record]);
  });
});

it('rejects invalid UUIDs, author identities, roles and timestamps', () => {
  for (const invalid of [{ ...post, id: 'not-uuid' }, { ...post, authorId: 'missing' }, { ...post, createdAt: 'not-date' }, { ...post, createdAt: '2026-99-99T12:00:00.000Z' }, { ...post, createdAt: '2026-02-31T12:00:00.000Z' }]) {
    expect(() => savePosts([invalid])).toThrow('invalid records');
  }
  expect(() => saveUsers([{ ...account, role: 'owner' }])).toThrow('invalid records');
  expect(() => saveUsers([{ ...account, id: 'default-admin' }])).toThrow('invalid records');
});

it('accepts UUID post authors and administrator accounts', () => {
  const authored = { ...post, authorId: account.id };
  savePosts([authored]);
  saveUsers([{ ...account, role: 'admin' }]);
  expect(getPosts()).toEqual([authored]);
  expect(getUsers()[0].role).toBe('admin');
});
