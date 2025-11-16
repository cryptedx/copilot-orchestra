#!/usr/bin/env node
const { spawn } = require('child_process');

// This script starts the MCP server (dist/index.js) and sends two JSON-RPC
// requests over stdio to simulate how a client might invoke an elicitation.
// It tries both `callTool` (SDK style) and `elicitation/create` (protocol name)
// so you can see what the server replies with.

const server = spawn(process.execPath, ['dist/index.js'], { cwd: __dirname + '/..' });

server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');

// Robust stdout handler: buffer, parse Content-Length frames, pretty-print JSON-RPC
server.stdout.on('data', (data) => {
    if (!server._rpcBuffer) server._rpcBuffer = Buffer.from('', 'utf8');
    server._rpcBuffer = Buffer.concat([server._rpcBuffer, Buffer.from(data, 'utf8')]);

    // Attempt to parse as many framed messages as possible
    let progress = true;
    while (progress) {
        progress = false;
        const buf = server._rpcBuffer;
        const headerEnd = buf.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;
        const header = buf.slice(0, headerEnd).toString('utf8');
        const m = header.match(/Content-Length: (\d+)/i);
        if (!m) {
            // If no Content-Length, dump the buffered text and clear
            const text = buf.toString('utf8').trim();
            if (text) console.log('[server stdout] (unframed) ' + text);
            server._rpcBuffer = Buffer.from('', 'utf8');
            break;
        }
        const len = parseInt(m[1], 10);
        const totalLen = headerEnd + 4 + len;
        if (buf.length < totalLen) break; // wait for more data
        const jsonPayload = buf.slice(headerEnd + 4, totalLen).toString('utf8');
        try {
            const obj = JSON.parse(jsonPayload);
            console.log('\n=== JSON-RPC Response Received ===');
            console.log(JSON.stringify(obj, null, 2));
            console.log('=== End Response ===\n');
        } catch (err) {
            console.log('[server stdout] (invalid json) ' + jsonPayload);
        }
        server._rpcBuffer = buf.slice(totalLen);
        progress = true;
    }
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

// Wait briefly for server to start, then send requests and wait for responses
const RESPONSE_TIMEOUT_MS = 3000;
const WAIT_BEFORE_SEND_MS = 300;

function sendRequestsAndWait() {
    return new Promise((resolve) => {
        const pendingIds = new Set();

        // Hook to capture responses by id
        if (!server._responses) server._responses = {};

        const originalLog = console.log;

        // Observe parsed responses put into stdout handler; we will also watch server._rpcBuffer processed messages
        const responseChecker = setInterval(() => {
            // noop; presence of printed responses is sufficient for now
        }, 100);

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
        pendingIds.add(callToolReq.id);
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
            pendingIds.add(elicitationReq.id);
            writeJsonRpc(elicitationReq);
        }, 300);

        // Wait for responses or timeout
        const timeout = setTimeout(() => {
            clearInterval(responseChecker);
            resolve({ timeout: true });
        }, RESPONSE_TIMEOUT_MS);

        // Poll for server exit or when pendingIds likely handled (best-effort)
        const checkInterval = setInterval(() => {
            // If process exited, resolve
            if (server.killed || server.exitCode !== null) {
                clearTimeout(timeout);
                clearInterval(checkInterval);
                clearInterval(responseChecker);
                resolve({ timeout: false });
            }
        }, 100);
    });
}

setTimeout(() => {
    sendRequestsAndWait().then((res) => {
        // close stdin gently
        try {
            server.stdin.end();
        } catch (e) {}
        setTimeout(() => {
            // kill server if still running
            try {
                server.kill();
            } catch (e) {}
        }, 200);
    });

}, WAIT_BEFORE_SEND_MS);
