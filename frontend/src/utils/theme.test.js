/** Verify the preference trust boundary and pre-paint bootstrap against real storage. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyTheme, readTheme, writeTheme } from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = 'unrelated';
  document.documentElement.style.colorScheme = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
});

describe('theme preference', () => {
  it.each(['light', 'dark'])('reads and writes the exact %s string without changing other data', (theme) => {
    for (const key of ['writespace_session', 'writespace_posts', 'writespace_users', 'unrelated']) {
      localStorage.setItem(key, 'keep me');
    }
    expect(writeTheme(theme)).toBe(true);
    expect(localStorage.getItem('writespace_theme')).toBe(theme);
    expect(readTheme()).toBe(theme);
    for (const key of ['writespace_session', 'writespace_posts', 'writespace_users', 'unrelated']) {
      expect(localStorage.getItem(key)).toBe('keep me');
    }
  });
  it.each([null, '', 'DARK', ' dark ', 'system', '"dark"', '{}', 'null'])('defaults to light for %s', (value) => {
    if (value !== null) localStorage.setItem('writespace_theme', value);
    expect(readTheme()).toBe('light');
    expect(localStorage.getItem('writespace_theme')).toBe(value);
  });
  it('defaults to light when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readTheme()).toBe('light');
  });
  it('handles an inaccessible localStorage property on both reads and writes', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
    expect(readTheme()).toBe('light');
    expect(writeTheme('dark')).toBe(false);
  });
  it('reports a failed write and preserves the previously saved preference and other keys', () => {
    localStorage.setItem('writespace_theme', 'light');
    localStorage.setItem('writespace_posts', 'unchanged');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(writeTheme('dark')).toBe(false);
    expect(readTheme()).toBe('light');
    expect(localStorage.getItem('writespace_posts')).toBe('unchanged');
  });
  it.each([undefined, null, '', 'DARK', 'system', {}, 1])('rejects an invalid write %s without modifying storage', (value) => {
    localStorage.setItem('writespace_theme', 'dark');
    expect(writeTheme(value)).toBe(false);
    expect(readTheme()).toBe('dark');
  });
  it('applies both themes idempotently, normalizes invalid input and keeps unrelated root classes', () => {
    applyTheme('dark');
    applyTheme('dark');
    expect(document.documentElement).toHaveClass('dark', 'unrelated');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement).toHaveClass('unrelated');
    expect(document.documentElement.style.colorScheme).toBe('light');
    applyTheme('dark');
    applyTheme('invalid');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});

describe('inline pre-paint bootstrap', () => {
  const html = readFileSync('index.html', 'utf8');
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  it('runs synchronously in the head before the body and React entry', () => {
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('</head>'));
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('id="root"'));
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('/src/main.jsx'));
  });
  it.each(['dark', 'light', '', 'invalid', '"dark"', null])('restores %s without touching storage', (value) => {
    if (value !== null) localStorage.setItem('writespace_theme', value);
    localStorage.setItem('writespace_session', 'keep');
    applyTheme('dark');
    window.eval(bootstrap);
    expect(document.documentElement.classList.contains('dark')).toBe(value === 'dark');
    expect(document.documentElement.style.colorScheme).toBe(value === 'dark' ? 'dark' : 'light');
    expect(document.documentElement).toHaveClass('unrelated');
    expect(localStorage.getItem('writespace_theme')).toBe(value);
    expect(localStorage.getItem('writespace_session')).toBe('keep');
  });
  it('recovers from blocked reads and still applies light', () => {
    applyTheme('dark');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => window.eval(bootstrap)).not.toThrow();
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
  it('recovers when the storage property itself is inaccessible', () => {
    applyTheme('dark');
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
    window.eval(bootstrap);
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});
