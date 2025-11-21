import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { phaseElicitationResponse } from '../index.js';
import { mockElicitationResult, mockPhaseArgs } from './fixtures/test-data.js';

describe('phaseElicitationResponse', () => {
  it('should format message with all phase details', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: 'proceed' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    const callArgs = mockElicitInput.mock.calls[0][0];
    const message = callArgs.message;

    expect(message).toContain(`Phase ${mockPhaseArgs.phaseNumber} Complete`);
    expect(message).toContain(mockPhaseArgs.phaseTitle);
    expect(message).toContain(mockPhaseArgs.summary);
    expect(message).toContain(mockPhaseArgs.reviewStatus);
  });

  it('should list all changed files correctly', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: 'proceed' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    const callArgs = mockElicitInput.mock.calls[0][0];
    const message = callArgs.message;

    mockPhaseArgs.filesChanged.forEach(file => {
      expect(message).toContain(`- \`${file}\``);
    });
  });

  it('should include review status and commit message', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: 'proceed' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    const callArgs = mockElicitInput.mock.calls[0][0];
    const message = callArgs.message;

    expect(message).toContain(mockPhaseArgs.reviewStatus);
    expect(message).toContain(mockPhaseArgs.commitMessage);
  });

  it('should create correct schema with proceed/request_revision/abort options', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: 'proceed' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    const callArgs = mockElicitInput.mock.calls[0][0];
    const schema = callArgs.requestedSchema;

    expect(schema.properties.decision.enum).toEqual(['🚀 Proceed to Next Phase', '📝 Request Changes', '🛑 Abort Process']);
    expect(schema.required).toContain('decision');
    expect(schema.properties.feedback).toBeDefined();
  });

  it('should return success message on proceed decision', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(
      mockElicitationResult.accept({ decision: '🚀 Proceed to Next Phase' })
    );
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    expect(result.content[0].text).toContain(`✅ Phase ${mockPhaseArgs.phaseNumber} approved!`);
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

    const result = await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    expect(result.content[0].text).toContain(`📝 Revisions requested for phase ${mockPhaseArgs.phaseNumber}`);
  });

  it('should return abort message on abort decision', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(
      mockElicitationResult.accept({ decision: '🛑 Abort Process' })
    );
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    expect(result.content[0].text).toContain(`⛔ Process aborted`);
  });

  it('should include feedback in response when provided', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(
      mockElicitationResult.accept({ 
        decision: '🚀 Proceed to Next Phase',
        feedback: 'Great work!'
      })
    );
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    expect(result.content[0].text).toContain('Feedback: Great work!');
  });

  it('should handle decline action', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.decline());
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    expect(result.content[0].text).toBe(`Phase ${mockPhaseArgs.phaseNumber} review cancelled or declined`);
  });

  it('should handle cancel action', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.cancel());
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token");

    expect(result.content[0].text).toBe(`Phase ${mockPhaseArgs.phaseNumber} review cancelled or declined`);
  });

  it('should handle errors and return error response', async () => {
    const mockElicitInput = vi.fn().mockRejectedValue(new Error('Server timeout'));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await expect(phaseElicitationResponse(mockServer, mockPhaseArgs, "test-token")).rejects.toThrow('Server timeout');
  });

  it('should handle multiple files changed', async () => {
    const argsWithManyFiles = {
      ...mockPhaseArgs,
      filesChanged: [
        'file1.ts',
        'file2.ts',
        'file3.ts',
        'file4.test.ts',
        'file5.test.ts'
      ]
    };

    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: 'proceed' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    await phaseElicitationResponse(mockServer, argsWithManyFiles, "test-token");

    const callArgs = mockElicitInput.mock.calls[0][0];
    const message = callArgs.message;

    argsWithManyFiles.filesChanged.forEach(file => {
      expect(message).toContain(`- \`${file}\``);
    });
  });

  it('should handle empty filesChanged array', async () => {
    const argsWithNoFiles = {
      ...mockPhaseArgs,
      filesChanged: []
    };

    const mockElicitInput = vi.fn().mockResolvedValue(mockElicitationResult.accept({ decision: '🚀 Proceed to Next Phase' }));
    const mockServer = {
      server: {
        elicitInput: mockElicitInput,
        notification: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as McpServer;

    const result = await phaseElicitationResponse(mockServer, argsWithNoFiles, "test-token");

    expect(result.content[0].text).toContain('approved');
  });
});
