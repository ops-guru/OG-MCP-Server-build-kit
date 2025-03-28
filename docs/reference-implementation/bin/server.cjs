#!/usr/bin/env node

/**
 * Minimal MCP Server Reference Implementation
 * This server implements the bare minimum needed for a working MCP server,
 * including proper error handling, logging, and a ping tool for testing.
 */

async function runServer() {
  // Set up logging
  const logFile = `${process.env.HOME || process.env.USERPROFILE}/mcp-reference.log`;
  const logToFile = async (message) => {
    try {
      const fs = await import('fs');
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
      fs.fsyncSync(fs.openSync(logFile, 'a'));
    } catch (e) {
      console.error('Logging failed:', e);
    }
  };

  try {
    // Clear log file on startup
    const fs = await import('fs');
    fs.writeFileSync(logFile, '');

    // Log startup information
    await logToFile('=== MCP Reference Server Starting ===');
    await logToFile(`PID: ${process.pid}`);
    await logToFile(`CWD: ${process.cwd()}`);

    // Handle process events
    process.on('exit', (code) => void logToFile(`Server exiting with code ${code}`));
    process.on('uncaughtException', (error) => {
      void logToFile(`Fatal error: ${error.message}\n${error.stack}`);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
      void logToFile(`Unhandled rejection: ${reason}`);
      process.exit(1);
    });
    process.stdin.on('end', () => {
      void logToFile('Client disconnected');
      process.exit(0);
    });

    // Load dependencies
    await logToFile('Loading MCP SDK...');
    const mcp = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const stdio = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const z = await import('zod');
    await logToFile('Dependencies loaded');

    // Initialize server
    const server = new mcp.McpServer({
      name: 'reference-server',
      version: '0.1.0'
    });

    // Add ping tool
    server.tool('ping', {
      message: z.z.string().optional()
    }, async (params) => {
      await logToFile(`Ping received: ${params.message || '<no message>'}`);
      return {
        content: [{
          type: 'text',
          text: `Pong! Message: ${params.message || '<no message>'}`
        }]
      };
    });

    // Connect transport
    const transport = new stdio.StdioServerTransport();
    server.connect(transport);
    await logToFile('Server ready');

    // Status updates
    setInterval(() => {
      void logToFile(`Status: uptime=${process.uptime()}s`);
    }, 30000);
  } catch (error) {
    await logToFile(`Startup failed: ${error.message}\n${error.stack}`);
    process.exit(1);
  }
}

runServer().catch(console.error); 