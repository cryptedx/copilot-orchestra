import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { planElicitationResponse } from '../index.js';
import { mockElicitationResult, mockPlanArgs, mockPlanArgsNoQuestions } from './fixtures/test-data.js';

describe('planElicitationResponse', () => {
  it('should format message correctly with all parameters', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: 'approve' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await planElicitationResponse(mockServer, mockPlanArgs, "test-token");

    const callArgs = mockElicitInput.mock.calls[0][0];
    const message = callArgs.message;

    expect(message).toContain('Implementation Plan Ready for Review');
    expect(message).toContain(mockPlanArgs.planSummary);
    expect(message).toContain(mockPlanArgs.planFilePath);
    expect(message).toContain('Open Questions:');
    expect(message).toContain('1. Use bcrypt for password hashing?');
    expect(message).toContain('2. Session expiry time?');
  });

  it('should handle plan with no open questions', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: 'approve' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await planElicitationResponse(mockServer, mockPlanArgsNoQuestions, "test-token");

    const callArgs = mockElicitInput.mock.calls[0][0];
    const message = callArgs.message;

    expect(message).not.toContain('Open Questions:');
    expect(message).toContain(mockPlanArgsNoQuestions.planSummary);
  });

  it('should create correct schema with approve/request_revision options', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: 'approve' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await planElicitationResponse(mockServer, mockPlanArgs, "test-token");

    const callArgs = mockElicitInput.mock.calls[0][0];
    const schema = callArgs.requestedSchema;

    expect(schema.properties.decision.enum).toEqual(['✅ Approve Plan', '📝 Request Changes']);
    expect(schema.required).toContain('decision');
    expect(schema.properties.feedback).toBeDefined();
  });

  it('should return success message on approve decision', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(
      mockElicitationResult.accept({ decision: '✅ Approve Plan' })
    );
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await planElicitationResponse(mockServer, mockPlanArgs, "test-token");

    expect(result.content[0].text).toContain('✅ Plan approved!');
  });

  it('should return revision message on request_revision decision', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(
      mockElicitationResult.accept({ decision: '📝 Request Changes' })
    );
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await planElicitationResponse(mockServer, mockPlanArgs, "test-token");

    expect(result.content[0].text).toContain('📝 Revisions requested');
  });

  it('should include feedback in response when provided', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(
      mockElicitationResult.accept({ 
        decision: '✅ Approve Plan',
        feedback: 'Looks good but add more tests'
      })
    );
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await planElicitationResponse(mockServer, mockPlanArgs, "test-token");

    expect(result.content[0].text).toContain('Feedback: Looks good but add more tests');
  });

  it('should handle decline action', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.decline());
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await expect(planElicitationResponse(mockServer, mockPlanArgs, "test-token")).rejects.toThrow("Plan review cancelled, declined, or timed out. Workflow stopped.");
  });

  it('should handle cancel action', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.cancel());
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await expect(planElicitationResponse(mockServer, mockPlanArgs, "test-token")).rejects.toThrow("Plan review cancelled, declined, or timed out. Workflow stopped.");
  });

  it('should handle errors and return error response', async () => {
    const mockElicitInput = vi.fn().mockRejectedValue(new Error('Connection failed'));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await expect(planElicitationResponse(mockServer, mockPlanArgs, "test-token")).rejects.toThrow('Elicitation failed: Connection failed');
  });

  it('should handle non-Error exceptions', async () => {
    const mockElicitInput = vi.fn().mockRejectedValue('String error');
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await expect(planElicitationResponse(mockServer, mockPlanArgs, "test-token")).rejects.toThrow('Elicitation failed: String error');
  });
});
