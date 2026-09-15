import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, './shared/components'),
      '@/config': path.resolve(__dirname, './shared/config'),
      '@/lib': path.resolve(__dirname, './shared/lib'),
      '@/server': path.resolve(__dirname, './shared/server'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
