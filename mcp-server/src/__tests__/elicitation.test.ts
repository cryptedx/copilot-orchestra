import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestElicitation } from '../index.js';

describe('requestElicitation', () => {
  it('should call elicitInput with message and schema', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue({ action: 'accept', content: {} });
    const mockServer = {
      server: {
        elicitInput: mockElicitInput
      }
    } as unknown as McpServer;

    const message = 'Test message';
    const schema = { type: 'object', properties: {} };

    await requestElicitation(mockServer, message, schema);

    expect(mockElicitInput).toHaveBeenCalledWith({
      message,
      requestedSchema: schema
    });
  });

  it('should include message and requestedSchema in params', async () => {
    const mockElicitInput = vi.fn().mockResolvedValue({ action: 'accept', content: {} });
    const mockServer = {
      server: {
        elicitInput: mockElicitInput
      }
    } as unknown as McpServer;

    const message = 'Custom elicitation message';
    const schema = {
      type: 'object',
      properties: {
        field: { type: 'string' }
      }
    };

    await requestElicitation(mockServer, message, schema);

    const callArgs = mockElicitInput.mock.calls[0][0];
    expect(callArgs.message).toBe(message);
    expect(callArgs.requestedSchema).toEqual(schema);
  });

  it('should return result from elicitInput', async () => {
    const expectedResult = { action: 'accept', content: { decision: 'approve' } };
    const mockElicitInput = vi.fn().mockResolvedValue(expectedResult);
    const mockServer = {
      server: {
        elicitInput: mockElicitInput
      }
    } as unknown as McpServer;

    const result = await requestElicitation(mockServer, 'test', {});

    expect(result).toEqual(expectedResult);
  });

  it('should propagate errors from elicitInput', async () => {
    const error = new Error('Network error');
    const mockElicitInput = vi.fn().mockRejectedValue(error);
    const mockServer = {
      server: {
        elicitInput: mockElicitInput
      }
    } as unknown as McpServer;

    await expect(
      requestElicitation(mockServer, 'test', {})
    ).rejects.toThrow('Network error');
  });

  describe('debug logging', () => {
    const originalFlag = process.env.MCP_DEBUG_ELICITATION;

    afterEach(() => {
      if (typeof originalFlag === 'undefined') {
        delete process.env.MCP_DEBUG_ELICITATION;
      } else {
        process.env.MCP_DEBUG_ELICITATION = originalFlag;
      }
      vi.restoreAllMocks();
    });

    it('should log payload details when debug flag is enabled', async () => {
      process.env.MCP_DEBUG_ELICITATION = '1';
      const mockElicitInput = vi.fn().mockResolvedValue({ action: 'accept' });
      const mockServer = {
        server: {
          elicitInput: mockElicitInput
        }
      } as unknown as McpServer;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await requestElicitation(
        mockServer,
        'Debug message',
        { type: 'object', properties: {} },
        'test-context'
      );

      const logCall = consoleSpy.mock.calls.find((call) =>
        call[0]?.includes('DEBUG: elicitation payload')
      );

      expect(logCall?.[0]).toContain('test-context');
      expect(logCall?.[0]).toContain('Debug message');
    });

    it('should not log payload details when debug flag is disabled', async () => {
      delete process.env.MCP_DEBUG_ELICITATION;
      const mockElicitInput = vi.fn().mockResolvedValue({ action: 'accept' });
      const mockServer = {
        server: {
          elicitInput: mockElicitInput
        }
      } as unknown as McpServer;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await requestElicitation(
        mockServer,
        'No debug message',
        { type: 'object', properties: {} },
        'test-context'
      );

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: elicitation payload')
      );
    });
  });
});
