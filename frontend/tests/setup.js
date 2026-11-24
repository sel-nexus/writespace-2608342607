/** Restore the DOM, browser storage, and fault injections between tests. */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/** Start each case without persisted browser records. */
beforeEach(() => localStorage.clear());

/** Remove rendered content and restore storage availability before clearing it. */
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});
