import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'legacy/**',
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/types.ts',
        'test/**',
        'scripts/**',
        '*.config.ts',
        'tests/**',
        '.changeset/**',
        'CHANGELOG.md',
      ],
      include: ['encoders/js/**/*.ts', 'clients/js/**/*.ts', 'vendor/**/*.js'],
      all: true,
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
