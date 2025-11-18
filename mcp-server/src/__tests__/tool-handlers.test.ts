import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { createPhaseCommitHandler, createPlanApprovalHandler } from '../index.js';
import { mockPhaseArgs, mockPlanArgs } from './fixtures/test-data.js';

describe('Tool Handler Factories', () => {
  it('should create plan approval handler that logs and executes', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockElicitInput = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { decision: 'approve' }
    });
    
    const mockServer = {
      server: { elicitInput: mockElicitInput }
    } as unknown as McpServer;

    const handler = createPlanApprovalHandler(mockServer);
    const result = await handler(mockPlanArgs);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('TRACE: request_plan_approval called')
    );
    expect(result.content[0].text).toContain('✅ Plan approved!');
    
    consoleErrorSpy.mockRestore();
  });

  it('should create phase commit handler that logs and executes', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockElicitInput = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { decision: 'proceed' }
    });
    
    const mockServer = {
      server: { elicitInput: mockElicitInput }
    } as unknown as McpServer;

    const handler = createPhaseCommitHandler(mockServer);
    const result = await handler(mockPhaseArgs);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('TRACE: request_phase_commit called')
    );
    expect(result.content[0].text).toContain('✅ Phase 1 approved!');
    
    consoleErrorSpy.mockRestore();
  });

  it('should create handler that handles errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockElicitInput = vi.fn().mockRejectedValue(new Error('Handler error'));
    
    const mockServer = {
      server: { elicitInput: mockElicitInput }
    } as unknown as McpServer;

    const handler = createPlanApprovalHandler(mockServer);
    const result = await handler(mockPlanArgs);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Handler error');
    
    consoleErrorSpy.mockRestore();
  });
});
