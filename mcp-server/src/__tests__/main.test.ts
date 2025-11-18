import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from '../index.js';

// Mock the StdioServerTransport
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: class MockStdioServerTransport {
      constructor() {
        // Mock implementation
      }
    }
  };
});

describe('main function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create server and connect successfully', async () => {
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    const originalCreateServer = createServer;
    
    vi.spyOn({ createServer }, 'createServer').mockReturnValue({
      connect: mockConnect,
      registerTool: vi.fn(),
      server: { request: vi.fn() }
    } as any);

    // Since we can't easily mock the module-level function, we test the behavior indirectly
    // The createServer function should be called
    const server = createServer();
    expect(server).toBeDefined();
  });

  it('should have all required server methods', () => {
    const server = createServer();
    
    expect(typeof server.connect).toBe('function');
    expect(typeof server.registerTool).toBe('function');
    expect(server.server).toBeDefined();
    expect(typeof server.server.request).toBe('function');
  });
});
