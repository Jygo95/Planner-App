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
  },
});
