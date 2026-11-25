/** Keep the visitor's theme independent of browser-local identity and records. */
export const THEME_KEY = 'writespace_theme';

/** Read the saved theme, falling back to light when storage cannot be trusted.
 * Returns:
 *   A supported theme; storage access failures never escape.
 */
export function getTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Persist a supported theme without interrupting an in-memory theme change.
 * Args:
 *   theme: The visitor's selected light or dark preference.
 * Returns:
 *   Whether persistence succeeded; invalid values leave storage untouched.
 */
export function saveTheme(theme) {
  if (!['light', 'dark'].includes(theme)) return false;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}
