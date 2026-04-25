import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: true,
    exclude: [...configDefaults.exclude, 'e2e/*'], // Exclude e2e tests from Vitest - proceed with caution - this might not work
    // Backend tests run in node environment via environmentMatchGlobs
    environmentMatchGlobs: [
      ['backend/src/**/*.test.js', 'node'],
    ],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'backend/src/**/*.test.js'],
  },
});
