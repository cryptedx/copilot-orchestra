#!/usr/bin/env node

/**
 * GitHub Copilot Orchestra MCP Server
 *
 * This MCP server provides interactive elicitation tools for the Copilot Orchestra workflow.
 * It enables MCP elicitation via native UI prompts at critical pause points without breaking the conversation flow.
 * Fully timeout-safe for GitHub Copilot in VS Code (November 2025) – works even when Copilot doesn't send a progressToken.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * Server configuration
 */
export const SERVER_CONFIG = {
  name: "copilot-orchestra-mcp",
  version: "1.0.0",
};

/**
 * Elicitation result type
 */
export type ElicitationResult = { action: 'accept' | 'decline' | 'cancel'; content?: any } | undefined;

/**
 * Request elicitation – completely timeout-safe for GitHub Copilot
 */
export async function requestElicitation(
  server: McpServer,
  message: string,
  requestedSchema: any,
  progressToken: string | number   // always provided by handler now
): Promise<ElicitationResult> {
  let interval: NodeJS.Timeout | undefined;

  // Start keep-alive progress reports every 5 seconds
  const startKeepAlive = () => {
    // Initial begin (already sent by handler, but safe to send again)
    server.server.notification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 0,
        message: "⏳ Waiting for your input…",
      },
    }).catch(() => {});

    // Repeat every 3 seconds – Copilot resets timeout on every report
    interval = setInterval(() => {
      server.server.notification({
        method: "notifications/progress",
        params: {
          progressToken,
          progress: 0,
          message: "⏳ Still waiting for your decision… (you can take as long as you want)",
        },
      }).catch(() => {});
    }, 3000);
  };

  startKeepAlive();

  try {
    const result = await server.server.elicitInput({
      message,
      requestedSchema,
    });

    if (!result) {
      throw new Error("Elicitation failed or timed out - no result returned");
    }

    return result as ElicitationResult;
  } catch (error) {
    // Ensure we don't silently swallow errors that might look like continuation
    throw new Error(`Elicitation failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (interval) clearInterval(interval);

    // Always end the progress task cleanly
    server.server.notification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 100,
        message: "Completed",
      },
    }).catch(() => {});
  }
}

/**
 * Request plan approval via elicitation
 */
export async function planElicitationResponse(server: McpServer, args: any, progressToken: string | number) {
  const { planSummary, planFilePath, openQuestions = [] } = args;

  let message = `## 📋 Implementation Plan Ready for Review\n\n`;
  message += `**Summary:** ${planSummary}\n\n`;
  message += `**Plan File:** \`${planFilePath}\`\n\n`;
  if (openQuestions.length > 0) {
    message += `### ❓ Open Questions:\n`;
    message += openQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n') + `\n\n`;
  }
  message += `👉 Please review the plan and provide your decision.`;

  const requestedSchema = {
    type: "object",
    properties: {
      decision: { 
        type: "string", 
        enum: ["✅ Approve Plan", "📝 Request Changes"],
        title: "Decision",
        description: "Choose whether to approve the plan or request revisions"
      },
      feedback: { 
        type: "string", 
        title: "Feedback (optional)",
        description: "Optional feedback or comments about the plan"
      },
    },
    required: ["decision"],
  };

  const result = await requestElicitation(server, message, requestedSchema, progressToken);
  
  if (result && result.action === 'accept' && result.content) {
    const { decision, feedback } = result.content;
    const responseText = decision === '✅ Approve Plan' 
      ? `✅ Plan approved!${feedback ? ` Feedback: ${feedback}` : ''}`
      : `📝 Revisions requested${feedback ? `: ${feedback}` : ''}`;
    
    return { content: [{ type: "text" as const, text: responseText }] };
  }
  
  throw new Error("Plan review cancelled, declined, or timed out. Workflow stopped.");
}

/**
 * Request phase commit confirmation via elicitation
 */
export async function phaseElicitationResponse(server: McpServer, args: any, progressToken: string | number) {
  const { phaseNumber, phaseTitle, summary, filesChanged, commitMessage, reviewStatus } = args;

  let message = `## 🎉 Phase ${phaseNumber} Complete: ${phaseTitle}\n\n${summary}\n\n`;
  message += `**📂 Files Changed:**\n${filesChanged.map((f: string) => `- \`${f}\``).join("\n")}\n\n`;
  message += `**🔍 Review Status:** ${reviewStatus}\n\n`;
  message += `**💬 Proposed Commit Message:**\n\n\`\`\`\n${commitMessage}\n\`\`\`\n\n`;
  message += `👉 Please confirm to proceed.`;

  const requestedSchema = {
    type: "object",
    properties: {
      decision: {
        type: "string", 
        enum: ["🚀 Proceed to Next Phase", "📝 Request Changes", "🛑 Abort Process"],
        title: "Decision",
        description: "Choose whether to proceed, request revisions, or abort"
      },
      feedback: { 
        type: "string", 
        title: "Feedback (optional)",
        description: "Optional feedback or comments"
      },
    },
    required: ["decision"],
  };

  const result = await requestElicitation(server, message, requestedSchema, progressToken);

  if (result && result.action === 'accept' && result.content) {
    const { decision, feedback } = result.content;
    if (decision === '🚀 Proceed to Next Phase') {
      return { content: [{ type: "text" as const, text: `✅ Phase ${phaseNumber} approved!${feedback ? ` Feedback: ${feedback}` : ''}` }] };
    } else if (decision === '📝 Request Changes') {
      return { content: [{ type: "text" as const, text: `📝 Revisions requested for phase ${phaseNumber}${feedback ? `: ${feedback}` : ''}` }] };
    } else {
      return { content: [{ type: "text" as const, text: `⛔ Process aborted${feedback ? ` – ${feedback}` : ''}` }] };
    }
  }

  throw new Error(`Phase ${phaseNumber} review cancelled, declined, or timed out. Workflow stopped.`);
}

