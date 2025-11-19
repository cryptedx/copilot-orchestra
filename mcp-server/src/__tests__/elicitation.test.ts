import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
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
});
