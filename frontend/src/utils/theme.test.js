/** Verify preference validation and best-effort persistence at the storage boundary. */
import { describe, expect, it, vi } from 'vitest';
import { getTheme, saveTheme, THEME_KEY } from './theme';

describe('theme storage', () => {
  it.each(['light', 'dark'])('reads and persists supported preference %s', (theme) => {
    expect(saveTheme(theme)).toBe(true);
    expect(localStorage.getItem(THEME_KEY)).toBe(theme);
    expect(getTheme()).toBe(theme);
  });

  it.each([null, '', 'system', 'DARK', '"dark"', '{}'])('defaults to light for missing or invalid %s', (raw) => {
    if (raw !== null) localStorage.setItem(THEME_KEY, raw);
    expect(getTheme()).toBe('light');
  });

  it('defaults to light when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(getTheme()).toBe('light');
  });

  it('handles an unavailable storage property on reads and writes', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
    expect(getTheme()).toBe('light');
    expect(saveTheme('dark')).toBe(false);
  });

  it('returns failure without overwriting the saved preference when writing throws', () => {
    localStorage.setItem(THEME_KEY, 'light');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(saveTheme('dark')).toBe(false);
    expect(getTheme()).toBe('light');
  });

  it.each([undefined, null, '', 'system', 42, {}])('rejects unsupported writes %s without changing storage', (value) => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(saveTheme(value)).toBe(false);
    expect(getTheme()).toBe('dark');
  });

  it('changes only the theme key, leaving records and session untouched', () => {
    for (const key of ['writespace_session', 'writespace_users', 'writespace_posts']) localStorage.setItem(key, 'unchanged');
    saveTheme('dark');
    expect(localStorage.length).toBe(4);
    for (const key of ['writespace_session', 'writespace_users', 'writespace_posts']) expect(localStorage.getItem(key)).toBe('unchanged');
  });
});
