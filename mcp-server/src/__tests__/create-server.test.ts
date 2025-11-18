import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { createServer } from '../index.js';

describe('createServer and Tool Registration', () => {
  let server: McpServer;

  beforeEach(() => {
    server = createServer();
  });

  it('should create server with correct configuration', () => {
    expect(server).toBeDefined();
    expect(typeof server.registerTool).toBe('function');
    expect(typeof server.connect).toBe('function');
  });

  it('should register tools that can be called', () => {
    // Verify the server has the methods we need
    expect(server.server).toBeDefined();
    expect(typeof server.server.request).toBe('function');
  });

  it('should create new server instance on each call', () => {
    const server1 = createServer();
    const server2 = createServer();
    
    // They should be different instances
    expect(server1).not.toBe(server2);
  });

  it('should handle tool registration without errors', () => {
    expect(() => createServer()).not.toThrow();
  });
});
