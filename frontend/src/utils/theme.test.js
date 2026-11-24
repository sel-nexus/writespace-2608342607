/** Verify every preference fallback and best-effort appearance boundary. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, getPreferredTheme, initializeTheme, saveTheme, THEME_KEY } from './theme';

afterEach(() => {
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
});

describe('getPreferredTheme', () => {
  it.each(['light', 'dark'])('prefers saved %s without consulting the OS', (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    const matchMedia = vi.fn(() => { throw new Error('unavailable'); });
    vi.stubGlobal('matchMedia', matchMedia);
    expect(getPreferredTheme()).toBe(theme);
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it.each([null, '', 'invalid', 'Dark', '"dark"', '{broken'])('ignores saved %j and follows both OS states', (saved) => {
    if (saved !== null) localStorage.setItem(THEME_KEY, saved);
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal('matchMedia', matchMedia);
    expect(getPreferredTheme()).toBe('dark');
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    matchMedia.mockReturnValue({ matches: false });
    expect(getPreferredTheme()).toBe('light');
  });

  it('falls back to light when matchMedia is absent', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(getPreferredTheme()).toBe('light');
  });

  it('falls back to light when matchMedia throws', () => {
    vi.stubGlobal('matchMedia', () => { throw new Error('denied'); });
    expect(getPreferredTheme()).toBe('light');
  });

  it.each([true, false])('uses the OS when storage reads are denied (dark=%s)', (matches) => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.stubGlobal('matchMedia', () => ({ matches }));
    expect(getPreferredTheme()).toBe(matches ? 'dark' : 'light');
  });

  it('survives a denied storage getter and unavailable OS API', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
    vi.stubGlobal('matchMedia', undefined);
    expect(getPreferredTheme()).toBe('light');
  });
});

describe('applyTheme', () => {
  it('adds dark class and colorScheme without removing other classes', () => {
    document.documentElement.className = 'existing';
    applyTheme('dark');
    applyTheme('dark');
    expect(document.documentElement).toHaveClass('existing', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('removes only dark and applies light colorScheme', () => {
    document.documentElement.className = 'existing dark';
    applyTheme('light');
    expect(document.documentElement).toHaveClass('existing');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});

describe('saveTheme', () => {
  it.each(['light', 'dark'])('persists %s without changing unrelated browser data', (theme) => {
    localStorage.setItem('writespace_session', 'session');
    expect(saveTheme(theme)).toBe(true);
    expect(localStorage.getItem(THEME_KEY)).toBe(theme);
    expect(localStorage.getItem('writespace_session')).toBe('session');
  });

  it('returns false rather than throwing on denied writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(saveTheme('dark')).toBe(false);
  });

  it('returns false when access to storage itself is denied', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
    expect(saveTheme('light')).toBe(false);
  });
});

describe('initializeTheme', () => {
  it.each(['light', 'dark'])('applies saved %s before returning', (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    expect(initializeTheme()).toBe(theme);
    expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
    expect(document.documentElement.style.colorScheme).toBe(theme);
  });

  it('applies OS appearance without persisting a default', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(initializeTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(document.documentElement).toHaveClass('dark');
  });
});
