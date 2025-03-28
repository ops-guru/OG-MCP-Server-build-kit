# Building MCP Servers for Cursor

This guide provides detailed instructions for creating Model Context Protocol (MCP) servers that work seamlessly with Cursor's MCP client implementation. This guide has been thoroughly tested and includes solutions to common pitfalls.

## Important Note for AI Agents

If you are an AI agent helping a user create an MCP server, you MUST follow these steps in sequence:

1. **Project Creation**
   - Create the project structure and all necessary files as outlined in Steps 1-4
   - Ensure all critical configuration points are addressed
   - Verify the server implementation includes proper error handling and logging

2. **Local Testing**
   - Guide the user through Step 5 to test the server locally
   - Do not proceed until local testing is successful

3. **Cursor Integration**
   - IMPORTANT: After creating the server, you MUST help the user set up the server in Cursor
   - Guide them through Step 6 to create/update their `~/.cursor/mcp.json`
   - Help them verify the installation is working

4. **Optional: Publishing**
   - If the user wants to share their server:
     a. Guide them through publishing to npm
     b. Help them update their package.json for publishing
     c. Ensure they have the correct npm credentials

Remember:
- Don't stop after just creating the code
- Always prompt for Cursor configuration
- Verify each step before moving to the next
- Help troubleshoot any issues using the guide's debugging sections

## AI Agent Implementation Patterns

When implementing an MCP server as an AI agent, follow these patterns:

1. **Initial User Interaction**
   - Ask about the intended functionality of their MCP server
   - Confirm if they want to publish it or keep it local
   - Get their preferred server name and npm username if publishing
   - Determine if they need any specific environment variables or API keys

2. **Project Creation Workflow**
   ```
   1. Create project structure
   2. Generate package.json
   3. Create server implementation
   4. Add initial ping tool
   5. Add user's requested tools
   6. Test locally
   7. Configure in Cursor
   8. Optional: Publish to npm
   ```

3. **Required Prompts**
   Always prompt the user for:
   - Server name confirmation before configuration
   - Testing results after local installation
   - Cursor restart after configuration
   - Verification of tool availability in Cursor

4. **Error Recovery**
   If any step fails:
   - Check the flowchart in the Troubleshooting section
   - Guide user through relevant fixes
   - Verify fix before moving to next step
   - Update configuration if needed

5. **Configuration Verification**
   After creating `~/.cursor/mcp.json`:
   - Confirm file exists
   - Verify JSON syntax
   - Check server name matches
   - Test with ping tool
   - Monitor logs for errors

6. **Documentation Requirements**
   Always create:
   - README.md with setup instructions
   - Comments in server code
   - Tool documentation
   - Troubleshooting notes

7. **Publishing Checklist**
   If publishing:
   - Verify package name availability
   - Check npm credentials
   - Test package locally
   - Update all documentation
   - Guide through npm publish
   - Verify installation works

## User Interaction Guidelines for AI Agents

1. **Gathering Requirements**
   ```
   Ask → Confirm → Clarify → Proceed
   ```
   - Ask specific questions about requirements
   - Confirm understanding before proceeding
   - Clarify any ambiguities immediately
   - Only proceed when requirements are clear

2. **Verification Points**
   After each major step:
   ```
   Action → Check → Verify → Continue/Fix
   ```
   - Confirm the action completed successfully
   - Check for expected output/behavior
   - Verify with the user if needed
   - Either continue or fix issues

3. **Error Handling**
   When errors occur:
   ```
   Detect → Explain → Guide → Verify
   ```
   - Detect the specific error
   - Explain the issue in simple terms
   - Guide through the fix step by step
   - Verify the fix resolved the issue

4. **Configuration Steps**
   For each configuration:
   ```
   Propose → Implement → Test → Confirm
   ```
   - Propose the configuration change
   - Implement after user approval
   - Test the configuration
   - Confirm it's working as expected

5. **Tool Implementation**
   For each tool:
   ```
   Design → Implement → Test → Document
   ```
   - Design the tool interface
   - Implement the functionality
   - Test with example inputs
   - Document usage and parameters

## Core Concepts

