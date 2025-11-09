# Migration Guide: Adding MCP Elicitation to Copilot Orchestra

This guide helps you migrate from the traditional "pause and wait" workflow to the new inline MCP elicitation workflow.

## Overview of Changes

The MCP elicitation feature transforms the Copilot Orchestra workflow from:

**Old Workflow:**

1. Conductor presents plan → HARD STOP
2. User reviews in separate session
3. User starts new chat: "Approve the plan" → CONTINUE
4. Implementation phase completes → HARD STOP  
5. User starts new chat: "Proceed to next phase" → CONTINUE

**New Workflow:**

1. Conductor presents plan → Inline prompt appears
2. User selects "approve" or "request revision" in dropdown
3. Conductor continues immediately in same session
4. Implementation phase completes → Inline prompt appears
5. User selects "proceed" → Conductor continues in same session

## What Changed

### 1. Conductor Agent Updates

The `Conductor.agent.md` file now:

- Adds `'copilot-orchestra-mcp'` to the tools list
- Replaces "Pause for User Approval" with MCP tool calls
- Uses `request_plan_approval` tool instead of hard stops
- Uses `request_phase_commit` tool for phase completions

### 2. New MCP Server

A new TypeScript-based MCP server in `mcp-server/` provides:

- `request_plan_approval` - Elicits plan approval with inline form
- `request_phase_commit` - Elicits phase commit confirmation with inline form

### 3. Infrastructure

New files added:

- `mcp-server/` - TypeScript MCP server implementation
- `docs/MCP_SETUP.md` - Detailed setup and usage guide
- `.vscode/settings.json.example` - Configuration template

## Migration Steps

### Step 1: Backup Current Setup (Optional)

If you've customized your Conductor agent:

```bash
cp Conductor.agent.md Conductor.agent.md.backup
```

### Step 2: Pull Latest Changes

```bash
git pull origin main
```

This gets the updated Conductor agent and new MCP server.

### Step 3: Install MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### Step 4: Configure VS Code

Choose one:

**Option A: Workspace Settings (Recommended)**

```bash
cp .vscode/settings.json.example .vscode/settings.json
```

**Option B: User Settings (Global)**

Add to User Settings JSON:

```json
{
  "github.copilot.chat.mcp.servers": {
    "copilot-orchestra-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/copilot-orchestra/mcp-server/dist/index.js"]
    }
  }
}
```

### Step 5: Restart VS Code Insiders

Close and reopen VS Code Insiders to load the MCP server.

### Step 6: Verify Setup

1. Open Copilot Chat
2. Select "Conductor" agent
3. Ask: "What tools do you have access to?"
4. Verify `copilot-orchestra-mcp/request_plan_approval` and `request_phase_commit` are listed

### Step 7: Test with Simple Task

Try a small feature to test the new workflow:

```
Add a simple hello world function to my utils
```

You should see inline prompts appear at plan approval and phase commit points.

## Backward Compatibility

### If MCP Server Is Not Configured

The Conductor will still work but may not pause properly. For best results without MCP:

1. Remove `'copilot-orchestra-mcp'` from tools list in Conductor.agent.md
2. Or configure the MCP server properly

### Using Old Workflow

If you prefer the manual "pause and wait" workflow:

1. Keep your backup: `Conductor.agent.md.backup`
2. Rename to use it: `mv Conductor.agent.md.backup Conductor.agent.md`
3. Delete or ignore the `mcp-server/` directory

## Troubleshooting

### "Tool not found" errors

The Conductor is trying to use MCP tools but can't find the server.

**Solution:** Complete the MCP server setup (Steps 3-5 above)

### Inline prompts not appearing

MCP elicitation may not be supported in your VS Code version.

**Solution:**

- Update to latest VS Code Insiders
- Check [MCP specification](https://modelcontextprotocol.io/specification/draft/client/elicitation) for support status
- Verify settings are correct

### Permission errors running MCP server

**Solution:**

```bash
chmod +x mcp-server/dist/index.js
```

### MCP server crashes

Check VS Code Developer Tools (Help > Toggle Developer Tools) for errors.

Common issues:

- Node.js version too old (need 18+)
- Missing dependencies: `cd mcp-server && npm install`

## Getting Help

- See [docs/MCP_SETUP.md](../docs/MCP_SETUP.md) for detailed documentation
- Check VS Code Insiders release notes for MCP updates
- File issues in the GitHub repository

## Rollback Instructions

If you need to rollback completely:

1. Restore backup: `mv Conductor.agent.md.backup Conductor.agent.md`
2. Remove MCP config from VS Code settings
3. Delete mcp-server: `rm -rf mcp-server/` (optional)
4. Restart VS Code Insiders

Your workflow will return to the original "pause and wait" style.
