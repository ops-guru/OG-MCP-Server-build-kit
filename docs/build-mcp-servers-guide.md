# Building MCP Servers for Cursor

This guide provides detailed instructions for creating Model Context Protocol (MCP) servers that work seamlessly with Cursor's MCP client implementation. This guide has been thoroughly tested and includes solutions to common pitfalls.

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

## Step 6: Configuring Your Server in Cursor

### Understanding Cursor's MCP Configuration

Cursor uses a configuration file located at `~/.cursor/mcp.json` to manage MCP servers. While you can edit this file directly, it's recommended to use Cursor's built-in settings UI for configuration.

### Configuration Steps

1. **Open Cursor Settings**
   - Use the keyboard shortcut `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
   - Or click on the gear icon in the bottom left corner
   - Navigate to the "MCP" section in the left sidebar
   - You'll see the "MCP Servers" section with a blue "+ Add new global MCP server" button at the top right

   ![MCP Servers Configuration](documentation/images/mcp-servers-config.png)

   The MCP Servers section shows:
   - A list of configured servers with their enabled/disabled status
   - Tools available for each server
   - The command used to start each server
   - Resource status
   - Action buttons for each server (reload, edit, etc.)

2. **Add New Server**
   - Click the "+ Add new global MCP server" button
   - This will open the `~/.cursor/mcp.json` file
   - Add your server configuration to the `mcpServers` object using this structure:
   
   ```json
   {
     "mcpServers": {
       "your-server-name": {
         "command": "npx",
         "args": [
           "-y",
           "your-package-name"
         ]
       }
     }
   }
   ```

   Example of a real configuration:
   ```json
   {
     "mcpServers": {
       "timekeeping": {
         "command": "npx",
         "args": [
           "-y",
           "mcp-timekeeping-server"
         ]
       }
     }
   }
   ```

   The configuration file supports multiple servers, as shown in the example below:
   ```json
   {
     "mcpServers": {
       "sequential-thinking": {
         "command": "npx",
         "args": [
           "-y",
           "@modelcontextprotocol/server-sequential-thinking"
         ]
       },
       "browser-tools": {
         "command": "npx",
         "args": [
           "@agentdeskai/browser-tools-mcp@1.0.11"
         ]
       }
     }
   }
   ```

3. **Configuration Fields**:
   - `mcpServers`: The root object containing all server configurations
   - Server name (e.g., "timekeeping"): Must match your server's name in code
   - `command`: Usually "npx" for npm packages
   - `args`: Array of command arguments
     - `-y`: Optional, automatically answers "yes" to npx prompts
     - Package name: Your published package name

### Testing the Configuration

1. **Restart Cursor**
   - Close and reopen Cursor to ensure changes take effect
   - Or use the Command Palette (Cmd/Ctrl+Shift+P) and search for "Reload Window"

2. **Verify Server Configuration**
   - Open Cursor Settings (Cmd/Ctrl+,)
   - Navigate to the MCP section
   - Your server should appear in the list with:
     - Enabled/disabled status
     - Available tools
     - Command configuration
     - Resource status
   - Use the action buttons (reload, edit) to manage your server

3. **Test Connection**
   - With your server enabled, try using one of its tools
   - For example, use the ping tool if you've implemented one
   - You should see a successful response in the chat

### Troubleshooting Configuration

If your server doesn't appear or work as expected:

1. **Check Server Name Match**
   - The name in your server code MUST match exactly:
     ```javascript
     const server = new mcp.McpServer({
       name: 'your-server-name',  // This name
       version: '0.1.0'
     });
     ```
   - Must match the name in Cursor settings
   - Must match the name in `~/.cursor/mcp.json`

2. **Verify Installation**
   ```bash
   # Check global installation
   npm list -g | grep mcp-your-server-name
   
   # Test direct execution
   mcp-your-server-name
   ```

3. **Check Logs**
   - Server logs: `~/mcp-debug.log`
   - Cursor logs: Check the Developer Tools (Help > Toggle Developer Tools)

4. **Common Configuration Errors**
   - "Server not found": Check npm installation and package name
   - "Failed to start server": Check command and arguments
   - "Server not responding": Check server name match
   [SCREENSHOT 7: Example error message and resolution]

### Configuration Best Practices

1. **Use Scoped Package Names**
   - Always use scoped names (@username/package-name)
   - Helps avoid naming conflicts
   - Makes server identification clearer

2. **Version Management**
   - Use exact versions in package.json
   - Update versions carefully
   - Test after version changes

3. **Multiple Environments**
   - Development: Use direct path
     ```json
     {
       "name": "your-server-name",
       "command": "node",
       "args": ["./bin/server.cjs"]
     }
     ```
   - Production: Use npx installation
     ```json
     {
       "name": "your-server-name",
       "command": "npx",
       "args": ["-y", "@yourusername/mcp-your-server-name"]
     }
     ```

## Advanced Configuration

### Managing Multiple Servers

You can configure multiple MCP servers in your `~/.cursor/mcp.json` file. Each server can have its own configuration and purpose:

```json
{
  "mcpServers": {
    "utility-server": {
      "command": "npx",
      "args": ["-y", "@yourusername/mcp-utility-server"]
    },
    "data-processing": {
      "command": "node",
      "args": ["./local/path/to/server.cjs"]
    },
    "api-server": {
      "command": "env",
      "args": [
        "API_KEY=your-secret-key",
        "npx",
        "-y",
        "@yourusername/mcp-api-server"
      ]
    }
  }
}
```

Best practices for managing multiple servers:
1. Use descriptive names that reflect each server's purpose
2. Keep related tools grouped in the same server
3. Consider splitting complex functionality across multiple focused servers
4. Use consistent naming conventions across your servers

### Environment Variables and Secrets

Some MCP servers require environment variables or API keys. There are several ways to handle these:

1. **Using the `env` command**:
   ```json
   {
     "mcpServers": {
       "api-server": {
         "command": "env",
         "args": [
           "API_KEY=your-secret-key",
           "npx",
           "-y",
           "@yourusername/mcp-api-server"
         ]
       }
     }
   }
   ```

2. **Using environment files**:
   ```json
   {
     "mcpServers": {
       "api-server": {
         "command": "bash",
         "args": ["-c", "source .env && npx -y @yourusername/mcp-api-server"]
       }
     }
   }
   ```

3. **Using shell environment**:
   ```json
   {
     "mcpServers": {
       "api-server": {
         "command": "$HOME/.nvm/versions/node/v16.14.0/bin/npx",
         "args": ["-y", "@yourusername/mcp-api-server"]
       }
     }
   }
   ```

Best practices for handling environment variables:
1. Never commit sensitive values to version control
2. Use environment files for local development
3. Document required environment variables
4. Consider using a secrets management solution for production

### Server Versioning and Updates

Managing MCP server versions effectively is crucial for stability and maintenance:

1. **Version Pinning**:
   ```json
   {
     "mcpServers": {
       "stable-server": {
         "command": "npx",
         "args": ["-y", "@yourusername/mcp-server@1.2.3"]
       }
     }
   }
   ```

2. **Using Latest Version**:
   ```json
   {
     "mcpServers": {
       "edge-server": {
         "command": "npx",
         "args": ["-y", "@yourusername/mcp-server@latest"]
       }
     }
   }
   ```

Best practices for versioning:
1. Pin versions in production environments
2. Test updates in development first
3. Maintain a changelog
4. Use semantic versioning
5. Document breaking changes

### TypeScript Support

To add TypeScript support to your MCP server:

1. **Install TypeScript dependencies**:
   ```bash
   npm install --save-dev typescript @types/node
   ```

2. **Create tsconfig.json**:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

3. **Update package.json**:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "start": "node dist/bin/server.js",
       "dev": "tsc -w"
     },
     "bin": {
       "mcp-your-server-name": "dist/bin/server.js"
     }
   }
   ```

4. **Example TypeScript Implementation**:
   ```typescript
   #!/usr/bin/env node
   import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
   import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
   import { z } from 'zod';

   interface ServerConfig {
     name: string;
     version: string;
   }

   async function runServer(config: ServerConfig) {
     const server = new McpServer({
       name: config.name,
       version: config.version
     });

     // Type-safe tool implementation
     server.tool('ping', {
       message: z.string().optional()
     }, async (params) => {
       return {
         content: [{
           type: 'text' as const,
           text: `Pong! ${params.message || ''}`
         }]
       };
     });

     const transport = new StdioServerTransport();
     server.connect(transport);
   }

   runServer({
     name: 'typescript-server',
     version: '1.0.0'
   }).catch(console.error);
   ```

Remember to:
1. Compile TypeScript before publishing
2. Include type definitions
3. Use strict type checking
4. Leverage TypeScript's type system for tool parameters

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