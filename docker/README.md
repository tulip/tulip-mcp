# Tulip MCP Server Docker Configuration

This directory contains the Docker configuration for running the Tulip MCP Server in containerized environments.

## Changes Made

The Docker configuration has been simplified to accommodate the networking changes in the tulip-mcp server:

### Dockerfile Improvements
- **Simplified build process**: Reduced from 3-stage to single-stage build
- **Removed unnecessary complexity**: Eliminated TypeScript compilation stage since the project runs directly from source
- **Updated environment documentation**: Added clear documentation about API key types and configuration
- **Maintained security**: Continues to use non-root user (mcp) for container execution

### Entrypoint Script Enhancements
- **Better logging**: Added detailed configuration logging on startup
- **API key type detection**: Shows whether using Workspace or Account API key
- **Improved error handling**: Better validation and error messages

### Docker Compose Updates
- **Enhanced documentation**: Clear comments explaining API key types and configuration
- **Example .env configuration**: Comprehensive example showing all available options
- **Simplified environment variables**: Organized and documented all configuration options

## API Key Types

The tulip-mcp server supports two types of API keys, which affect how URLs are constructed:

### Workspace API Keys
- **Configuration**: Leave `TULIP_WORKSPACE_ID` empty or unset
- **URL Format**: `/api/v3/endpoint` (legacy) or `/api/stations/v1/endpoint` (next-gen)
- **Use case**: When your API key is scoped to a specific workspace

### Account API Keys
- **Configuration**: Set `TULIP_WORKSPACE_ID` to your workspace ID
- **URL Format**: `/api/v3/w/{workspaceId}/endpoint` (legacy) or `/api/stations/v1/w/{workspaceId}/endpoint` (next-gen)
- **Use case**: When your API key has access to multiple workspaces

## Usage

### Studio Mode (Traditional MCP Server)
```bash
# Using docker-compose
docker-compose up tulip-mcp-studio

# Using docker run
docker run -e TULIP_API_KEY=your_key \
           -e TULIP_API_SECRET=your_secret \
           -e TULIP_BASE_URL=https://company.tulip.co \
           -e MCP_MODE=studio \
           tulip-mcp:latest
```

### Supergateway Mode (Web/SSE Access)
```bash
# Using docker-compose
docker-compose up tulip-mcp-supergateway

# Using docker run
docker run -p 3000:3000 \
           -e TULIP_API_KEY=your_key \
           -e TULIP_API_SECRET=your_secret \
           -e TULIP_BASE_URL=https://company.tulip.co \
           -e MCP_MODE=supergateway \
           tulip-mcp:latest
```

## Environment Variables

### Required
- `TULIP_API_KEY`: Your Tulip API key
- `TULIP_API_SECRET`: Your Tulip API secret
- `TULIP_BASE_URL`: Your Tulip instance URL (e.g., https://company.tulip.co)

### Optional
- `TULIP_WORKSPACE_ID`: Workspace ID (required for Account API keys, omit for Workspace API keys)
- `ENABLED_TOOLS`: Comma-separated list of tools/categories (default: "read-only")
- `MCP_MODE`: Server mode - "studio" or "supergateway" (default: "studio")
- `GATEWAY_PORT`: Port for supergateway mode (default: 3000)
- `AUTH_TOKEN`: Bearer token for supergateway authentication
- `CUSTOM_HEADERS`: Custom headers for supergateway (semicolon-separated)
- `MCP_DEBUG`: Enable debug logging (default: false)
- `MCP_MAX_RETRIES`: Maximum API retry attempts (default: 3)
- `MCP_BASE_DELAY`: Base retry delay in ms (default: 1000)
- `MCP_MAX_DELAY`: Maximum retry delay in ms (default: 30000)

## Building

```bash
# Build the image
docker build -t tulip-mcp -f docker/Dockerfile .

# Or use docker-compose
docker-compose build
```

## Development

For development, you can mount the source code as a volume:

```yaml
volumes:
  - ./src:/app/src:ro
  - ./.env:/app/.env:ro
```

This allows you to make changes to the source code without rebuilding the container.
