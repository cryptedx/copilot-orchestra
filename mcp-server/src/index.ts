#!/usr/bin/env node

/**
 * GitHub Copilot Orchestra MCP Server
 * 
 * This MCP server provides interactive elicitation tools for the Copilot Orchestra workflow.
 * It enables inline user feedback at critical pause points without breaking the conversation flow.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Type definitions for our workflow inputs
interface PlanApprovalInput {
  decision: "approve" | "request_revision";
  feedback?: string;
}

interface PhaseCommitInput {
  decision: "proceed" | "request_revision" | "abort";
  feedback?: string;
}

/**
 * Tool definitions with elicitation schemas
 */
const tools: Tool[] = [
  {
    name: "request_plan_approval",
    description:
      "Request user approval for the implementation plan. Uses elicitation to get inline user feedback.",
    inputSchema: {
      type: "object",
      properties: {
        planSummary: {
          type: "string",
          description: "Brief summary of the plan to present to the user",
        },
        planFilePath: {
          type: "string",
          description: "Path to the plan file for reference",
        },
        openQuestions: {
          type: "array",
          items: { type: "string" },
          description: "List of open questions or decision points",
        },
      },
      required: ["planSummary", "planFilePath"],
    },
  },
  {
    name: "request_phase_commit",
    description:
      "Request user confirmation to commit the completed phase. Uses elicitation to get inline user feedback.",
    inputSchema: {
      type: "object",
      properties: {
        phaseNumber: {
          type: "number",
          description: "The phase number that was completed",
        },
        phaseTitle: {
          type: "string",
          description: "Title of the completed phase",
        },
        summary: {
          type: "string",
          description: "Summary of what was accomplished",
        },
        filesChanged: {
          type: "array",
          items: { type: "string" },
          description: "List of files that were created or modified",
        },
        commitMessage: {
          type: "string",
          description: "Proposed git commit message",
        },
        reviewStatus: {
          type: "string",
          enum: ["APPROVED", "APPROVED_WITH_RECOMMENDATIONS"],
          description: "Code review status",
        },
      },
      required: [
        "phaseNumber",
        "phaseTitle",
        "summary",
        "filesChanged",
        "commitMessage",
        "reviewStatus",
      ],
    },
  },
];

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: "copilot-orchestra-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handle tool list requests
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

/**
 * Handle tool execution with elicitation
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "request_plan_approval") {
      const { planSummary, planFilePath, openQuestions } = args as {
        planSummary: string;
        planFilePath: string;
        openQuestions?: string[];
      };

      // Build the presentation message
      let message = `## Plan Ready for Review\n\n${planSummary}\n\n**Plan file:** \`${planFilePath}\``;

      if (openQuestions && openQuestions.length > 0) {
        message += `\n\n**Open Questions:**\n${openQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
      }

      message += `\n\nPlease review the plan and provide your decision.`;

      // Return elicitation request
      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
        elicit: {
          type: "object",
          title: "Plan Approval",
          description: "Review and approve or request revisions to the plan",
          properties: {
            decision: {
              type: "string",
              enum: ["approve", "request_revision"],
              description: "Your decision on the plan",
              title: "Decision",
            },
            feedback: {
              type: "string",
              description:
                "If requesting revision, provide specific feedback on what needs to change",
              title: "Feedback (optional)",
            },
          },
          required: ["decision"],
        } as any,
      };
    } else if (name === "request_phase_commit") {
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

      // Build the presentation message
      const message = `## Phase ${phaseNumber} Complete: ${phaseTitle}

${summary}

**Files Changed:**
${filesChanged.map((f) => `- ${f}`).join("\n")}

**Review Status:** ${reviewStatus}

**Proposed Commit Message:**
\`\`\`
${commitMessage}
\`\`\`

You can now commit these changes and proceed to the next phase.`;

      // Return elicitation request
      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
        elicit: {
          type: "object",
          title: "Phase Commit Confirmation",
          description: "Confirm commit and proceed, request revisions, or abort",
          properties: {
            decision: {
              type: "string",
              enum: ["proceed", "request_revision", "abort"],
              description: "Your decision on this phase",
              title: "Decision",
            },
            feedback: {
              type: "string",
              description:
                "If requesting revision or aborting, provide explanation",
              title: "Feedback (optional)",
            },
          },
          required: ["decision"],
        } as any,
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Copilot Orchestra MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
