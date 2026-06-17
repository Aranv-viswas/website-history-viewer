import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Resolves the `@utils/*`, `@lib/*`, … aliases from tsconfig.json so tests can
// import modules the same way the app does.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
