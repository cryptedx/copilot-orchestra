## Fixing "MCP error -32001: Request timed out" errors

Kashish Hora

Co-founder of MCPcat

[Try out MCPcat](https://mcpcat.io/app)

[MCP Connection Management](https://mcpcat.io/guides/topic/mcp-connection-management/)

## The Quick Answer

MCP error -32001 occurs when requests exceed the 60-second timeout. Increase timeout in your client configuration or implement progress notifications to keep connections alive:

```
{
  "mcpServers": {
    "myserver": {
      "command": "node",
      "args": ["./server.js"],
      "timeout": 300000  // 5 minutes
    }
  }
}
```

For Python servers, send progress updates every 5-10 seconds:

```
await ctx.report_progress(
    current_step, 
    total_steps, 
    f"Processing step {current_step}/{total_steps}"
)
```

This prevents timeouts by signaling the client that work is ongoing. Note that TypeScript clients currently have a hard 60-second limit that doesn't reset with progress updates.

## Prerequisites

- MCP-compatible client (Claude Desktop, Cline, or custom implementation)
- Active MCP server with proper initialization
- Network connectivity between client and server
- Understanding of your server's expected response times

## Diagnosing Timeout Issues

MCP timeout errors manifest in several ways, each pointing to different root causes. Understanding these patterns helps identify the appropriate solution.

Start by examining the exact error message. The standard timeout error includes the timeout duration:

```
McpError: MCP error -32001: Request timed out
{ code: -32001, data: { timeout: 60000 } }
```

This tells you the client waited 60 seconds (60000ms) before timing out. Different clients may have different default timeouts.

Next, verify your server is actually running and accessible. Test the connection independently:

```
# For stdio servers, run directly$node your-server.js # For HTTP servers, test the endpoint$curl -X POST http://localhost:3000/rpc \$  -H "Content-Type: application/json" \$  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

Monitor server logs during the timeout period. If the server shows it's processing the request but the client times out anyway, you're dealing with a legitimate long-running operation. If the server shows no activity, the issue is likely connection or initialization related.

## Configuration Options

Timeout configuration varies significantly between MCP implementations. Each client and SDK handles timeouts differently, requiring specific approaches.

### Client-Side Configuration

For Claude Desktop and similar clients using JSON configuration:

```
{
  "mcpServers": {
    "long-running-server": {
      "command": "python",
      "args": ["-m", "myserver"],
      "timeout": 300000,  // 5 minutes in milliseconds
      "env": {
        "MCP_SERVER_REQUEST_TIMEOUT": "300"
      }
    }
  }
}
```

Some clients support environment variable configuration. Set these before starting your MCP client:

```
$export MCP_REQUEST_TIMEOUT=300  # seconds$export MCP_CONNECTION_TIMEOUT=30  # seconds
```

### Server-Side Configuration

Python servers using FastMCP can configure timeouts during initialization:

```
from mcp.server.fastmcp import FastMCP

mcp = FastMCP(
    "myserver",
    version="0.1.0",
    request_timeout=300  # 5 minutes
)
```

For TypeScript servers, timeout handling requires implementing progress notifications since the SDK has a hard 60-second limit:

```
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'long-running-server',
  version: '1.0.0'
});

// Note: TypeScript SDK doesn't support custom timeouts
// Must use progress notifications instead
```

### Progress Notifications

Progress notifications prevent timeouts by keeping the connection active. They also provide valuable feedback to users about long-running operations.

Python implementation with automatic progress reporting:

```
@mcp.tool()
async def process_large_dataset(
    file_path: str, 
    ctx: Context
) -> str:
    """Process a large dataset with progress tracking"""
    
    # Get file size for progress calculation
    total_size = os.path.getsize(file_path)
    processed = 0
    
    with open(file_path, 'r') as f:
        for line in f:
            # Process line
            processed += len(line)
            
            # Report progress every 5 seconds or 10% completion
            if should_report_progress(processed, total_size):
                await ctx.report_progress(
                    processed,
                    total_size,
                    f"Processed {processed:,} of {total_size:,} bytes"
                )
    
    return f"Successfully processed {total_size:,} bytes"
