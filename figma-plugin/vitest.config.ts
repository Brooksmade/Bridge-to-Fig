import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./src/commands/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