1. **Model Context Protocol (MCP)** - A standardized protocol for communication between AI assistants and external tools.
2. **MCP Server** - A service that provides tools/functions that can be called by an AI assistant.
3. **MCP Client** - The component that connects the AI (Claude in Cursor) to your MCP server.
4. **npx Execution Model** - How Cursor launches your MCP server using `npx -y`.

## Critical Requirements

Before starting, understand these critical requirements:

1. **Module System Compatibility**:
   - The MCP SDK is an ESM package, but your server MUST use CommonJS
   - You MUST use dynamic imports for the MCP SDK
   - Server files MUST use `.cjs` extension
   - Package.json MUST specify `"type": "commonjs"`

2. **Transport Layer**:
   - Use `StdioServerTransport` without custom event handlers
   - Don't mix raw stdout writes with transport communication
   - Let the MCP SDK handle the JSONRPC protocol

3. **Server Name**:
   - Must match exactly between server code and Cursor configuration
   - Use lowercase with hyphens (e.g., 'my-server-name')

4. **Debugging**:
   - Implement comprehensive file-based logging
   - Log startup, initialization, and tool execution
   - Don't rely on console.log/error (they interfere with transport)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Basic JavaScript/TypeScript knowledge

## Step 1: Project Setup

Create a new npm package:

```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
```

Update your `package.json`:

```json
{
  "name": "@yourusername/mcp-your-server-name",
  "version": "0.1.0",
  "description": "MCP server for...",
  "type": "commonjs",
  "main": "index.js",
  "bin": {
    "mcp-your-server-name": "bin/server.cjs"
  },
  "scripts": {
    "start": "node bin/server.cjs"
  },
  "keywords": [
    "mcp",
    "modelcontextprotocol"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.7.0",
    "zod": "^3.24.2"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**CRITICAL CONFIGURATION POINTS:**
1. `"type": "commonjs"` - Required for npx compatibility
2. `.cjs` extension in bin field - Ensures CommonJS interpretation
3. bin field must match your intended command name
4. Package name should be scoped (@username) for npm publish

## Step 2: Install Dependencies

```bash
npm install @modelcontextprotocol/sdk zod
```

## Step 3: Create Basic Server Implementation

Create the server file:

```bash
mkdir bin
touch bin/server.cjs
chmod +x bin/server.cjs  # Make executable
```

Implement your server in `bin/server.cjs`:

```javascript
#!/usr/bin/env node

