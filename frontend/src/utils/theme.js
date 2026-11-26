/** Keep the browser-origin appearance independent of identity and content storage. */
export const THEME_KEY = 'writespace_theme';

/** Read an exact saved choice, falling back to light when storage is unavailable.
 * Returns:
 *   The valid saved appearance or the safe light default.
 */
export function readTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Save only a valid appearance without interrupting current-session switching.
 * Args:
 *   theme: The selected light or dark appearance.
 * Returns:
 *   Whether the preference was persisted successfully.
 */
export function writeTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return false;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    return true;
  } catch {
    // The App state remains authoritative when browser storage is blocked or full.
    return false;
  }
}

/** Apply appearance to the document without replacing unrelated root classes.
 * Args:
 *   theme: The selected appearance; invalid values use light.
 */
export function applyTheme(theme) {
  const appearance = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', appearance === 'dark');
  document.documentElement.style.colorScheme = appearance;
}
