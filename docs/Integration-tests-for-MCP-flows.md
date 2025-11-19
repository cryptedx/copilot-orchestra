## Integration tests for MCP flows

Kashish Hora

Co-founder of MCPcat

[Try out MCPcat](https://mcpcat.io/app)

[MCP Testing](https://mcpcat.io/guides/topic/mcp-testing/)

## The Quick Answer

Test MCP integration flows using the Inspector CLI and pytest with in-memory client-server binding:

```
# Test with MCP Inspector CLI$npx @modelcontextprotocol/inspector --cli python server.py --method tools/call --tool-name search --tool-arg query="test"
```

```
# pytest integration test
import pytest
from mcp.server.fastmcp import FastMCP

@pytest.mark.asyncio
async def test_workflow():
    async with server.test_client() as client:
        result = await client.call_tool("search", query="test")
        assert result.content[0].text
```

This approach validates complete workflows including tool chaining, context preservation, and error handling. The Inspector provides immediate feedback during development while pytest enables automated CI/CD testing.

## Prerequisites

- Python 3.9+ or Node.js 18+
- MCP SDK installed (`pip install mcp` or `npm install @modelcontextprotocol/sdk`)
- pytest with async support (`pip install pytest pytest-asyncio`)
- MCP Inspector for interactive testing (`npm install -g @modelcontextprotocol/inspector`)

## Installation

Install the testing tools for your chosen language:

```
# Python testing setup$pip install mcp pytest pytest-asyncio pytest-timeout # TypeScript/JavaScript setup  $npm install --save-dev @modelcontextprotocol/sdk @modelcontextprotocol/inspector jest
```

For Docker-based testing environments:

```
# Clone MCP test utilities$git clone https://github.com/modelcontextprotocol/test-harness$cd test-harness && docker-compose up -d
```

## Configuration

Integration tests require specific configuration to simulate real-world MCP deployments. Create a test configuration that mirrors your production setup while maintaining isolation.

```
# test_config.py
import os
from mcp.server.fastmcp import FastMCP

TEST_CONFIG = {
    "connection_timeout": 5.0,  # Shorter for tests
    "invocation_timeout": 10.0,
    "max_retries": 2,
    "test_mode": True
}

def create_test_server():
    server = FastMCP("test-server", **TEST_CONFIG)
    # Configure test-specific handlers
    return server
```

The configuration should handle both stdio and HTTP transports to ensure compatibility across different deployment scenarios. Set appropriate timeouts that balance test speed with reliability - typically 5-10 seconds for integration tests versus 30+ seconds in production.

With HTTP+SSE transport, configure separate endpoints for the event stream and message handling:

```
// test-server.ts
const testConfig = {
  transport: "sse",
  endpoints: {
    sse: "/test-mcp",
    messages: "/test-messages"
  },
  sessionTimeout: 5000
};
```

## Usage

Integration testing MCP flows requires validating three critical aspects: protocol compliance, workflow integrity, and error resilience. Start by testing individual client-server interactions before progressing to complex multi-tool workflows.

### Basic Client-Server Testing

The fundamental pattern uses in-memory transport to eliminate network variables:

```
@pytest.mark.asyncio
async def test_tool_execution():
    server = FastMCP("test-server")
    
    @server.tool()
    async def calculate(a: int, b: int) -> str:
        return f"Result: {a + b}"
    
    async with server.test_client() as client:
        # Test tool discovery
        tools = await client.list_tools()
        assert len(tools.tools) == 1
        assert tools.tools[0].name == "calculate"
        
        # Test execution
        result = await client.call_tool("calculate", a=5, b=3)
        assert result.content[0].text == "Result: 8"
```

This pattern validates that tools are properly registered, parameters are correctly passed, and results match expectations. The test client automatically handles protocol serialization and session management.

### Multi-Tool Workflow Testing

Complex workflows require testing tool interactions and context preservation:

```
@pytest.mark.asyncio
async def test_data_pipeline():
    async with server.test_client() as client:
        # Step 1: Fetch data
        fetch_result = await client.call_tool(
            "fetch_data", 
            source="database"
        )
        data_id = fetch_result.content[0].text
        
        # Step 2: Process with context
        process_result = await client.call_tool(
            "process", 
            data_id=data_id,
            operation="transform"
        )
        
        # Step 3: Validate context preserved
        validate_result = await client.call_tool(
            "validate",
            process_id=process_result.meta["process_id"]
        )
        
        assert validate_result.meta["status"] == "success"
        assert validate_result.meta["context_preserved"] == True
```

Each step in the workflow depends on results from previous steps, testing the server's ability to maintain state and handle sequential operations. The test verifies both functional correctness and metadata propagation.

### Concurrent Request Testing

MCP servers must handle concurrent requests without race conditions:

```
@pytest.mark.asyncio
async def test_concurrent_operations():
    async with server.test_client() as client:
        # Launch multiple concurrent requests
        tasks = [
            client.call_tool("long_operation", id=i)
            for i in range(10)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Verify all completed successfully
        assert len(results) == 10
        assert all(r.content[0].text.startswith("Complete") for r in results)
        
        # Verify no cross-contamination
        ids = [r.meta["operation_id"] for r in results]
        assert len(set(ids)) == 10  # All unique
```

## Common Issues

**Error: Request timed out after 30 seconds**

MCP operations exceeding default timeouts require configuration adjustments. The root cause is often external API calls or complex computations within tool handlers. Configure timeouts appropriately:

```
# Extend timeout for specific operations
server = FastMCP("server", invocation_timeout=60.0)

@server.tool(timeout=120.0)  # Tool-specific timeout
async def long_running_analysis(data: str) -> str:
    # Complex operation
    pass
```

To prevent timeouts in production, implement progress reporting for long operations and consider breaking complex tools into smaller, composable units.

**Error: Session context lost between requests**

Session management issues manifest when subsequent requests can't access previous results. This typically occurs with improper HTTP+SSE implementation where the session ID isn't properly maintained:

```
# Ensure session persistence
async def test_session_persistence():
    async with server.test_client() as client:
        # Set context
        await client.call_tool("set_context", key="user_id", value="123")
        
        # Verify in subsequent request
        result = await client.call_tool("get_context", key="user_id")
        assert result.content[0].text == "123"
```

Implement proper session cleanup in teardown to prevent memory leaks during extended test runs.

**Error: Tool not found in multi-server setup**

When testing distributed MCP architectures, tools may not be discoverable across server boundaries. This occurs when servers aren't properly registered or network policies block discovery:

```
# Test tool discovery across servers
async def test_distributed_tools():
    # Start multiple servers
    servers = [create_server(f"server-{i}") for i in range(3)]
    
    async with create_federation_client(servers) as client:
        tools = await client.list_tools()
        
        # Verify all servers' tools are visible
        tool_names = [t.name for t in tools.tools]
        assert "server-0-tool" in tool_names
        assert "server-1-tool" in tool_names
        assert "server-2-tool" in tool_names
```

## Examples

### E-Commerce Order Processing Workflow

This example demonstrates testing a complete order processing pipeline with multiple integrated services:

```
# test_order_workflow.py
import pytest
from datetime import datetime
from mcp.server.fastmcp import FastMCP

class TestOrderWorkflow:
    @pytest.fixture
    async def ecommerce_server(self):
        server = FastMCP("ecommerce-test")
        
        # Mock database
        orders = {}
        inventory = {"PROD-123": 10}
        
        @server.tool()
        async def check_inventory(product_id: str) -> dict:
            return {
                "available": inventory.get(product_id, 0),
                "reserved": 0
            }
        
        @server.tool()
        async def create_order(product_id: str, quantity: int) -> dict:
            if inventory.get(product_id, 0) < quantity:
                raise ValueError("Insufficient inventory")
            
            order_id = f"ORD-{len(orders) + 1}"
            orders[order_id] = {
                "id": order_id,
                "product_id": product_id,
                "quantity": quantity,
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }
            
            inventory[product_id] -= quantity
            return orders[order_id]
        
        @server.tool()
        async def process_payment(order_id: str, amount: float) -> dict:
            if order_id not in orders:
                raise ValueError("Order not found")
            
            # Simulate payment processing
            orders[order_id]["status"] = "paid"
            orders[order_id]["payment"] = {
                "amount": amount,
                "processed_at": datetime.now().isoformat()
            }
            
            return {"status": "success", "transaction_id": "TXN-12345"}
        
        return server
    
    @pytest.mark.asyncio
    async def test_successful_order_flow(self, ecommerce_server):
        async with ecommerce_server.test_client() as client:
            # Check inventory
            inventory = await client.call_tool(
                "check_inventory",
                product_id="PROD-123"
            )
            assert inventory.content[0].data["available"] == 10
            
            # Create order
            order = await client.call_tool(
                "create_order",
                product_id="PROD-123",
                quantity=2
            )
            order_data = order.content[0].data
            assert order_data["status"] == "pending"
            assert order_data["quantity"] == 2
            
            # Process payment
            payment = await client.call_tool(
                "process_payment",
                order_id=order_data["id"],
                amount=99.99
            )
            assert payment.content[0].data["status"] == "success"
            
            # Verify inventory updated
            final_inventory = await client.call_tool(
                "check_inventory", 
                product_id="PROD-123"
            )
            assert final_inventory.content[0].data["available"] == 8
```

This test validates the complete order lifecycle including inventory management, order creation, and payment processing. The production version would include additional error handling for payment failures, inventory conflicts, and order cancellations. The test structure ensures each step depends on previous results, mimicking real-world sequential processing.

### Distributed Data Analysis Pipeline

Testing MCP servers that coordinate across multiple data sources and analysis tools:

```
# test_analysis_pipeline.py
import pytest
import asyncio
from mcp.server.fastmcp import FastMCP

class TestAnalysisPipeline:
    @pytest.fixture
    async def analysis_servers(self):
        # Data source server
        data_server = FastMCP("data-source")
        
        @data_server.tool()
        async def fetch_dataset(dataset_id: str) -> dict:
            # Simulate data fetching
            return {
                "id": dataset_id,
                "records": 1000,
                "format": "parquet",
                "location": f"s3://test-bucket/{dataset_id}"
            }
        
        # Analysis server
        ml_server = FastMCP("ml-analysis")
        
        @ml_server.tool()
        async def run_analysis(dataset_location: str, model: str) -> dict:
            # Simulate ML analysis
            await asyncio.sleep(0.5)  # Simulate processing
            return {
                "model": model,
                "accuracy": 0.94,
                "predictions": 1000,
                "confidence_intervals": [0.92, 0.96]
            }
        
        # Reporting server
        report_server = FastMCP("reporting")
        
        @report_server.tool()
        async def generate_report(analysis_results: dict) -> str:
            return f"Analysis complete: {analysis_results['accuracy']:.2%} accuracy"
        
        return data_server, ml_server, report_server
    
    @pytest.mark.asyncio
    async def test_distributed_analysis(self, analysis_servers):
        data_server, ml_server, report_server = analysis_servers
        
        # Create federated client
        async with data_server.test_client() as data_client, \
                   ml_server.test_client() as ml_client, \
                   report_server.test_client() as report_client:
            
            # Step 1: Fetch data
            dataset = await data_client.call_tool(
                "fetch_dataset",
                dataset_id="customer-segments-2024"
            )
            dataset_info = dataset.content[0].data
            
            # Step 2: Run analysis
            analysis = await ml_client.call_tool(
                "run_analysis",
                dataset_location=dataset_info["location"],
                model="gradient_boost"
            )
            results = analysis.content[0].data
            
            # Step 3: Generate report
            report = await report_client.call_tool(
                "generate_report",
                analysis_results=results
            )
            
            assert "94.00% accuracy" in report.content[0].text
            assert results["confidence_intervals"] == [0.92, 0.96]
    
    @pytest.mark.asyncio  
    async def test_pipeline_error_handling(self, analysis_servers):
        data_server, ml_server, _ = analysis_servers
        
        async with data_server.test_client() as data_client, \
                   ml_server.test_client() as ml_client:
            
            # Test with invalid dataset
            dataset = await data_client.call_tool(
                "fetch_dataset",
                dataset_id="invalid-dataset"
            )
            
            # Analysis should handle missing data gracefully
            with pytest.raises(Exception) as exc_info:
                await ml_client.call_tool(
                    "run_analysis",
                    dataset_location="s3://test-bucket/invalid-dataset",
                    model="unknown_model"
                )
            
            assert "model not found" in str(exc_info.value).lower()
```

This example demonstrates testing distributed MCP architectures where different servers handle specific responsibilities. The production implementation would include circuit breakers for failed services, retry logic with exponential backoff, and comprehensive audit logging for compliance requirements.

This example demonstrates testing distributed MCP architectures where different servers handle specific responsibilities. The production implementation would include circuit breakers for failed services, retry logic with exponential backoff, and comprehensive audit logging for compliance requirements.
