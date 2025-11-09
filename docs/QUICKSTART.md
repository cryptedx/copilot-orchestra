# Quick Start: MCP Elicitation for Copilot Orchestra

Get inline user feedback working in 5 minutes!

## What You'll Get

Instead of stopping and starting new chat sessions, you'll get inline forms that appear right in the conversation:

- **Plan Approval:** Dropdown with "approve" or "request revision"
- **Phase Commits:** Dropdown with "proceed", "request revision", or "abort"
- **Continuous Flow:** Entire orchestration in one session

## Prerequisites

✅ VS Code Insiders installed  
✅ GitHub Copilot subscription active  
✅ Node.js 18+ installed (`node --version`)  
✅ Copilot Orchestra agents set up

## 3-Step Setup

### 1. Build the MCP Server

```bash
cd copilot-orchestra/mcp-server
npm install
npm run build
```

Wait for build to complete (~30 seconds).

### 2. Configure VS Code

**Option A: Quick (Workspace)**

```bash
cd ../.vscode
cp settings.json.example settings.json
```

**Option B: Manual (Any scope)**

Add this to your settings JSON:

```json
{
  "github.copilot.chat.mcp.servers": {
    "copilot-orchestra-mcp": {
      "command": "node",
      "args": ["/FULL/PATH/TO/copilot-orchestra/mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/FULL/PATH/TO/` with your actual path.

### 3. Restart VS Code Insiders

Completely close and reopen VS Code Insiders.

## Verify It Works

1. Open Copilot Chat
2. Select "Conductor" agent
3. Try: "Add a simple greeting function"
4. Watch for inline form to appear at plan approval

If you see a form with "approve/request_revision" dropdown - **you're done!** 🎉

## Troubleshooting

### No inline forms appear

```bash
# Check build succeeded
ls mcp-server/dist/index.js

# Make executable
chmod +x mcp-server/dist/index.js

# Verify settings path is absolute
code --user-data-dir
```

Restart VS Code Insiders after fixes.

### "Tool not found" errors

The path in your settings is probably wrong.

Get the correct path:

```bash
cd copilot-orchestra/mcp-server/dist
pwd
```

Copy that path into your settings.

### Still stuck?

See the full guide: [docs/MCP_SETUP.md](MCP_SETUP.md)

## What's Next?

Try a real task:

```
Conductor, please help me add user authentication to my Express app
```

You'll see the inline workflow in action:

- Plan appears → inline form for approval
- Each phase completes → inline form for commit
- All in one conversation!

## Don't Want Inline Forms?

Just remove `'copilot-orchestra-mcp'` from the tools list in `Conductor.agent.md`. The old workflow still works fine!
