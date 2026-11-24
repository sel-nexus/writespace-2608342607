/** Run isolated component and utility tests within one fork. */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['./tests/setup.js'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
