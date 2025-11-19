#!/usr/bin/env node

/**
 * GitHub Copilot Orchestra MCP Server
 *
 * This MCP server provides interactive elicitation tools for the Copilot Orchestra workflow.
 * It enables MCP elicitation via native UI prompts at critical pause points without breaking the conversation flow.
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
 * Request elicitation from the client using the built-in elicitInput method
 */
export async function requestElicitation(server: McpServer, message: string, requestedSchema: any) {
  return await server.server.elicitInput({
    message,
    requestedSchema
  }, { timeout: 300000 } as any); // Increase timeout to 5 minutes
}

/**
 * Request plan approval via elicitation
 */
export async function planElicitationResponse(server: McpServer, args: any) {
  const { planSummary, planFilePath, openQuestions = [] } = args;

  let message = `## Implementation Plan Ready for Review\n\n`;
  message += `**Summary:** ${planSummary}\n\n`;
  message += `**Plan File:** ${planFilePath}\n\n`;
  if (openQuestions.length > 0) {
    message += `### Open Questions:\n`;
    message += openQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n') + `\n\n`;
  }
  message += `Please review the plan and provide your decision.`;

  const requestedSchema = {
    type: "object",
    properties: {
      decision: { 
        type: "string", 
        enum: ["approve", "request_revision"],
        enumNames: ["Approve", "Request Revision"],
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

  try {
    const result = await requestElicitation(server, message, requestedSchema);
    
    // Process the result based on user action
    if (result.action === 'accept' && result.content) {
      const { decision, feedback } = result.content;
      const responseText = decision === 'approve' 
        ? `✅ Plan approved!${feedback ? ` Feedback: ${feedback}` : ''}`
        : `📝 Revisions requested${feedback ? `: ${feedback}` : ''}`;
      
      return {
        content: [{ type: "text" as const, text: responseText }]
      };
    } else if (result.action === 'decline') {
      return {
        content: [{ type: "text" as const, text: "Plan review declined" }]
      };
    } else {
      return {
        content: [{ type: "text" as const, text: "Plan review cancelled" }]
      };
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR: elicitation failed:`, err);
    return {
      content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true
    };
  }
}

/**
 * Request phase commit confirmation via elicitation
 */
export async function phaseElicitationResponse(server: McpServer, args: any) {
  const {
    phaseNumber,
    phaseTitle,
    summary,
    filesChanged,
    commitMessage,
    reviewStatus,
  } = args as {
    phaseNumber: number;
    phaseTitle: string;
    summary: string;
    filesChanged: string[];
    commitMessage: string;
    reviewStatus: string;
  };

  let message = `## Phase ${phaseNumber} Complete: ${phaseTitle}\n\n${summary}\n\n`;
  message += `**Files Changed:**\n${filesChanged.map((f) => `- ${f}`).join("\n")}\n\n`;
  message += `**Review Status:** ${reviewStatus}\n\n`;
  message += `**Proposed Commit Message:**\n\n\`\`\`\n${commitMessage}\n\`\`\`\n\n`;
  message += `Please confirm to proceed.`;

  const requestedSchema = {
    type: "object",
    properties: {
      decision: {
        type: "string",
        enum: ["proceed", "request_revision", "abort"],
        enumNames: ["Proceed", "Request Revision", "Abort"],
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

  try {
    const result = await requestElicitation(server, message, requestedSchema);
    
    // Process the result based on user action
    if (result.action === 'accept' && result.content) {
      const { decision, feedback } = result.content;
      let responseText = '';
      if (decision === 'proceed') {
        responseText = `✅ Phase ${phaseNumber} approved!${feedback ? ` Feedback: ${feedback}` : ''}`;
      } else if (decision === 'request_revision') {
        responseText = `📝 Revisions requested for phase ${phaseNumber}${feedback ? `: ${feedback}` : ''}`;
      } else {
        responseText = `⛔ Phase ${phaseNumber} aborted${feedback ? `: ${feedback}` : ''}`;
      }
      
      return {
        content: [{ type: "text" as const, text: responseText }]
      };
    } else if (result.action === 'decline') {
      return {
        content: [{ type: "text" as const, text: `Phase ${phaseNumber} review declined` }]
      };
    } else {
      return {
        content: [{ type: "text" as const, text: `Phase ${phaseNumber} review cancelled` }]
      };
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR: elicitation failed:`, err);
    return {
      content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true
    };
  }
}

/**
 * Tool handler for request_plan_approval
 */
export function createPlanApprovalHandler(server: McpServer) {
  return async (args: any) => {
    console.error(`[${new Date().toISOString()}] TRACE: request_plan_approval called`);
    return planElicitationResponse(server, args);
  };
}

/**
 * Tool handler for request_phase_commit
 */
export function createPhaseCommitHandler(server: McpServer) {
  return async (args: any) => {
    console.error(`[${new Date().toISOString()}] TRACE: request_phase_commit called`);
    return phaseElicitationResponse(server, args);
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
        tools: {
          listChanged: true,
        },
        elicitation: {},
      },
    }
  );

  /**
   * Register request_plan_approval tool
   */
  mcpServer.registerTool(
    "request_plan_approval",
    {
      description: "Request user approval for the implementation plan. Uses elicitation to get user feedback via the MCP elicitation UI (native prompt).",
      inputSchema: {
        planSummary: z.string().describe("Brief summary of the implementation plan"),
        planFilePath: z.string().describe("Path to the plan file"),
        openQuestions: z.array(z.string()).optional().describe("List of open questions to be addressed")
      }
    },
    createPlanApprovalHandler(mcpServer)
  );

  /**
   * Register request_phase_commit tool
   */
  mcpServer.registerTool(
    "request_phase_commit",
    {
      description: "Request user confirmation to commit the completed phase. Uses elicitation to get user feedback via the MCP elicitation UI (native prompt).",
      inputSchema: {
        phaseNumber: z.number().describe("The phase number"),
        phaseTitle: z.string().describe("Title of the phase"),
        summary: z.string().describe("Summary of what was accomplished"),
        filesChanged: z.array(z.string()).describe("List of files that were changed"),
        commitMessage: z.string().describe("Proposed commit message"),
        reviewStatus: z.string().describe("Review status (e.g., APPROVED, NEEDS_REVISION)")
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
  console.error("Copilot Orchestra MCP server running on stdio");
}

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}
