// Test what user ID this secret authenticates to
const secret = "CAFMM-EUGKP-WZ3B5-F7D5U-J6K7E-XSVBI-3MZVQ-3G2TN-XCQUM-MJ2K6-OQ";

async function testAuth() {
  const response = await fetch('https://zen.combinedmemory.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Secret': secret
    },
    body: JSON.stringify({
      tool: 'list_tasks',
      arguments: {}
    })
  });
  
  const data = await response.json();
  console.log('MCP Response:', JSON.stringify(data, null, 2));
}

testAuth();
