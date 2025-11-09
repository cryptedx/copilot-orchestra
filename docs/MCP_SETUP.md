# MCP Elicitation Setup Guide

This guide explains how to set up and use the Model Context Protocol (MCP) elicitation feature to enable inline user feedback during the Copilot Orchestra workflow.

## Overview

The MCP elicitation integration eliminates the "stop and wait" workflow by enabling the Conductor agent to request user input inline within a single continuous conversation. This provides:

- **Seamless workflow**: No need to start new chat sessions at pause points
- **Cost efficiency**: Single session instead of multiple premium model requests
- **Better UX**: Natural conversational flow with inline prompts
- **Structured input**: Schema-driven prompts ensure consistent feedback

## Prerequisites

- VS Code Insiders (latest version)
- GitHub Copilot subscription
- Node.js 18 or later (for building the MCP server)
- Git (for the commit workflow)

## Installation Steps

### 1. Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

This compiles the TypeScript MCP server and prepares it for use.

### 2. Configure VS Code Settings

Add the MCP server to your VS Code settings. The configuration location depends on your preference:

#### Option A: Workspace Settings (Recommended for teams)

Create or edit `.vscode/settings.json` in your project:

```json
{
  "github.copilot.chat.mcp.servers": {
    "copilot-orchestra-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/copilot-orchestra/mcp-server/dist/index.js"
      ]
    }
  }
}
```

**Replace** `/absolute/path/to/copilot-orchestra` with the actual absolute path to your copilot-orchestra directory.

#### Option B: User Settings (For individual use across projects)

1. Open VS Code Settings (Cmd+, on Mac, Ctrl+, on Windows/Linux)
2. Search for `github.copilot.chat.mcp.servers`
3. Click "Edit in settings.json"
4. Add the configuration:

```json
{
  "github.copilot.chat.mcp.servers": {
    "copilot-orchestra-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/copilot-orchestra/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### 3. Verify Installation

1. Restart VS Code Insiders
2. Open GitHub Copilot Chat
3. Select the "Conductor" agent from the dropdown
4. The agent should now have access to the `copilot-orchestra-mcp` tools

You can verify by asking: "What tools do you have access to?" The response should include `copilot-orchestra-mcp/request_plan_approval` and `copilot-orchestra-mcp/request_phase_commit`.

## How It Works

### Plan Approval Flow

When the Conductor reaches the plan approval step:

1. **Conductor calls** `copilot-orchestra-mcp/request_plan_approval` with:
   - Plan summary
   - Plan file path
   - Open questions (if any)

2. **MCP presents** an inline prompt with:
   - Plan details formatted for review
   - Dropdown to select: "approve" or "request_revision"
   - Optional text field for feedback

3. **User responds** directly in the chat interface

4. **Conductor receives** the structured response and:
   - If approved: Writes plan file and proceeds to implementation
   - If revision requested: Gathers more context based on feedback and revises plan

### Phase Commit Flow

When the Conductor completes a phase:

1. **Conductor calls** `copilot-orchestra-mcp/request_phase_commit` with:
   - Phase number and title
   - Summary of work completed
   - Files changed
   - Proposed commit message
   - Review status

2. **MCP presents** an inline prompt with:
   - Phase completion summary
   - Dropdown to select: "proceed", "request_revision", or "abort"
   - Optional text field for feedback

3. **User responds** with their decision

4. **Conductor receives** the response and:
   - If proceed: Writes completion file and continues to next phase
   - If revision: Returns to implementation with feedback
   - If abort: Stops workflow and awaits instructions

## Example Interaction

Here's what the new workflow looks like in practice:

**User:** "Add JWT authentication to my Express API"

**Conductor:** [Delegates to planning-subagent, creates plan]

**Conductor:** [Calls `request_plan_approval` tool]

**VS Code displays inline prompt:**

```text
Plan Ready for Review

A 5-phase plan to add JWT-based authentication...

Plan file: plans/jwt-authentication-plan.md

Open Questions:
1. Use bcrypt or argon2 for password hashing?
2. JWT expiration time preference?

Decision: [Dropdown: approve / request_revision]
Feedback: [Optional text field]
```

**User selects:** "approve"

**Conductor:** [Writes plan file, proceeds to Phase 1 implementation]

[... Phase 1 completes ...]

**Conductor:** [Calls `request_phase_commit` tool]

**VS Code displays inline prompt:**

```text
Phase 1 Complete: User Model and Schema

Created User model with password hashing and validation...

Files Changed:
- src/models/User.ts
- src/models/__tests__/User.test.ts

Review Status: APPROVED

Proposed Commit Message:
feat: Add User model with password hashing
- Create User schema with email and password fields
- Implement bcrypt password hashing
- Add email validation

Decision: [Dropdown: proceed / request_revision / abort]
Feedback: [Optional text field]
```

**User selects:** "proceed"

**Conductor:** [Writes phase-1-complete.md, continues to Phase 2]

The entire process happens in one continuous conversation!

## Troubleshooting

### MCP Server Not Found

If VS Code can't find the MCP server:

1. Verify the path in your settings is absolute (not relative)
2. Ensure you ran `npm run build` in the mcp-server directory
3. Check that `dist/index.js` exists in the mcp-server folder
4. Restart VS Code Insiders completely

### Tools Not Available to Conductor

If the Conductor doesn't have access to MCP tools:

1. Verify the tool is listed in the Conductor.agent.md frontmatter:

   ```yaml
   tools: ['...', 'copilot-orchestra-mcp']
   ```

2. Restart VS Code Insiders
3. Check VS Code Developer Tools (Help > Toggle Developer Tools) for errors

### Elicitation Prompts Not Appearing

If the MCP tools execute but no prompts appear:

1. Ensure you're using the latest VS Code Insiders build
2. Check that MCP elicitation is supported in your version
3. Try with a simple test to verify elicitation works

### Permission Errors

If you get permission errors running the server:

```bash
chmod +x mcp-server/dist/index.js
```

## Migration Guide

### For Existing Users

If you've been using Copilot Orchestra without MCP elicitation:

1. **Your existing agent files still work** - The updated Conductor is backward compatible
2. **Install the MCP server** following the steps above
3. **Configure VS Code settings** to enable the MCP tools
4. **Restart VS Code** to activate the new workflow

The first time you use the Conductor after setup, it will automatically use the inline elicitation prompts instead of hard stops.

### Reverting to Manual Workflow

If you prefer the old "pause and wait" workflow:

1. Remove `'copilot-orchestra-mcp'` from the tools list in Conductor.agent.md
2. Restore the old stopping rules (see git history for the previous version)

## Development

### Modifying the MCP Server

The server is in `mcp-server/src/index.ts`. After making changes:

```bash
cd mcp-server
npm run build
```

Then restart VS Code to reload the server.

### Adding New Elicitation Points

To add new elicitation tools:

1. Define the tool in `mcp-server/src/index.ts` tools array
2. Add the handler in the CallToolRequestSchema handler
3. Define the elicitation schema with the fields you need
4. Rebuild the server
5. Update the Conductor or subagent to call the new tool

## Support

For issues or questions:

- Check the [MCP Specification](https://modelcontextprotocol.io/specification/draft/client/elicitation)
- Review VS Code Insiders release notes for MCP support updates
- File issues in the copilot-orchestra repository
