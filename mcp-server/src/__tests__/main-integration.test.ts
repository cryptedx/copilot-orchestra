import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../index.js';

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: class MockStdioServerTransport {
      constructor() {}
      start() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    }
  };
});

describe('main function integration', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should create transport and connect server', async () => {
    await main();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Copilot Orchestra MCP server running – timeout-proof version active'
    );
  });

  it('should log startup message', async () => {
    await main();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Copilot Orchestra MCP server running – timeout-proof version active')
    );
  });
});