```

TypeScript servers must use the lower-level protocol methods:

```
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const progressToken = request.params.meta?.progressToken;
  
  if (progressToken) {
    // Send progress updates
    await server.sendProgress({
      progressToken,
      progress: 1,
      total: 10,
      message: "Starting processing..."
    });
  }
  
  // Perform work...
  
  return {
    content: [{
      type: "text",
      text: "Task completed"
    }]
  };
});
```

## Common Issues

### Large Response Payloads

When server responses exceed buffer limits, timeouts can occur even for fast operations. The error appears as a timeout but the root cause is data size.

Large responses cause timeouts because serialization and transmission take longer than expected. Breaking data into pages prevents this issue while improving memory efficiency.

### Server Initialization Failures

Initialization timeouts often masquerade as request timeouts. The server fails to start properly, causing all subsequent requests to timeout.

```
# Debug initialization issues# 1. Run server standalone$python -m myserver # 2. Check for missing dependencies$pip list | grep mcp # 3. Verify environment variables$env | grep MCP
```

Common initialization problems include missing dependencies, incorrect Python/Node versions, or misconfigured environment variables. Always test servers standalone before integrating with clients.

### Transport Layer Issues

The TypeScript SDK has a known issue where `_transport` becomes undefined, causing requests to hang indefinitely:

```
// Workaround: Implement connection monitoring
class RobustMCPClient {
  private reconnectAttempts = 0;
  
  async callTool(name: string, args: any) {
    try {
      return await this.client.callTool(name, args);
    } catch (error) {
      if (error.code === -32001 && this.reconnectAttempts < 3) {
        // Attempt reconnection
        await this.reconnect();
        this.reconnectAttempts++;
        return this.callTool(name, args);
      }
      throw error;
    }
  }
  
  private async reconnect() {
    // Close existing connection
    await this.client.close();
    // Reinitialize client
    this.client = new Client(this.transport);
    await this.client.initialize();
    this.reconnectAttempts = 0;
  }
}
```

Transport issues require defensive programming. Implement retry logic and connection monitoring to handle intermittent failures gracefully.

## Examples

### File Processing Server with Progress Tracking

This example demonstrates a production-ready MCP server that processes large files without triggering timeouts. It implements progress notifications and chunked processing.

```
from mcp.server.fastmcp import FastMCP, Context
import asyncio
from typing import Optional

mcp = FastMCP("file-processor", request_timeout=300)

@mcp.tool()
async def analyze_logs(
    log_path: str,
    pattern: str,
    ctx: Context
) -> dict:
    """Analyze large log files with regex pattern matching"""
    
    # Initialize progress tracking
    start_time = asyncio.get_event_loop().time()
    last_progress_time = start_time
    
    # Get file size for accurate progress
    file_size = os.path.getsize(log_path)
    bytes_processed = 0
    matches = []
    
    async def report_progress_if_needed():
        nonlocal last_progress_time
        current_time = asyncio.get_event_loop().time()
        
        # Report every 5 seconds
        if current_time - last_progress_time > 5:
            percentage = (bytes_processed / file_size) * 100
            await ctx.report_progress(
                bytes_processed,
                file_size,
                f"Analyzing: {percentage:.1f}% complete"
            )
            last_progress_time = current_time
    
    # Process file in chunks to handle large files
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line_num, line in enumerate(f, 1):
            bytes_processed += len(line.encode('utf-8'))
            
            if re.search(pattern, line):
                matches.append({
                    "line_number": line_num,
                    "content": line.strip()[:100]  # Truncate long lines
                })
            
            # Report progress periodically
            if line_num % 10000 == 0:
                await report_progress_if_needed()
    
    # Final progress report
    await ctx.report_progress(
        file_size,
        file_size,
        f"Analysis complete: {len(matches)} matches found"
    )
    
    return {
        "total_lines": line_num,
        "matches_found": len(matches),
        "sample_matches": matches[:10],  # Return only first 10
        "processing_time": asyncio.get_event_loop().time() - start_time
    }

# Run server with custom timeout
if __name__ == "__main__":
    mcp.run()
```

This implementation processes files of any size without timing out. The progress reporting keeps the client informed while preventing timeout errors. For production use, consider adding error handling for file access issues and memory-efficient streaming for extremely large files.

### Database Query Server with Timeout Handling

Complex database queries often exceed default timeouts. This example shows proper timeout configuration and query optimization strategies.

```
import { FastMCP } from '@modelcontextprotocol/fastmcp';
import { Pool } from 'pg';

const mcp = new FastMCP({
  name: 'database-analyzer',
  version: '1.0.0'
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 240000,  // 4 minutes
  query_timeout: 240000
});

