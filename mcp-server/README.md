# Copilot Orchestra MCP Server

This directory contains the Model Context Protocol (MCP) server that enables inline user elicitation during the Copilot Orchestra workflow.

## What It Does

The MCP server provides two tools that the Conductor agent uses to get user input without breaking the conversation flow:

1. **`request_plan_approval`** - Presents the implementation plan and elicits user approval or revision requests
2. **`request_phase_commit`** - Presents phase completion summary and elicits commit confirmation

## Quick Start

### Build

```bash
npm install
npm run build
```

### Configure in VS Code

Add to `.vscode/settings.json` or User Settings:

```json
{
  "github.copilot.chat.mcp.servers": {
    "copilot-orchestra-mcp": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/dist/index.js"]
    }
  }
}
```

### Verify

After restarting VS Code Insiders, the Conductor agent should have access to the MCP tools.

## Development

### Structure

```
mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development

### Making Changes

1. Edit `src/index.ts`
2. Run `npm run build`
3. Restart VS Code Insiders to reload the server

### Adding New Tools

To add a new elicitation tool:

1. Add tool definition to the `tools` array
2. Add handler in the `CallToolRequestSchema` request handler
3. Define the elicitation schema with required fields
4. Rebuild and restart VS Code

## How Elicitation Works

When the Conductor calls an MCP tool with elicitation:

1. The tool returns content with an `elicit` property
2. VS Code displays the content as a message
3. VS Code renders an inline form based on the elicitation schema
4. User fills out the form and submits
5. The response is returned to the Conductor
6. Conductor continues workflow based on user input

## Schema Definition

Elicitation schemas use JSON Schema format:

```typescript
{
  type: "object",
  title: "Form Title",
  description: "Form description",
  properties: {
    fieldName: {
      type: "string",
      enum: ["option1", "option2"],  // Creates dropdown
      description: "Field description",
      title: "Field Label"
    }
  },
  required: ["fieldName"]
}
```

## Dependencies

- **@modelcontextprotocol/sdk** - Official MCP SDK for TypeScript
- **typescript** - TypeScript compiler
- **@types/node** - Node.js type definitions

## Troubleshooting

### Server won't start

- Ensure Node.js 18+ is installed: `node --version`
- Check build completed: `ls dist/index.js`
- Verify execute permissions: `chmod +x dist/index.js`

### Changes not taking effect

- Rebuild: `npm run build`
- Restart VS Code Insiders completely
- Check VS Code Developer Tools for errors

### Type errors

- Run type check: `npx tsc --noEmit`
- Check tsconfig.json settings
- Ensure dependencies are installed: `npm install`

## Further Reading

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification)
- [MCP Elicitation Documentation](https://modelcontextprotocol.io/specification/draft/client/elicitation)
- [Main Setup Guide](../docs/MCP_SETUP.md)
