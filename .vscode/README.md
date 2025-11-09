# Example MCP Configuration

This directory contains example configuration files for setting up MCP elicitation.

## Workspace Settings (Recommended)

Copy `settings.json.example` to `.vscode/settings.json`:

```bash
cp .vscode/settings.json.example .vscode/settings.json
```

The workspace settings use `${workspaceFolder}` variable which VS Code will automatically resolve to your project path. This makes the configuration portable across different machines.

## User Settings (Global)

For global configuration across all projects, add to your VS Code User Settings:

1. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Type "Preferences: Open User Settings (JSON)"
3. Add the MCP server configuration with absolute path:

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

Replace `/absolute/path/to/copilot-orchestra` with the actual path where you've installed copilot-orchestra.

## Verifying Configuration

After configuring:

1. Restart VS Code Insiders
2. Open GitHub Copilot Chat
3. Select "Conductor" agent
4. The agent should have access to `copilot-orchestra-mcp` tools

You can verify by asking the Conductor: "What tools do you have access to?"
