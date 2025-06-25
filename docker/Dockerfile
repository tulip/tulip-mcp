# Simplified Dockerfile for Tulip MCP Server
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install supergateway globally and create non-root user
RUN npm install -g supergateway && \
    groupadd -r mcp && useradd -r -g mcp mcp && \
    chown -R mcp:mcp /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src ./src
COPY README.md ./

# Copy the entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown mcp:mcp /entrypoint.sh

# Switch to non-root user
USER mcp

# Environment variables
ENV NODE_ENV=production \
    MCP_SERVER_NAME=tulip-mcp \
    MCP_SERVER_VERSION=1.1.2 \
    MCP_DEBUG=false \
    MCP_MODE=studio

# Labels for documentation
LABEL org.opencontainers.image.description="Tulip MCP Server - Model Context Protocol server for Tulip API"
LABEL org.opencontainers.image.documentation="https://github.com/tulip-ecosystem/tulip-mcp"
LABEL org.opencontainers.image.vendor="Tulip Ecosystem"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.version="1.1.2"

# Required environment variables (to be provided at runtime):
# TULIP_API_KEY - Your Tulip API key
# TULIP_API_SECRET - Your Tulip API secret
# TULIP_BASE_URL - Your Tulip instance base URL (e.g., https://company.tulip.co)

# Optional environment variables:
# TULIP_WORKSPACE_ID - Required for Account API keys, omit for Workspace API keys
# MCP_MAX_RETRIES - Maximum retry attempts for API calls (default: 3)
# MCP_BASE_DELAY - Base delay for retry backoff in ms (default: 1000)
# MCP_MAX_DELAY - Maximum delay for retry backoff in ms (default: 30000)
# ENABLED_TOOLS - Comma-separated list of tools/categories to enable (default: read-only)
# MCP_DEBUG - Enable debug logging (default: false)
# MCP_MODE - Server mode: studio or supergateway (default: studio)
# GATEWAY_PORT - Port for supergateway mode (default: 3000)
# AUTH_TOKEN - Bearer token for supergateway authentication (optional)
# CUSTOM_HEADERS - Custom headers for supergateway (semicolon-separated, optional)

# Expose port 3000 for supergateway mode
EXPOSE 3000

# Use the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
