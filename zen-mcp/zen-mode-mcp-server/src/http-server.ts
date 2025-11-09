/**
 * HTTP Server wrapper for Zen Mode MCP
 *
 * Exposes the MCP server over HTTP/SSE for Cloudflare Tunnel access
 *
 * Created: 2025-11-08T01:05:00Z
 * Author: Quinn May with Claude Code
 */

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const PORT = process.env.PORT || 3000;
const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'zen-mode-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// MCP SSE endpoint
app.get('/sse', async (req, res) => {
  console.log('📡 New SSE connection from:', req.ip);

  // Create a new MCP server instance for this connection
  // Note: We'll need to refactor src/index.ts to export the server setup
  // For now, this is a placeholder that shows the pattern

  const transport = new SSEServerTransport('/sse', res);

  // TODO: Create and connect MCP server instance
  // const mcpServer = createZenModeServer();
  // await mcpServer.connect(transport);

  req.on('close', () => {
    console.log('📴 SSE connection closed');
    // mcpServer.close();
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Zen Mode MCP Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      sse: '/sse',
    },
    documentation: 'https://github.com/yourusername/zen-mode-mcp',
  });
});

const server = app.listen(PORT, () => {
  console.log(`✅ Zen Mode MCP HTTP server running on port ${PORT}`);
  console.log(`📍 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Ready for Cloudflare Tunnel!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⏹️  Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
