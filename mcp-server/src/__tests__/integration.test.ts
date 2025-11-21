import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { createServer, phaseElicitationResponse, planElicitationResponse } from '../index.js';

describe('Integration Tests', () => {
  describe('Complete Plan Approval Workflow', () => {
    it('should handle complete plan approval workflow', async () => {
      const mockElicitInput = vi.fn()
        .mockResolvedValueOnce({
          action: 'accept',
          content: { decision: '✅ Approve Plan', feedback: 'Looks good!' }
        });

      const mockServer = {
        server: {
          elicitInput: mockElicitInput,
          notification: vi.fn().mockResolvedValue(undefined)
        }
      } as unknown as McpServer;

      const args = {
        planSummary: 'Test plan',
        planFilePath: 'plans/test.md',
        openQuestions: ['Question 1?']
      };

      const result = await planElicitationResponse(mockServer, args, 'test-token');

      expect(result.content[0].text).toContain('✅ Plan approved!');
      expect(result.content[0].text).toContain('Feedback: Looks good!');
      expect(mockElicitInput).toHaveBeenCalledTimes(1);
    });

    it('should handle plan revision workflow', async () => {
      const mockElicitInput = vi.fn()
        .mockResolvedValueOnce({
          action: 'accept',
          content: { decision: '📝 Request Changes', feedback: 'Add more detail' }
        });

      const mockServer = {
        server: {
          elicitInput: mockElicitInput,
          notification: vi.fn().mockResolvedValue(undefined)
        }
      } as unknown as McpServer;

      const args = {
        planSummary: 'Incomplete plan',
        planFilePath: 'plans/incomplete.md',
        openQuestions: []
      };

      const result = await planElicitationResponse(mockServer, args, 'test-token');

      expect(result.content[0].text).toContain('📝 Revisions requested');
      expect(result.content[0].text).toContain(': Add more detail');
    });
  });

  describe('Complete Phase Commit Workflow', () => {
    it('should handle complete phase commit workflow', async () => {
      const mockElicitInput = vi.fn()
        .mockResolvedValueOnce({
          action: 'accept',
          content: { decision: '🚀 Proceed to Next Phase' }
        });

      const mockServer = {
        server: {
          elicitInput: mockElicitInput,
          notification: vi.fn().mockResolvedValue(undefined)
        }
      } as unknown as McpServer;

      const args = {
        phaseNumber: 2,
        phaseTitle: 'API Endpoints',
        summary: 'Created REST API endpoints',
        filesChanged: ['src/routes/api.ts', 'src/__tests__/api.test.ts'],
        commitMessage: 'feat: Add API endpoints',
        reviewStatus: 'APPROVED'
      };

      const result = await phaseElicitationResponse(mockServer, args, 'test-token');

      expect(result.content[0].text).toContain('✅ Phase 2 approved!');
      expect(mockElicitInput).toHaveBeenCalledTimes(1);
    });

    it('should handle phase abort workflow', async () => {
      const mockElicitInput = vi.fn()
        .mockResolvedValueOnce({
          action: 'accept',
          content: { decision: '🛑 Abort Process', feedback: 'Critical issue found' }
        });

      const mockServer = {
        server: {
          elicitInput: mockElicitInput,
          notification: vi.fn().mockResolvedValue(undefined)
        }
      } as unknown as McpServer;

      const args = {
        phaseNumber: 3,
        phaseTitle: 'Database Migration',
        summary: 'Migration with issues',
        filesChanged: ['migrations/001.sql'],
        commitMessage: 'chore: Add migration',
        reviewStatus: 'NEEDS_REVISION'
      };

      const result = await phaseElicitationResponse(mockServer, args, 'test-token');

      expect(result.content[0].text).toContain('⛔ Process aborted');
      expect(result.content[0].text).toContain('Critical issue found');
    });
  });

  describe('Server Tool Registration', () => {
    it('should have tools accessible after server creation', () => {
      const server = createServer();

      expect(server).toBeDefined();
      expect(typeof server.registerTool).toBe('function');
      expect(typeof server.connect).toBe('function');
    });
  });

  describe('Error Recovery', () => {
    it('should not crash on multiple consecutive errors', async () => {
      const mockElicitInput = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'));

      const mockServer = {
        server: {
          elicitInput: mockElicitInput,
          notification: vi.fn().mockResolvedValue(undefined)
        }
      } as unknown as McpServer;

      const args = {
        planSummary: 'Test',
        planFilePath: 'test.md',
        openQuestions: []
      };

      await expect(planElicitationResponse(mockServer, args, 'test-token')).rejects.toThrow('Error 1');
      await expect(planElicitationResponse(mockServer, args, 'test-token')).rejects.toThrow('Error 2');
      await expect(planElicitationResponse(mockServer, args, 'test-token')).rejects.toThrow('Error 3');
      expect(mockElicitInput).toHaveBeenCalledTimes(3);
    });

    it('should recover from error and handle subsequent success', async () => {
      const mockElicitInput = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          action: 'accept',
          content: { decision: '✅ Approve Plan' }
        });

      const mockServer = {
        server: {
          elicitInput: mockElicitInput,
          notification: vi.fn().mockResolvedValue(undefined)
        }
      } as unknown as McpServer;

      const args = {
        planSummary: 'Recovery test',
        planFilePath: 'test.md',
        openQuestions: []
      };

      await expect(planElicitationResponse(mockServer, args, 'test-token')).rejects.toThrow('Temporary failure');

      const result2 = await planElicitationResponse(mockServer, args, 'test-token');
      expect(result2.content[0].text).toContain('✅ Plan approved!');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
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

      const args = {
        planSummary: longMessage,
        planFilePath: 'test.md',
        openQuestions: []
      };

      const result = await planElicitationResponse(mockServer, args, 'test-token');

      expect(result.content[0].text).toContain('✅ Plan approved!');
      const callArgs = mockElicitInput.mock.calls[0][0];
      expect(callArgs.message).toContain(longMessage);
    });

    it('should handle special characters in messages', async () => {
      const specialChars = 'Test with émojis 🎉 and spëcial çharacters ñ';
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

      const args = {
        phaseNumber: 1,
        phaseTitle: specialChars,
        summary: specialChars,
        filesChanged: ['file.ts'],
        commitMessage: specialChars,
        reviewStatus: 'APPROVED'
      };

      const result = await phaseElicitationResponse(mockServer, args, 'test-token');

      expect(result.content[0].text).toContain('✅ Phase 1 approved!');
    });
  });
});
