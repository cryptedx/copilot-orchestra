import { describe, expect, it } from 'vitest';
import { createServer, SERVER_CONFIG } from '../index.js';

describe('MCP Server Initialization', () => {
  it('should create MCP server with correct configuration', () => {
    const server = createServer();
    
    expect(server).toBeDefined();
    expect(SERVER_CONFIG.name).toBe('copilot-orchestra-mcp');
    expect(SERVER_CONFIG.version).toBe('1.0.0');
  });

  it('should have registerTool method', () => {
    const server = createServer();
    expect(typeof server.registerTool).toBe('function');
  });

  it('should have connect method', () => {
    const server = createServer();
    expect(typeof server.connect).toBe('function');
  });

  it('should have server.request method for elicitation', () => {
    const server = createServer();
    expect(server.server).toBeDefined();
    expect(typeof server.server.request).toBe('function');
  });
});
