#!/usr/bin/env node
const { spawn } = require('child_process');

// This script starts the MCP server (dist/index.js) and sends two JSON-RPC
// requests over stdio to simulate how a client might invoke an elicitation.
// It tries both `callTool` (SDK style) and `elicitation/create` (protocol name)
// so you can see what the server replies with.

const server = spawn(process.execPath, ['dist/index.js'], { cwd: __dirname + '/..' });

server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');

server.stdout.on('data', (data) => {
    process.stdout.write(`[server stdout] ${data}`);
});

server.stderr.on('data', (data) => {
    process.stderr.write(`[server stderr] ${data}`);
});

server.on('exit', (code, signal) => {
    console.log(`server exited code=${code} signal=${signal}`);
});

function writeJsonRpc(obj) {
    const json = JSON.stringify(obj);
    const msg = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
    server.stdin.write(msg);
}

// Wait briefly for server to start
setTimeout(() => {
    // 1) callTool-style request
    const callToolReq = {
        jsonrpc: '2.0',
        id: 1,
        method: 'callTool',
        params: {
            name: 'request_plan_approval',
            arguments: {
                planSummary: 'Add JWT auth in 5 phases',
                planFilePath: 'plans/user-authentication-plan.md',
                openQuestions: ['Use bcrypt? Yes / No']
            }
        }
    };

    console.log('\n--- Sending callTool request ---');
    writeJsonRpc(callToolReq);

    // 2) elicitation/create-style request (alternative)
    const elicitationReq = {
        jsonrpc: '2.0',
        id: 2,
        method: 'elicitation/create',
        params: {
            tool: 'copilot-orchestra-mcp/request_plan_approval',
            args: {
                planSummary: 'Add JWT auth in 5 phases',
                planFilePath: 'plans/user-authentication-plan.md',
                openQuestions: ['Use bcrypt? Yes / No']
            }
        }
    };

    setTimeout(() => {
        console.log('\n--- Sending elicitation/create request ---');
        writeJsonRpc(elicitationReq);
    }, 300);

    // Close stdin after a moment
    setTimeout(() => {
        server.stdin.end();
    }, 2000);
}, 500);
