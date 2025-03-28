# MCP Server Development Kit

This repository contains everything you need to start building Model Context Protocol (MCP) servers for Cursor. All documentation and reference materials are contained in the `docs` directory to keep your workspace clean.

## Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/mcp-server-dev-kit.git
   cd mcp-server-dev-kit
   ```

2. Create your new MCP server project in the root directory:
   ```bash
   # Initialize your new project
   npm init -y
   
   # Update package.json with required fields
   # (See docs/build-mcp-servers-guide.md for details)
   
   # Create your server implementation
   mkdir bin
   touch bin/server.cjs
   chmod +x bin/server.cjs
   ```

3. Read the [comprehensive guide](docs/build-mcp-servers-guide.md) to understand MCP server development.

4. Reference the [example implementation](docs/reference-implementation/) for best practices and patterns.

## Project Structure

```
.
├── README.md                 # This file
├── docs/                     # Documentation and reference materials
│   ├── build-mcp-servers-guide.md    # Comprehensive guide
│   ├── images/              # Guide images
│   └── reference-implementation/     # Working example server
│       ├── bin/            # Example server implementation
│       ├── package.json    # Example package configuration
│       └── ...            # Other reference files
├── bin/                     # Your server implementation
├── package.json             # Your project configuration
└── ...                     # Your other project files
```

## Documentation

- [Comprehensive Guide](docs/build-mcp-servers-guide.md) - Detailed instructions for creating MCP servers
- [Reference Implementation](docs/reference-implementation/) - Working example server with best practices

## Using the Reference Implementation

The reference implementation in `docs/reference-implementation/` provides a working example of an MCP server. To try it out:

```bash
cd docs/reference-implementation
npm install
npm start
```

Then configure it in Cursor's MCP settings as described in the guide.

## Creating Your Own Server

Start building your server in the root directory, keeping the docs folder as a reference. This separation ensures your workspace stays clean while maintaining easy access to documentation and examples.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this in your own projects. 