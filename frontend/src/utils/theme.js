/** Resolve and apply browser-local appearance without requiring storage access. */
export const THEME_KEY = 'writespace_theme';

/** Select a valid saved choice, then the operating-system preference, then light.
 * Returns:
 *   The light or dark appearance; unavailable browser APIs never interrupt startup.
 */
export function getPreferredTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage is optional: continue with the system preference when reads are denied.
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Apply appearance to the root while preserving unrelated root classes.
 * Args:
 *   theme: The selected light or dark appearance.
 */
export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

/** Save an explicit choice best-effort without preventing an in-memory change.
 * Args:
 *   theme: The selected light or dark appearance.
 * Returns:
 *   Whether the preference was persisted successfully.
 */
export function saveTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

/** Apply the selected preference before mounting React, without saving OS defaults.
 * Returns:
 *   The appearance applied at startup.
 */
export function initializeTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);
  return theme;
}
