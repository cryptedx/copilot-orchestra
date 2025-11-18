Every developer knows this frustration: you’re working with an AI agent, and it diligently works on generating code that’s almost right, except it assumes you’re using PostgreSQL when you’re actually using MongoDB, or it creates a REST endpoint when you needed GraphQL. The LLM had to guess because it couldn’t just ask. Or maybe it could, but your input got misinterpreted.

Model Context Protocol (MCP) elicitations solve this problem by letting MCP servers that plug into LLMs ask structured questions mid-conversation. Instead of your coding assistant making assumptions about your database type, authentication method, or API structure, it can prompt you with a native dialog asking exactly what it needs to know.

This isn’t just another chat feature - it’s a change in how MCP clients gather context. With the latest MCP specification update, [**elicitations**](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation) enable MCP servers to request specific information through structured prompts, eliminating the guesswork that leads to almost-right context passed back from the client.

## How it works in practice

The workflow is really straightforward, and I don’t say this lightly: when an MCP server needs additional context, it sends a structured request to the client specifying exactly what information it needs. The client renders this as a native UI prompt, collects the user’s response, and passes it back to the server, all without losing context or requiring free-form chat interpretation.

Starting with the [latest Insiders builds](https://code.visualstudio.com/insiders/), Visual Studio Code already supports this part of the MCP specification!

![MCP elicitation integration in Visual Studio Code Insiders.](https://assets.den.dev/images/postmedia/vscode-mcp-elicitations-support/elicitation-vs-code.gif)

MCP elicitation integration in Visual Studio Code Insiders.

As you can see from this GIF, the prompts are natively integrated in the Visual Studio Code user interface - for a developer who is frequently relying on the [Command Pallette](https://code.visualstudio.com/api/ux-guidelines/command-palette), this is what I would expect if the editor wanted more information from me.

## How elicitations work under the hood

The technical implementation is surprisingly simple and elegant. When an MCP server needs additional information, it sends an elicitation request to the MCP client that looks like this:

```json
{

  "method": "elicitation/create",

  "params": {

    "message": "Please provide your contact information",

    "requestedSchema": {

      "type": "object",

      "properties": {

        "name": {"type": "string"},

        "email": {"type": "string", "format": "email"}

      },

      "required": ["name", "email"]

    }

  }

}
```

The `requestedSchema` uses JSON Schema to define exactly what information is needed, including:

- Data types (e.g., `string`, `number`, `boolean`)
- Required and optional fields, as appropriate
- Validation rules (supported formats are `email`, `uri`, `date`, `date-time`)
- Enum values for multiple choice options

The client is responsible for rendering the user interface components for the user to respond to the elicitation request. Visual Studio Code integrates this feature natively with its Command Palette-style interface, while other clients like Claude Desktop or MCP Inspector can implement their own UI patterns that are familiar to their users.

For every elicitation request, users can respond in three ways:

- **Accept**: Provide the requested information
- **Decline**: Refuse to share requested information
- **Cancel**: Stop the entire interaction

The MCP server, of course, will be informed out of the interaction outcome.

## Why elicitations beat traditional chat

The key advantages over back-and-forth conversation:

- **Structured data collection**: JSON schemas ensure users provide exactly the right information in the right format.
- **Context preservation**: The elicitation happens within the same workflow without losing state.
- **Validation and error prevention**: Schema validation catches mistakes during input rather than relying on the MCP server doing rudimentary validation (they still should).
- **Native user experience**: Client-integrated prompts feel much more natural for *concrete* details, rather than conversational.

## Real-world example: the Everything MCP server

Enough with the theory - you probably want to see how to quickly get this tested in your favorite MCP client. Based on an example from [Connor Peet](https://peet.io/), I put together a pull request adding elicitation support to the [Everything server](https://github.com/modelcontextprotocol/servers/pull/2215).

The PR is not super-complex - it’s a way to have a minimum viable version of elicitations without waiting for a specific custom third-party server to implement it. To get started, clone my forked repository (take it from the PR), and within the `src/everything` folder run:

```bash
npm run build
```

Then, in Visual Studio Code, use Ctrl (or Cmd on macOS) + Shift + P to open the Command Palette and enter “ *Add MCP server*.” The command you’re looking at using is `npm`, and then in the settings JSON you will need to modify the MCP server configuration to match this snippet (feel free to adjust based on your own source code path):

```json
{

    "servers": {

        "test-elicitations": {

            "type": "stdio",

            "command": "npm",

            "args": [

                "start", 

                "--prefix",

                "/path/to/src/everything"

            ]

        }

    },

    "inputs": []

}
```

Start the server when ready - you can do this directly from the settings file.

![Starting a STDIO MCP server in Visual Studio Code Insiders.](https://assets.den.dev/images/postmedia/vscode-mcp-elicitations-support/vscode-start-mcp-server.webp)

Starting a STDIO MCP server in Visual Studio Code Insiders.

When you trigger the `startElicitation` tool (in Visual Studio Code you can do this with the `#` prefix), it requests your preferences through a structured prompt, that is implemented like this:

```typescript
const requestElicitation = async (

  message: string,

  requestedSchema: any

) => {

  const request = {

    method: 'elicitation/create',

    params: {

      message,

      requestedSchema

    }

  };

  

  return await server.request(request, z.any());

};
```

The demo asks for the user’s favorite color, a number between 1-100, and the preferred pet type.

This is a “silly” demo, of course - in real-world scenarios, MCP servers can request database types, file paths, API endpoints, or any other structured information they need to take an action.

## Security considerations

Because I am deeply immersed in the MCP security work, I wanted to address one important constraint with elicitations. MCP servers **must not** request sensitive information like passwords, API keys, or other sensitive data through the current elicitation implementation.

That being said, there is work underway by [Wils Dawson](https://www.wilsdawson.com/) and [Nate Barbettini](https://www.linkedin.com/in/nbarbettini) from [Arcade.dev](https://arcade.dev/) to introduce a [secure way for out-of-band credential or authorization requests](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/887). You should check out the pull request and provide your feedback.

## Looking ahead

MCP elicitations are still in their early stages, but the implications are significant. As more MCP servers adopt this pattern, we can expect more intelligent, context-aware AI tools that feel less like chatbots and more like knowledgeable pair programming partners.

The key insight is that good LLM assistance isn’t just about having the right answers - it’s about knowing the *very specific context* that is often needed to provide the right insights or perform the right actions. Elicitations give MCP servers that capability, making them more effective partners in all sorts of user workflows.

For developers interested in implementing elicitations in their own MCP servers, the [specification](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation) provides detailed guidance on request formats, schema validation, and best practices.