/**
 * Tool handlers – create unique progressToken if Copilot doesn't provide one
 */
export function createPlanApprovalHandler(server: McpServer) {
  return async (args: any, extra: any) => {
    // Copilot often doesn't send progressToken → create our own reliable one
    const progressToken = extra?.request?.params?.meta?.progressToken 
      ?? `orchestra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start progress immediately so Copilot never times out
    server.server.notification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 0,
        message: "Waiting for plan approval…",
      },
    }).catch(() => {});

    const result = await planElicitationResponse(server, args, progressToken);

    server.server.notification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 100,
      },
    }).catch(() => {});

    return result;
  };
}

export function createPhaseCommitHandler(server: McpServer) {
  return async (args: any, extra: any) => {
    const progressToken = extra?.request?.params?.meta?.progressToken 
      ?? `orchestra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    server.server.notification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 0,
        message: "Waiting for phase confirmation…",
      },
    }).catch(() => {});

    const result = await phaseElicitationResponse(server, args, progressToken);

    server.server.notification({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 100,
      },
    }).catch(() => {});

    return result;
  };
}

/**
 * Create and configure the MCP server
 */
export function createServer() {
  const mcpServer = new McpServer(
    SERVER_CONFIG,
    {
      capabilities: {
        tools: { listChanged: true },
        elicitation: {},
      },
    }
  );

  mcpServer.registerTool(
    "request_plan_approval",
    {
      description: "Request user approval for the implementation plan via native MCP elicitation UI.",
      inputSchema: {
        planSummary: z.string(),
        planFilePath: z.string(),
        openQuestions: z.array(z.string()).optional(),
      }
    },
    createPlanApprovalHandler(mcpServer)
  );

  mcpServer.registerTool(
    "request_phase_commit",
    {
      description: "Request user confirmation to commit the completed phase via native MCP elicitation UI.",
      inputSchema: {
        phaseNumber: z.number(),
        phaseTitle: z.string(),
        summary: z.string(),
        filesChanged: z.array(z.string()),
        commitMessage: z.string(),
        reviewStatus: z.string(),
      }
    },
    createPhaseCommitHandler(mcpServer)
  );

  return mcpServer;
}

/**
 * Start the server
 */
export async function main() {
  const mcpServer = createServer();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("Copilot Orchestra MCP server running – timeout-proof version active");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}