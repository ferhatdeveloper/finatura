import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/orchestrator/**/*.test.ts'],
    environment: 'node',
  },
});
