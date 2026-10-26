import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['server/rules/**', 'server/validation.js', 'server/errors.js'],
      reporter: ['text', 'lcov', 'html'],
    },
  },
});
