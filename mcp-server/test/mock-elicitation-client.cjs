#!/usr/bin/env node
const { spawn } = require('child_process');

// Mock MCP client that simulates elicitation responses
// This simulates what VS Code would do when receiving elicitation/create requests

const server = spawn(process.execPath, ['dist/index.js'], { cwd: __dirname + '/..' });

server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');

// Simple stdout handler - just log everything
server.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            console.log('[server stdout]', line);
            try {
                const obj = JSON.parse(line);
                console.log('Parsed JSON:', JSON.stringify(obj, null, 2));

                // Handle initialize responses
                if (obj.id === 1 && obj.result) {
                    console.log('✅ Server initialized successfully');
                }

                // Handle elicitation requests
                if (obj.method === 'elicitation/create') {
                    console.log('🎯 Received elicitation/create request - simulating user response');

                    const response = {
                        jsonrpc: '2.0',
                        id: obj.id,
                        result: {
                            action: 'accept',
                            content: {
                                decision: '✅ Approve Plan',
                                feedback: 'Looks good! Proceed with the plan.'
                            }
                        }
                    };

                    setTimeout(() => {
                        writeJsonRpc(response);
                        console.log('✅ Sent mock elicitation response');
                    }, 500);
                }
            } catch (err) {
                // Not JSON, just log
            }
        }
    });
});

server.stderr.on('data', (data) => {
    process.stderr.write(`[server stderr] ${data}`);
    // Also check for our trace logs
    if (data.includes('TRACE: request_plan_approval called')) {
        console.log('🎯 Server received and is processing the tool call!');
    }
});

server.on('exit', (code, signal) => {
    console.log(`server exited code=${code} signal=${signal}`);
});

function writeJsonRpc(obj) {
    const json = JSON.stringify(obj) + '\n';
    server.stdin.write(json);
}

// Send initialization first, then the tool call
setTimeout(() => {
    console.log('\n🔧 Sending initialize request...');

    const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2025-03-26',
            capabilities: {
                elicitation: {}
            },
            clientInfo: {
                name: 'Mock Elicitation Client',
                version: '1.0.0'
            }
        }
    };

    writeJsonRpc(initRequest);

    // After initialization, send the tool call
    setTimeout(() => {
        console.log('\n🚀 Sending request_plan_approval tool call...');

        const request = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'request_plan_approval',
                arguments: {
                    planSummary: 'Add JWT authentication in 5 phases',
                    planFilePath: 'plans/user-authentication-plan.md',
                    openQuestions: ['Use bcrypt for password hashing?', 'Session expiry time?']
                }
            }
        };

        writeJsonRpc(request);
    }, 500);

    // Exit after a delay
    setTimeout(() => {
        console.log('\n⏰ Timeout reached, ending test...');
        server.stdin.end();
        setTimeout(() => server.kill(), 200);
    }, 6000); // Increased timeout

}, 1000); // Increased initial delay