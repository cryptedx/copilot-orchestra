import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'test/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        'src/mock-client.ts',
        'src/__tests__/**',
      ],
      // Exclude entry point from coverage since it only runs when file is executed directly
      excludeAfterRemap: true,
      thresholds: {
        statements: 95,
        branches: 91,  // Slightly lower due to untestable entry point branch
        functions: 91,  // Slightly lower due to untestable entry point handler
        lines: 95,
      },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
