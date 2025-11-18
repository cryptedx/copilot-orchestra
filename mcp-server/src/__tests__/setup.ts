/**
 * Global test setup for Vitest
 * This file runs before all test files
 */

import { afterAll, beforeAll } from 'vitest';

// Suppress console.error during tests unless needed for debugging
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Only suppress MCP server trace/debug logs during tests
    const message = args[0]?.toString() || '';
    if (message.includes('TRACE:') || message.includes('ERROR:')) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