mcp.tool('analyze_customer_data', {
  description: 'Analyze customer behavior patterns',
  parameters: {
    startDate: { type: 'string', required: true },
    endDate: { type: 'string', required: true }
  }
}, async (params, context) => {
  const { startDate, endDate } = params;
  
  // Break complex query into stages
  const stages = [
    { name: 'Collecting transactions', weight: 0.4 },
    { name: 'Aggregating by customer', weight: 0.3 },
    { name: 'Computing patterns', weight: 0.3 }
  ];
  
  let progress = 0;
  
  // Stage 1: Get raw data
  await context.report_progress(0, 1, stages[0].name);
  
  const transactions = await pool.query(\`
    SELECT customer_id, amount, created_at
    FROM transactions
    WHERE created_at BETWEEN $1 AND $2
    LIMIT 1000000  -- Prevent runaway queries
  \`, [startDate, endDate]);
  
  progress += stages[0].weight;
  await context.report_progress(progress, 1, stages[1].name);
  
  // Stage 2: Aggregate data
  const aggregated = await pool.query(\`
    WITH customer_totals AS (
      SELECT 
        customer_id,
        COUNT(*) as transaction_count,
        SUM(amount) as total_spent,
        AVG(amount) as avg_transaction
      FROM transactions
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY customer_id
    )
    SELECT * FROM customer_totals
    ORDER BY total_spent DESC
    LIMIT 10000
  \`, [startDate, endDate]);
  
  progress += stages[1].weight;
  await context.report_progress(progress, 1, stages[2].name);
  
  // Stage 3: Compute patterns (simplified)
  const patterns = computePatterns(aggregated.rows);
  
  await context.report_progress(1, 1, 'Analysis complete');
  
  return {
    summary: {
      total_customers: aggregated.rowCount,
      date_range: { startDate, endDate },
      top_customers: aggregated.rows.slice(0, 10)
    },
    patterns: patterns
  };
});

function computePatterns(data) {
  // Pattern analysis logic here
  return {
    high_value_threshold: calculatePercentile(data, 0.9),
    average_customer_value: calculateAverage(data)
  };
}

mcp.run();
```

The database server demonstrates breaking complex operations into manageable stages. Each stage reports progress independently, and queries include LIMIT clauses to prevent runaway execution times. This approach works well for analytical workloads that would otherwise timeout.

### API Integration Server with Retry Logic

External API calls are prone to timeouts. This example implements robust retry logic and timeout handling for reliability.

```
from mcp.server.fastmcp import FastMCP, Context
import httpx
import asyncio
from typing import Any, Dict, Optional

mcp = FastMCP("api-integrator", request_timeout=180)

class APIClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=5.0),
            limits=httpx.Limits(max_connections=10)
        )
    
    async def fetch_with_retry(
        self, 
        url: str, 
        max_retries: int = 3,
        ctx: Optional[Context] = None
    ) -> Dict[str, Any]:
        """Fetch URL with exponential backoff retry"""
        
        for attempt in range(max_retries):
            try:
                if ctx:
                    await ctx.info(f"Fetching {url} (attempt {attempt + 1})")
                
                response = await self.client.get(url)
                response.raise_for_status()
                return response.json()
                
            except httpx.TimeoutException:
                if attempt == max_retries - 1:
                    raise
                
                wait_time = 2 ** attempt  # Exponential backoff
                if ctx:
                    await ctx.info(f"Timeout, retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            
            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 500 and attempt < max_retries - 1:
                    # Retry server errors
                    wait_time = 2 ** attempt
                    await asyncio.sleep(wait_time)
                    continue
                raise

api_client = APIClient()

@mcp.tool()
async def aggregate_market_data(
    symbols: list[str],
    ctx: Context
) -> Dict[str, Any]:
    """Fetch and aggregate market data for multiple symbols"""
    
    results = {}
    total = len(symbols)
    
    for i, symbol in enumerate(symbols):
        # Report progress for each symbol
        await ctx.report_progress(
            i, 
            total, 
            f"Fetching data for {symbol}"
        )
        
        try:
            # Fetch with retry logic
            data = await api_client.fetch_with_retry(
                f"https://api.example.com/quote/{symbol}",
                ctx=ctx
            )
            results[symbol] = data
            
        except Exception as e:
            # Log error but continue with other symbols
            await ctx.error(f"Failed to fetch {symbol}: {str(e)}")
            results[symbol] = {"error": str(e)}
        
        # Small delay to respect rate limits
        if i < total - 1:
            await asyncio.sleep(0.1)
    
    # Final progress
    await ctx.report_progress(
        total,
        total,
        f"Completed: {len([r for r in results.values() if 'error' not in r])}/{total} successful"
    )
    
    return {
        "successful": len([r for r in results.values() if 'error' not in r]),
        "failed": len([r for r in results.values() if 'error' in r]),
        "data": results
    }

# Cleanup on shutdown
@mcp.on_cleanup()
async def cleanup():
    await api_client.client.aclose()

if __name__ == "__main__":
    mcp.run()
```

This API integration server handles external service timeouts gracefully. The retry logic with exponential backoff prevents temporary failures from causing request timeouts. Progress reporting keeps the client informed during batch operations. Production deployments should add rate limiting and circuit breaker patterns for additional reliability.