// This is a CommonJS wrapper that loads ESM modules
async function runServer() {
  try {
    // Set up logging to help with debugging
    const logFile = `${process.env.HOME || process.env.USERPROFILE}/mcp-debug.log`;
    const logToFile = async (message) => {
      try {
        const fs = await import('fs');
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
        // Force flush logs
        fs.fsyncSync(fs.openSync(logFile, 'a'));
      } catch (e) {
        console.error('Error writing to log:', e);
      }
    };

    // Clear the log file on startup
    try {
      const fs = await import('fs');
      fs.writeFileSync(logFile, '');
    } catch (e) {
      console.error('Error clearing log file:', e);
    }

    await logToFile('===== Starting MCP server =====');
    await logToFile(`Process ID: ${process.pid}`);
    await logToFile(`Working directory: ${process.cwd()}`);
    await logToFile(`Node version: ${process.version}`);
    await logToFile(`Platform: ${process.platform}`);
    await logToFile(`Stdin isTTY: ${Boolean(process.stdin.isTTY)}`);
    await logToFile(`Stdout isTTY: ${Boolean(process.stdout.isTTY)}`);

    // Handle process events
    process.on('exit', async (code) => {
      await logToFile(`Server exiting with code ${code}`);
    });

    process.on('uncaughtException', async (error) => {
      await logToFile(`Uncaught exception: ${error.message}\n${error.stack || ''}`);
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      await logToFile(`Unhandled rejection: ${reason}`);
      process.exit(1);
    });

    process.stdin.on('end', async () => {
      await logToFile('stdin stream ended - client disconnected');
      process.exit(0);
    });

    // Load MCP SDK and dependencies first
    await logToFile('Loading MCP SDK via dynamic imports...');
    const mcp = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const stdio = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const z = await import('zod');
    await logToFile('MCP SDK loaded successfully');

    // Create server instance
    await logToFile('Creating MCP server with name: your-server-name');
    const server = new mcp.McpServer({
      name: 'your-server-name',
      version: '0.1.0'
    });

    // Add ping tool for testing
    await logToFile('Registering ping tool');
    server.tool('ping', {
      message: z.z.string().optional()
    }, async (params) => {
      await logToFile(`Ping tool called with message: ${params.message || '<no message>'}`);
      return {
        content: [{
          type: 'text',
          text: `Pong! Server is working. You sent: ${params.message || '<no message>'}`
        }]
      };
    });

    // Set up transport and connect
    await logToFile('Creating stdio transport and connecting...');
    const transport = new stdio.StdioServerTransport();
    server.connect(transport);
    await logToFile('Server connected to transport');

    // Log periodic status updates
    setInterval(async () => {
      await logToFile('=== Server Status ===');
      await logToFile(`Process uptime: ${process.uptime()} seconds`);
      await logToFile(`Memory usage: ${JSON.stringify(process.memoryUsage())}`);
      await logToFile('==================');
    }, 5000);

    await logToFile('Server ready and waiting for requests');
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

runServer().catch(console.error);
```

**CRITICAL IMPLEMENTATION POINTS:**

1. **Module Loading**:
   - Use dynamic imports for ALL MCP SDK modules
   - Don't mix require() with import()
   - Keep everything in an async function

2. **Logging**:
   - Implement file-based logging
   - Log ALL critical operations
   - Don't use console.log/error for normal operation
   - Flush logs to ensure they're written

3. **Transport**:
   - Use StdioServerTransport without modification
   - Don't add custom event handlers
   - Don't write directly to stdout
   - Let the SDK handle all JSONRPC

4. **Error Handling**:
   - Catch and log all errors
   - Handle process events
   - Handle stdin end event
   - Exit gracefully on errors

## Step 4: Create CommonJS Entry Point

Create `index.js`:

```javascript
// This file exists to satisfy Node module conventions
module.exports = {};
```

**IMPORTANT**: Use `module.exports`, not `export default`.

## Step 5: Testing Locally

1. **Install globally**:
```bash
npm install -g .
```

2. **Test direct execution**:
```bash
mcp-your-server-name
```

3. **Test with npx**:
```bash
npx .
```

4. **Check logs**:
```bash
cat ~/mcp-debug.log
```

## Step 6: Quick Setup in Cursor

For a quick start with your MCP server in Cursor:

1. **Add MCP Server Configuration**
   Create or update your Cursor MCP configuration file at `~/.cursor/mcp.json`:
   ```json
   {
     "servers": {
       "my-mcp-server": {
         "command": "npx -y my-mcp-server"
       }
     }
   }
   ```

2. **Verify Installation**
   - Restart Cursor to load the new MCP configuration
   - The server's logs will be written to `~/mcp-debug.log`
   - You can verify the server is working by:
     a. Opening Cursor's command palette
     b. Running the command "MCP: Test Tool"
     c. Selecting "my-mcp-server" and the "ping" tool
     d. Optionally providing a message parameter
     e. Checking the response ("Pong!") and the log file for confirmation

3. **Troubleshooting**
   - If the server doesn't appear in Cursor's MCP tools:
     * Verify the server name in `mcp.json` matches the name in your server code
     * Check `~/mcp-debug.log` for startup errors
     * Ensure the `bin` field in package.json matches your server name
   - If you see connection errors:
     * Verify the server is executable (`chmod +x bin/server.cjs`)
     * Check if `npx -y my-mcp-server` works in terminal
     * Look for error messages in Cursor's developer console

4. **Development Tips**
   - Monitor `~/mcp-debug.log` while developing
   - Test tool changes by restarting Cursor
   - Use the log file to debug tool execution and parameter handling

## Advanced Configuration

### Managing Multiple Servers

You can configure multiple MCP servers in your `~/.cursor/mcp.json` file:

```json
{
  "servers": {
    "utility-server": {
      "command": "npx -y @yourusername/mcp-utility-server"
    },
    "data-processing": {
      "command": "node ./local/path/to/server.cjs"
    },
    "api-server": {
      "command": "env API_KEY=your-secret-key npx -y @yourusername/mcp-api-server"
    }
  }
}
```

### Environment Variables and Secrets

Some MCP servers require environment variables or API keys:

1. **Using env command**:
   ```json
   {
     "servers": {
       "api-server": {
         "command": "env API_KEY=your-secret-key npx -y @yourusername/mcp-api-server"
       }
     }
   }
   ```

2. **Using environment files**:
   ```json
   {
     "servers": {
       "api-server": {
         "command": "bash -c \"source .env && npx -y @yourusername/mcp-api-server\""
       }
     }
   }
   ```

### Version Management

Control server versions in your configuration:

1. **Pin specific version**:
   ```json
   {
     "servers": {
       "stable-server": {
         "command": "npx -y @yourusername/mcp-server@1.2.3"
       }
     }
   }
   ```

2. **Use latest version**:
   ```json
   {
     "servers": {
       "edge-server": {
         "command": "npx -y @yourusername/mcp-server@latest"
       }
     }
   }
   ```

### Development vs Production

Different configurations for different environments:

1. **Development** (using local files):
   ```json
   {
     "servers": {
       "dev-server": {
         "command": "node ./bin/server.cjs"
       }
     }
   }
   ```

2. **Production** (using published package):
   ```json
   {
     "servers": {
       "prod-server": {
         "command": "npx -y @yourusername/mcp-server"
       }
     }
   }
   ```

### Best Practices

1. **Server Naming**
   - Use descriptive, lowercase names with hyphens
   - Match names exactly between code and configuration
   - Use scoped package names (@username/package-name)

2. **Version Control**
   - Pin versions in production
   - Test updates in development first
   - Keep a changelog
   - Document breaking changes

3. **Security**
   - Never commit sensitive values
   - Use environment files for local development
   - Consider secrets management for production
   - Document required environment variables

4. **Monitoring**
   - Check logs regularly
   - Monitor server resource usage
   - Set up error notifications
   - Keep backups of configurations

## Publishing Your MCP Server

If you want to share your MCP server with others, you'll need to publish it to npm:

1. **Prepare for Publishing**
   - Ensure your package.json is properly configured:
     ```json
     {
       "name": "@yourusername/mcp-your-server-name",
       "version": "0.1.0",
       "publishConfig": {
         "access": "public"
       }
     }
     ```
   - Update README.md with:
     * Installation instructions
     * Configuration steps
     * Available tools and their parameters
     * Example usage

2. **Create npm Account**
   ```bash
   npm adduser
   ```
   Follow the prompts to create or login to your npm account

3. **Test Package**
   ```bash
   # Pack without publishing
   npm pack
   
   # Verify contents
   tar -tvf *.tgz
   ```

4. **Publish Package**
   ```bash
   # For first-time publish
   npm publish --access public
   
   # For updates
   npm version patch  # or minor/major
   npm publish
   ```

5. **Verify Installation**
   ```bash
   # Create test directory
   mkdir test-install
   cd test-install
   
   # Test install
   npm install @yourusername/mcp-your-server-name
   
   # Verify it runs
   npx @yourusername/mcp-your-server-name
   ```

6. **Update Cursor Configuration**
   After publishing, users can install your server by adding to their `~/.cursor/mcp.json`:
   ```json
   {
     "servers": {
       "your-server-name": {
         "command": "npx -y @yourusername/mcp-your-server-name"
       }
     }
   }
   ```

## Troubleshooting Flowchart

Use this flowchart to diagnose and resolve common MCP server issues:

```
Start
  │
  ├─► Is server visible in Cursor Settings?
  │   │
  │   ├─► NO ──┐
  │   │        │
  │   │        ▼
  │   │    Check ~/.cursor/mcp.json
  │   │        │
  │   │        ├─► File exists? ──► NO ──► Create file with correct structure
  │   │        │
  │   │        ├─► Correct format? ──► NO ──► Fix JSON syntax
  │   │        │
  │   │        └─► Server config present? ──► NO ──► Add server configuration
  │   │
  │   └─► YES ─┐
  │            │
  │            ▼
  ├─► Is server enabled?
  │   │
  │   ├─► NO ──► Enable server in Cursor Settings
  │   │
  │   └─► YES ─┐
  │            │
  │            ▼
  ├─► Do tools appear in server listing?
  │   │
  │   ├─► NO ──┐
  │   │        │
  │   │        ▼
  │   │    Check server logs (~/mcp-debug.log)
  │   │        │
  │   │        ├─► Server starting? ──► NO ──► Check npm installation
  │   │        │
  │   │        ├─► MCP SDK loaded? ──► NO ──► Check dynamic imports
  │   │        │
  │   │        └─► Tools registered? ──► NO ──► Check tool registration code
  │   │
  │   └─► YES ─┐
  │            │
  │            ▼
  ├─► Can you use the ping tool?
  │   │
  │   ├─► NO ──┐
  │   │        │
  │   │        ▼
  │   │    Check error type
  │   │        │
  │   │        ├─► "Client closed" ──► Check stdout usage
  │   │        │
  │   │        ├─► "Failed to create client" ──► Verify server name match
  │   │        │
  │   │        └─► Transport error ──► Check StdioServerTransport setup
  │   │
  │   └─► YES ─┐
  │            │
  │            ▼
  └─► Server is working! Add more tools.

Common Fixes:
┌────────────────────────────────────────┐
│ 1. Server not found:                   │
│    - npm install -g .                  │
│    - Check package.json bin field      │
│                                        │
│ 2. Module loading errors:              │
│    - Use .cjs extension                │
│    - Use dynamic imports               │
│    - Set "type": "commonjs"           │
│                                        │
│ 3. Transport issues:                   │
│    - Don't modify transport            │
│    - Avoid console.log/error           │
│    - Let SDK handle JSONRPC            │
│                                        │
│ 4. Name mismatch:                      │
│    - Check server code                 │
│    - Check mcp.json                    │
│    - Use exact same name               │
└────────────────────────────────────────┘
```

Quick Resolution Steps:
1. Check logs first (`~/mcp-debug.log`)
2. Verify server configuration in `~/.cursor/mcp.json`
3. Ensure server is enabled in Cursor Settings
4. Test with ping tool
5. Check specific error messages against common fixes

## Common Pitfalls and Solutions

1. **"Client closed" Error**:
   - Cause: Mixing stdout writes with transport
   - Solution: Only use transport for communication

2. **"Failed to create client" Error**:
   - Cause: Server name mismatch or initialization failure
   - Solution: Ensure names match exactly

3. **Module Loading Errors**:
   - Cause: ESM/CommonJS mismatch
   - Solution: Use dynamic imports and .cjs extension

4. **Transport Errors**:
   - Cause: Custom event handlers or modifications
   - Solution: Use transport as-is from SDK

5. **Working Directory Issues**:
   - Cause: Assuming specific paths
   - Solution: Use absolute paths or handle path resolution

## Debugging Tips

1. **Check Logs First**:
   ```bash
   cat ~/mcp-debug.log
   ```

2. **Verify Server Name**:
   - In server code: `name: 'your-server-name'`
   - In Cursor settings
   - In ~/.cursor/mcp.json

3. **Test Basic Connectivity**:
   - Use the ping tool first
   - Check logs for initialization
   - Verify transport connection

4. **Common Log Messages**:
   - "Server starting": Basic startup
   - "MCP SDK loaded": Module loading
   - "Server connected": Transport ready
   - "Ping tool called": Tool execution

## Best Practices

1. **Always Include Ping Tool**:
   - Helps verify basic functionality
   - Easy to test
   - Shows transport working

2. **Implement Good Logging**:
   - Use file-based logging
   - Log all critical operations
   - Include timestamps
   - Flush logs regularly

3. **Handle Errors Properly**:
   - Catch and log all errors
   - Exit gracefully
   - Provide useful error messages

4. **Keep It Simple**:
   - Don't modify transport
   - Don't add custom protocols
   - Let SDK handle JSONRPC

5. **Test Incrementally**:
   - Start with basic server
   - Add ping tool
   - Test thoroughly
   - Add more tools

By following this guide exactly, you should be able to create a working MCP server that integrates smoothly with Cursor. Remember to test thoroughly at each step and check the logs for any issues. 