# Tulip MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to the Tulip API, enabling LLMs to interact
with the Tulip manufacturing platform functionality including tables, records, machines, stations, interfaces, users,
and more.

## Features

This MCP server provides **71 Tulip API tools** organized across multiple categories:

- **📱 Stations & Interfaces** (24 tools) - Station management, interface assignments, app configurations
- **👥 Users & Access Control** (9 tools) - User management, roles, groups, permissions
- **📊 Tables & Records** (28 tools) - Data tables, records, queries, aggregations, links
- **🏭 Machines** (4 tools) - Machine monitoring, attributes, activity archives
- **📱 Apps & Content** (5 tools) - App group management
- **🔧 Utilities** (1 tool) - URL signing and cloud storage

> 📚 **For detailed tool documentation, parameters, and examples, see [tools.md](tools.md)**

## Setup

### Prerequisites

- Node.js 18 or higher
- A Tulip instance with API access
- Tulip API credentials (API key and secret)

### Installation

1. Clone this repository:

```bash
git clone https://github.com/tulip-ecosystem/tulip-mcp
cd tulip-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `env.example`:

```bash
cp env.example .env
```

4. Edit the `.env` file with your Tulip API credentials:

```env
TULIP_API_KEY=your_tulip_api_key_here
TULIP_API_SECRET=your_tulip_api_secret_here
TULIP_BASE_URL=https://your-instance.tulip.co
TULIP_WORKSPACE_ID=your_workspace_id_here
MCP_SERVER_NAME=tulip-mcp
MCP_SERVER_VERSION=1.0.0
```

### Getting Tulip API Credentials

1. Log in to your Tulip instance
2. Navigate to Settings > API Tokens
3. Create a new API token with the appropriate scopes:
   - `apps:read` - for app group operations
   - `machines:read`, `machines:write` - for machine operations
   - `attributes:write` - for attribute reporting
   - `users:read`, `users:write` - for user operations
   - `stations:read`, `stations:write` - for stations/interfaces operations
   - `tables:read`, `tables:write` - for table operations
   - `urls:sign` - for URL signing

4. Copy the API key and secret to your `.env` file
5. Find your workspace ID in your Tulip instance URL (your-instance.tulip.co/w/your-workspace-id) and add it to `TULIP_WORKSPACE_ID`

⚠️ **Important**: The `TULIP_WORKSPACE_ID` is **required only for Account API keys**.

**API Key Types:**

- **Account API Keys**: Set `TULIP_WORKSPACE_ID` to your workspace ID - required for stations and interfaces APIs
- **Workspace API Keys**: Leave `TULIP_WORKSPACE_ID` empty or unset - workspace context is automatic

### Tool Selection Configuration

By default, the server enables only read-only tools for safety. You can customize which tools are available using the `ENABLED_TOOLS` environment variable.

The `ENABLED_TOOLS` variable accepts a comma-separated list that can include:

- **Individual tool names**: Specific tools like `listStations`
- **Categories**: Security-based groupings (`read-only`, `write`, `admin`)
- **Types**: Resource-based groupings (`table`, `machine`, `user`, `app`, `interface`, `station`, `station-group`, `utility`)

#### Examples

```env
# Enable specific tools only
ENABLED_TOOLS=listTables,getTable,listStations,listInterfaces

# Enable by security category
ENABLED_TOOLS=read-only,write

# Enable by resource type
ENABLED_TOOLS=table,station,interface

# Mixed approach (recommended)
ENABLED_TOOLS=read-only,interface,station,user

# Enable everything (use with caution)
ENABLED_TOOLS=read-only,write,admin
```

#### Available Categories

- **`read-only`**: Safe operations that only read data (30 tools)
- **`write`**: Operations that create or modify data (28 tools)
- **`admin`**: Dangerous operations like deletions and archiving (13 tools)

#### Available Types

- **`table`**: Table and record operations (28 tools)
- **`machine`**: Machine-related operations (4 tools)
- **`user`**: User management operations (9 tools)
- **`app`**: App group operations (5 tools)
- **`interface`**: Interface management operations (7 tools)
- **`station`**: Station management operations (9 tools)
- **`station-group`**: Station group management operations (9 tools)
- **`utility`**: Helper operations like URL signing (1 tool)

⚠️ **Security Note**: Admin tools can permanently delete data or archive resources. Only enable them if you understand the risks.

## Usage

### Running the Server

Start the MCP server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

### Using with MCP Clients

This server implements the Model Context Protocol and can be used with any MCP-compatible client. The server communicates over stdio.

#### Example MCP Client Configuration

For clients that support MCP server configuration, you can add this server like:

```json
{
  "mcpServers": {
    "tulip-mcp": {
      "command": "node",
      "args": ["C:/path/to/tulip-mcp/src/index.js"]
    }
  }
}
```

Or with environment variables inline:

```json
{
  "mcpServers": {
    "tulip-mcp": {
      "command": "node",
      "args": ["C:/path/to/tulip-mcp/src/index.js"],
      "env": {
        "TULIP_API_KEY": "your_api_key",
        "TULIP_API_SECRET": "your_api_secret",
        "TULIP_BASE_URL": "https://your-instance.tulip.co",
        "TULIP_WORKSPACE_ID": "your_workspace_id",
        "ENABLED_TOOLS": "read-only,write"
      }
    }
  }
}
```

## API Documentation

For detailed tool documentation including:

- Complete parameter lists and examples
- API endpoints and HTTP methods
- Required scopes and permissions
- Usage examples and return values
- Error handling and troubleshooting

**👉 See [tools.md](tools.md) for comprehensive API documentation**

## API Scopes Required

Your API token needs appropriate scopes for the tools you want to use:

### Basic Scopes

- **Read Operations**: `stations:read`, `users:read`, `tables:read`, `machines:read`, `apps:read`
- **Write Operations**: `stations:write`, `users:write`, `tables:write`, `machines:write`
- **Special Functions**: `attributes:write`, `urls:sign`

### Quick Start Scope

```
stations:read,users:read,tables:read,machines:read,apps:read,urls:sign
```

## Development

### Project Structure

- `src/index.js`: Complete MCP server implementation with all 61 tools
- `package.json`: Dependencies and scripts
- `env.example`: Environment variable template
- `tools.md`: Complete Tool API documentation

## Support

For detailed documentation, troubleshooting, and examples:

- **Tool Reference**: See [tools.md](tools.md). This file can be generated by running `npm run docs`.
- **Tulip Documentation**: Visit `https://support.tulip.co/api/apidocs`
