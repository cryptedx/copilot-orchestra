import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { createPhaseCommitHandler, createPlanApprovalHandler } from '../index.js';
import { mockPhaseArgs, mockPlanArgs } from './fixtures/test-data.js';

describe('Tool Handler Factories', () => {
  it('should create plan approval handler that logs and executes', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockElicitInput = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { decision: '✅ Approve Plan' }
    });
    
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const handler = createPlanApprovalHandler(mockServer);
    const result = await handler(mockPlanArgs, {});

    expect(result.content[0].text).toContain('✅ Plan approved!');
    
    consoleErrorSpy.mockRestore();
  });

  it('should create phase commit handler that logs and executes', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockElicitInput = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { decision: '🚀 Proceed to Next Phase' }
    });
    
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const handler = createPhaseCommitHandler(mockServer);
    const result = await handler(mockPhaseArgs, {});

    expect(result.content[0].text).toContain('✅ Phase 1 approved!');
    
    consoleErrorSpy.mockRestore();
  });

  it('should create handler that handles errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockElicitInput = vi.fn().mockRejectedValue(new Error('Handler error'));
    
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const handler = createPlanApprovalHandler(mockServer);
    
    await expect(handler(mockPlanArgs, {})).rejects.toThrow('Handler error');
    
    consoleErrorSpy.mockRestore();
  });
});
